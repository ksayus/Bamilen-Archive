import { supabase } from '../supabase.js';
import { state, isStaff } from '../store.js';
import {
  clearanceInfo, emptyState, escapeHtml, formatDate, setPageTitle,
} from '../ui.js';
import { SITE } from '../config.js';

export const profile = {
  async render({ app }) {
    setPageTitle('权限档案');
    if (!state.session?.user || !state.profile) {
      app.innerHTML = `
        <section class="page-head">
          <p class="page-kicker">IDENTITY REQUIRED</p>
          <h1 class="page-title">尚未接入终端</h1>
          <p class="page-desc">权限档案需要登录后查看。你可以先浏览公开目录，或使用联合身份系统登记。</p>
        </section>
        <div class="btn-row">
          <a class="btn btn-primary" href="#/login?next=%2Fprofile">登录终端</a>
          <a class="btn" href="#/register">登记新账号</a>
          <a class="btn" href="#/archives">浏览公开目录</a>
        </div>`;
      return;
    }

    const p = state.profile;
    const level = clearanceInfo(p.clearance);
    const staff = isStaff();

    const { data: history, error } = await supabase
      .from('bamilen_reading_history')
      .select('archive_id,last_read_at,read_count')
      .order('last_read_at', { ascending: false })
      .limit(12);
    if (error) console.warn('reading history load failed', error.message);

    const rows = (history || [])
      .map((row) => ({ row, item: state.catalogById.get(row.archive_id) }))
      .filter(({ item }) => Boolean(item));

    app.innerHTML = `
      <section class="page-head">
        <p class="page-kicker">IDENTITY FILE · ${escapeHtml(level.code)}</p>
        <h1 class="page-title">权限档案</h1>
        <p class="page-desc">本页显示联合身份系统中的公开字段与最近调阅记录。权限字段由风控委员会维护，不可自行修改。</p>
      </section>

      <div class="profile-grid">
        <article class="panel profile-card">
          <div class="profile-head">
            <div class="profile-avatar">${escapeHtml((p.display_name || '?').slice(0, 1))}</div>
            <div>
              <h2>${escapeHtml(p.display_name || '未命名档案员')}</h2>
              <p class="mono">${escapeHtml(p.email || state.session.user.email || '—')}</p>
            </div>
            <span class="clearance-badge ${level.cls}">${escapeHtml(level.code)} · ${escapeHtml(level.name)}</span>
          </div>
          <dl class="profile-kv">
            <div><dt>角色</dt><dd>${escapeHtml(p.role === 'admin' ? '系统管理员' : p.role === 'editor' ? '编目主管' : '档案员')}</dd></div>
            <div><dt>权限来源</dt><dd>${staff ? '风控委员会核定' : '联合身份档案'}</dd></div>
            <div><dt>账号状态</dt><dd>${p.status === 'active' ? '正常' : '已暂停'}</dd></div>
            <div><dt>登记时间</dt><dd>${formatDate(p.created_at, false)}</dd></div>
            <div><dt>最后活跃</dt><dd>${formatDate(p.last_seen_at, false)}</dd></div>
            <div><dt>身份系统</dt><dd>SPA / Bamilen 共用</dd></div>
          </dl>
          <div class="profile-actions">
            <a class="btn btn-sm" href="${SITE.spaUrl}" target="_blank" rel="noopener">在 SPA 查看同一身份 ↗</a>
            <a class="btn btn-sm" href="#/archives">继续调阅</a>
          </div>
        </article>

        <aside class="panel">
          <div class="panel-head"><h3>权限说明</h3></div>
          <p class="panel-copy">${escapeHtml(level.desc)}。B4 与 B5 不对普通登记账号开放；如需调阅，请联系风控委员会。</p>
          <div class="mini-status"><span>当前等级</span><b>${escapeHtml(level.code)}</b></div>
          <div class="mini-status"><span>可读公开层</span><b>是</b></div>
          <div class="mini-status"><span>可读封存层</span><b>${Number(p.clearance) >= 4 || staff ? '是' : '否'}</b></div>
          <div class="mini-status"><span>审计记录</span><b>已启用</b></div>
        </aside>
      </div>

      <section class="section">
        <div class="section-head">
          <div><p class="section-kicker">READING HISTORY</p><h2 class="section-title">最近调阅</h2></div>
          <a class="section-link" href="#/archives">全部档案 →</a>
        </div>
        ${rows.length ? `
          <div class="history-list">
            ${rows.map(({ row, item }) => `
              <a class="history-row" href="#/archive/${encodeURIComponent(item.slug)}">
                <span class="mono">${escapeHtml(item.archive_no)}</span>
                <strong>${escapeHtml(item.title)}</strong>
                <span>${formatDate(row.last_read_at)}</span>
                <span>${Number(row.read_count || 1)} 次</span>
              </a>`).join('')}
          </div>` : emptyState('还没有调阅记录', '打开任意一卷公开档案后，记录会出现在这里。', '<div class="mt-16"><a class="btn btn-primary" href="#/archives">浏览档案库</a></div>')}
      </section>
    `;
  },
};
