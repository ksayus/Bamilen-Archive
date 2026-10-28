import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';
import { bamilenArchives } from '../content/bamilen.js';

const root = path.resolve(process.cwd());
const envPath = path.join(root, '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const clearanceLabels = {
  0: 'B0（公开）',
  1: 'B1（内部）',
  2: 'B2（限制）',
  3: 'B3（机密）',
  4: 'B4（封存）',
  5: 'B5（黑箱）',
};

const clearanceNames = {
  0: '公开',
  1: '内部',
  2: '限制',
  3: '机密',
  4: '封存',
  5: '黑箱',
};

const all = bamilenArchives;

const seenNo = new Set();
const seenSlug = new Set();
for (const item of all) {
  if (seenNo.has(item.no)) throw new Error(`duplicate archive number: ${item.no}`);
  if (seenSlug.has(item.slug)) throw new Error(`duplicate slug: ${item.slug}`);
  seenNo.add(item.no);
  seenSlug.add(item.slug);
}

const client = new Client({
  host: process.env.SUPABASE_DB_HOST,
  port: Number(process.env.SUPABASE_DB_PORT || 5432),
  user: process.env.SUPABASE_DB_USER,
  password: process.env.SUPABASE_DB_PASSWORD,
  database: process.env.SUPABASE_DB_NAME || 'postgres',
  ssl: { rejectUnauthorized: false },
});

await client.connect();
const categoryRows = await client.query('select id, slug from public.bamilen_categories');
const categoryMap = new Map(categoryRows.rows.map((row) => [row.slug, row.id]));

const missing = [...new Set(all.map((item) => item.category))].filter((slug) => !categoryMap.has(slug));
if (missing.length) throw new Error(`missing categories: ${missing.join(', ')}`);

const admin = await client.query("select id from public.profiles where role = 'admin' order by created_at limit 1");
const adminId = admin.rows[0]?.id || null;

let inserted = 0;
let updated = 0;

await client.query('begin');
try {
  for (const item of all) {
    const metadata = {
      ...(item.meta || {}),
      档案编号: item.no,
      归档标签: clearanceLabels[item.clearance],
      密级: `${item.clearance}（${clearanceNames[item.clearance]}）`,
      归档者: item.meta?.['归档者'] || '埃德里奥（Etherial）',
    };

    const existed = await client.query('select 1 from public.bamilen_archives where archive_no = $1', [item.no]);
    await client.query(
      `insert into public.bamilen_archives
        (archive_no, slug, title, subtitle, summary, content, category_id, clearance, tags, metadata, cover_url, featured, published, created_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       on conflict (archive_no) do update set
         slug = excluded.slug,
         title = excluded.title,
         subtitle = excluded.subtitle,
         summary = excluded.summary,
         content = excluded.content,
         category_id = excluded.category_id,
         clearance = excluded.clearance,
         tags = excluded.tags,
         metadata = excluded.metadata,
         cover_url = excluded.cover_url,
         featured = excluded.featured,
         published = excluded.published`,
      [
        item.no,
        item.slug,
        item.title,
        item.subtitle || null,
        item.summary || null,
        item.content,
        categoryMap.get(item.category),
        item.clearance,
        item.tags || [],
        metadata,
        item.cover_url || null,
        Boolean(item.featured),
        item.published !== false,
        adminId,
      ]
    );
    if (existed.rowCount) updated += 1;
    else inserted += 1;
  }
  await client.query('commit');
} catch (error) {
  await client.query('rollback');
  await client.end();
  throw error;
}

const stats = await client.query(
  `select c.slug, count(*)::int as n,
          count(*) filter (where a.clearance >= 4)::int as sealed
     from public.bamilen_archives a join public.bamilen_categories c on c.id = a.category_id
    group by c.slug order by c.slug`
);
const total = await client.query('select count(*)::int as n from public.bamilen_archives');
const byClearance = await client.query('select clearance, count(*)::int as n from public.bamilen_archives group by clearance order by clearance');

console.log(`Bamilen archives seeded: ${inserted} inserted, ${updated} updated, ${total.rows[0].n} total`);
console.table(stats.rows);
console.table(byClearance.rows);

await client.end();
