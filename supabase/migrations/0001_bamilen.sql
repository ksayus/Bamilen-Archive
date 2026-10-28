-- ============================================================
-- BAMILEN ARCHIVE · Supabase schema
-- Shares auth/profiles and clearance helpers with the SPA project.
-- Run with: node scripts/db-push.mjs supabase/migrations/0001_bamilen.sql
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- The SPA schema provides these helpers. Recreate set_updated_at defensively
-- so this migration also works when applied after the SPA migration.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'can_read_archive'
  ) then
    raise exception 'SPA clearance helpers are missing: apply SPA-Archive supabase/migrations/0001_init.sql first';
  end if;
end;
$$;

-- ---------- categories ----------
create table if not exists public.bamilen_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  code text not null,
  name text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- archives ----------
create table if not exists public.bamilen_archives (
  id uuid primary key default gen_random_uuid(),
  archive_no text not null unique,
  slug text not null unique,
  title text not null,
  subtitle text,
  summary text,
  content text not null,
  category_id uuid references public.bamilen_categories(id) on delete set null,
  clearance integer not null default 0 check (clearance between 0 and 5),
  tags text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  cover_url text,
  featured boolean not null default false,
  published boolean not null default true,
  read_minutes integer not null default 3,
  views integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bamilen_archives_category_idx on public.bamilen_archives(category_id);
create index if not exists bamilen_archives_clearance_idx on public.bamilen_archives(clearance);
create index if not exists bamilen_archives_published_idx on public.bamilen_archives(published);
create index if not exists bamilen_archives_featured_idx on public.bamilen_archives(featured) where featured = true;
create index if not exists bamilen_archives_created_at_idx on public.bamilen_archives(created_at desc);
create index if not exists bamilen_archives_tags_idx on public.bamilen_archives using gin(tags);

drop trigger if exists bamilen_archives_updated_at on public.bamilen_archives;
create trigger bamilen_archives_updated_at before update on public.bamilen_archives
for each row execute function public.set_updated_at();

create or replace function public.prepare_bamilen_archive()
returns trigger
language plpgsql
as $$
begin
  new.read_minutes = greatest(1, ceil(coalesce(length(new.content), 0) / 500.0)::integer);
  if new.created_by is null then
    new.created_by = auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists bamilen_archives_prepare on public.bamilen_archives;
create trigger bamilen_archives_prepare before insert or update on public.bamilen_archives
for each row execute function public.prepare_bamilen_archive();

-- Public catalog: metadata only. Content remains protected by RLS.
create or replace view public.bamilen_archive_catalog as
select
  id, archive_no, slug, title, subtitle, summary,
  category_id, clearance, tags, cover_url, featured, published,
  read_minutes, views, created_at, updated_at
from public.bamilen_archives
where published = true;

-- ---------- reading history ----------
create table if not exists public.bamilen_reading_history (
  user_id uuid not null references auth.users(id) on delete cascade,
  archive_id uuid not null references public.bamilen_archives(id) on delete cascade,
  first_read_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  read_count integer not null default 1,
  primary key (user_id, archive_id)
);

create index if not exists bamilen_reading_user_idx on public.bamilen_reading_history(user_id, last_read_at desc);
create index if not exists bamilen_reading_archive_idx on public.bamilen_reading_history(archive_id);

-- ============================================================
-- functions
-- ============================================================
create or replace function public.bamilen_record_view(p_archive_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare v_clearance integer;
begin
  select clearance into v_clearance from public.bamilen_archives
  where id = p_archive_id and published = true;
  if v_clearance is null then
    return jsonb_build_object('ok', false, 'error', '档案不存在');
  end if;
  if not public.can_read_archive(v_clearance) then
    return jsonb_build_object('ok', false, 'error', '权限不足');
  end if;
  update public.bamilen_archives set views = views + 1 where id = p_archive_id;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.bamilen_mark_read(p_archive_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_clearance integer;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', '未登录');
  end if;
  if not exists (select 1 from public.profiles where id = v_uid and status = 'active') then
    return jsonb_build_object('ok', false, 'error', '账号不可用');
  end if;
  select clearance into v_clearance from public.bamilen_archives
  where id = p_archive_id and published = true;
  if v_clearance is null then
    return jsonb_build_object('ok', false, 'error', '档案不存在');
  end if;
  if not public.can_read_archive(v_clearance) then
    return jsonb_build_object('ok', false, 'error', '权限不足');
  end if;

  insert into public.bamilen_reading_history(user_id, archive_id)
  values (v_uid, p_archive_id)
  on conflict (user_id, archive_id) do update
    set last_read_at = now(),
        read_count = public.bamilen_reading_history.read_count + 1;

  update public.bamilen_archives set views = views + 1 where id = p_archive_id;
  update public.profiles set last_seen_at = now() where id = v_uid;

  return jsonb_build_object('ok', true);
end;
$$;

-- Bamilen-branded registration wrapper. Accounts live in the same auth.users
-- and profiles tables as the SPA archive.
create or replace function public.bamilen_register_account(
  p_email text,
  p_password text,
  p_display_name text,
  p_invite text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  if p_invite is distinct from 'BML-ENLIST-2026' then
    return jsonb_build_object('ok', false, 'error', 'Bamilen 登记码无效');
  end if;
  return public.register_account(p_email, p_password, p_display_name, 'SPA-ENLIST-2026');
end;
$$;

revoke all on function public.bamilen_register_account(text, text, text, text) from public, anon, authenticated;
grant execute on function public.bamilen_register_account(text, text, text, text) to anon, authenticated;

-- ============================================================
-- RLS
-- ============================================================
alter table public.bamilen_categories enable row level security;
alter table public.bamilen_archives enable row level security;
alter table public.bamilen_reading_history enable row level security;

drop policy if exists bamilen_categories_select_all on public.bamilen_categories;
create policy bamilen_categories_select_all on public.bamilen_categories for select using (true);

drop policy if exists bamilen_categories_write_editor on public.bamilen_categories;
create policy bamilen_categories_write_editor on public.bamilen_categories for all
using (public.is_editor()) with check (public.is_editor());

drop policy if exists bamilen_archives_select_allowed on public.bamilen_archives;
create policy bamilen_archives_select_allowed on public.bamilen_archives for select
using (published = true and public.can_read_archive(clearance));

drop policy if exists bamilen_archives_select_editor on public.bamilen_archives;
create policy bamilen_archives_select_editor on public.bamilen_archives for select
using (public.is_editor());

drop policy if exists bamilen_archives_write_editor on public.bamilen_archives;
create policy bamilen_archives_write_editor on public.bamilen_archives for all
using (public.is_editor()) with check (public.is_editor());

drop policy if exists bamilen_reading_select_own on public.bamilen_reading_history;
create policy bamilen_reading_select_own on public.bamilen_reading_history for select
using (user_id = auth.uid());

drop policy if exists bamilen_reading_select_admin on public.bamilen_reading_history;
create policy bamilen_reading_select_admin on public.bamilen_reading_history for select
using (public.is_admin());

-- ============================================================
-- grants
-- ============================================================
grant usage on schema public to anon, authenticated;

grant select on public.bamilen_archive_catalog to anon, authenticated;
grant select on public.bamilen_categories to anon, authenticated;
grant select, insert, update, delete on public.bamilen_archives to authenticated;
grant select, insert, update, delete on public.bamilen_categories to authenticated;
grant select on public.bamilen_reading_history to authenticated;

grant execute on function public.bamilen_record_view(uuid) to anon, authenticated;
grant execute on function public.bamilen_mark_read(uuid) to authenticated;
