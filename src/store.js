import { supabase } from './supabase.js';

export const state = {
  ready: false,
  loading: true,
  error: null,
  session: null,
  profile: null,
  categories: [],
  catalog: [],
  catalogById: new Map(),
  catalogBySlug: new Map(),
  categoryBySlug: new Map(),
  categoryById: new Map(),
};

const listeners = new Set();

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notify() {
  for (const listener of listeners) {
    try { listener(state); } catch (error) { console.error(error); }
  }
}

export function isStaff(profile = state.profile) {
  return profile?.role === 'admin' || profile?.role === 'editor';
}

export function isAdmin(profile = state.profile) {
  return profile?.role === 'admin';
}

export function canRead(clearance, profile = state.profile) {
  if (isStaff(profile)) return true;
  if (Number(clearance) === 0) return true;
  return Boolean(profile && profile.status === 'active' && Number(profile.clearance) >= Number(clearance));
}

export async function loadCategories() {
  const { data, error } = await supabase
    .from('bamilen_categories')
    .select('id,slug,code,name,description,sort_order')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  state.categories = data || [];
  state.categoryBySlug = new Map(state.categories.map((item) => [item.slug, item]));
  state.categoryById = new Map(state.categories.map((item) => [item.id, item]));
}

export async function loadCatalog() {
  const { data, error } = await supabase
    .from('bamilen_archive_catalog')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  state.catalog = data || [];
  state.catalogById = new Map(state.catalog.map((item) => [item.id, item]));
  state.catalogBySlug = new Map(state.catalog.map((item) => [item.slug, item]));
}

export async function refreshProfile() {
  const session = state.session;
  if (!session?.user) {
    state.profile = null;
    notify();
    return null;
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle();
  if (error) {
    console.error('profile load failed', error);
    state.error = error.message;
    state.profile = null;
  } else {
    state.profile = data;
  }
  notify();
  return state.profile;
}

export async function refreshCatalog() {
  await loadCatalog();
  notify();
}

export async function initStore() {
  state.loading = true;
  state.error = null;
  try {
    const { data } = await supabase.auth.getSession();
    state.session = data?.session || null;

    await Promise.all([loadCategories(), loadCatalog()]);

    if (state.session?.user) {
      await refreshProfile();
    }
    state.ready = true;
  } catch (error) {
    console.error(error);
    state.error = error?.message || '无法接入 Bamilen 档案库';
  } finally {
    state.loading = false;
    notify();
  }
}

supabase.auth.onAuthStateChange((event, session) => {
  state.session = session;
  if (event === 'SIGNED_OUT') {
    state.profile = null;
    notify();
    return;
  }
  if (session?.user) {
    setTimeout(() => { refreshProfile().catch(console.error); }, 0);
  }
});

export async function signOut() {
  await supabase.auth.signOut();
  state.profile = null;
  state.session = null;
  notify();
}
