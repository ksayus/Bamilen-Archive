import { state, canRead, isStaff } from '../store.js';
import {
  archiveCard, categoryTile, clearanceInfo, escapeHtml, formatCompactNumber,
  setPageTitle,
} from '../ui.js';
import { SITE } from '../config.js';

export const home = {
  render({ app }) {
    setPageTitle('');
    const catalog = state.catalog;
    const openCount = catalog.filter((item) => Number(item.clearance) === 0).length;
    const sealedCount = catalog.filter((item) => Number(item.clearance) >= 4).length;
    const systemCount = catalog.filter((item) => state.categoryById.get(item.category_id)?.slug === 'systems').length;
    const featured = catalog.filter((item) => item.featured).slice(0, 3);
    const latest = catalog.slice(0, 6);
    const profile = state.profile;
    const staff = isStaff();
    const level = profile?.clearance ?? -1;
    const levelInfo = level >= 0 ? clearanceInfo(level) : null;

    const categoryCounts = new Map();
    for (const item of catalog) {
      categoryCounts.set(item.category_id, (categoryCounts.get(item.category_id) || 0) + 1);
    }

    app.innerHTML = `
      <section class="hero">
        <div class="hero-copy">
          <div class="hero-kicker">BAMILEN / INTERNAL RECORD SYSTEM · 建城第 22 年</div>
          <h1 class="hero-title">Bamilen<br><span class="accent">档案库</span></h1>
          <p class="hero-sub">
            本档案库由埃德里奥（Etherial）维护，保存 Bamilen 的企业、研究、设施与风控记录。
            <strong>公开目录向访客与合作方开放；限制层与封存层按权限调阅。</strong>
            埃德里奥不是桑瑞思。两套系统共用身份，不共用记忆。
          </p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="#/archives">进入档案库</a>
            <a class="btn btn-ghost" href="#/archives?cat=systems">查看智能系统</a>
            <a class="btn btn-ghost" href="${SITE.spaUrl}" target="_blank" rel="noopener">SPA 档案库 ↗</a>
          </div>
          <div class="hero-foot">
            <span><i></i> 馆藏 ${formatCompactNumber(catalog.length)} 卷</span>
            <span><i></i> 公开层 ${formatCompactNumber(openCount)} 卷</span>
            <span><i></i> 封存层 ${formatCompactNumber(sealedCount)} 卷</span>
            <span><i></i> 智能系统 ${formatCompactNumber(systemCount)} 卷</span>
          </div>
        </div>

        <aside class="status-card" aria-label="档案库状态">
          <div class="status-head">
            <span>BAMILEN / ETHERIAL</span>
            <span class="live">● ONLINE</span>
          </div>
          <div class="status-grid">
            <div class="status-cell"><strong>${formatCompactNumber(catalog.length)}</strong><span>馆藏卷宗</span></div>
            <div class="status-cell"><strong>${formatCompactNumber(openCount)}</strong><span>公开调阅</span></div>
            <div class="status-cell"><strong>${formatCompactNumber(sealedCount)}</strong><span>封存 / 黑箱</span></div>
            <div class="status-cell"><strong>${formatCompactNumber(state.categories.length)}</strong><span>编目分类</span></div>
          </div>
          <div class="status-line"><span>终端身份</span><b>${profile ? escapeHtml(profile.display_name) : '访客 / GUEST'}</b></div>
          <div class="status-line"><span>当前权限</span><b>${profile ? `${levelInfo.code} · ${levelInfo.name}` : '未登记'}</b></div>
          <div class="status-line"><span>权限来源</span><b>${staff ? '风控委员会核定' : (level >= 0 ? '联合身份档案' : '—')}</b></div>
          <div class="status-line"><span>数据节点</span><b>勒勒弗斯 · 地下总部</b></div>
          <div class="status-line"><span>架构</span><b>SUNRISE-I / KOMOS LEGACY</b></div>
          <div class="status-line"><span>系统状态</span><b class="text-blue">风控正常</b></div>
          <div class="status-seal">${profile ? escapeHtml(levelInfo.code) : 'B'}</div>
        </aside>
      </section>

      <section class="section">
        <div class="section-head">
          <div><p class="section-kicker">FEATURED RECORDS</p><h2 class="section-title">本期推荐</h2></div>
          <a class="section-link" href="#/archives">浏览全部 ${catalog.length} 卷 →</a>
        </div>
        <div class="archive-grid">
          ${featured.map((item) => archiveCard(item, { locked: !canRead(item.clearance) })).join('')}
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <div><p class="section-kicker">CATEGORIES</p><h2 class="section-title">按分类检索</h2></div>
          <a class="section-link" href="#/about">编目基准 →</a>
        </div>
        <div class="category-grid">
          ${state.categories.map((category) => categoryTile(category, categoryCounts.get(category.id) || 0)).join('')}
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <div><p class="section-kicker">SYSTEM / ETHERIAL</p><h2 class="section-title">埃德里奥</h2></div>
          <a class="section-link" href="#/archives?cat=systems">全部系统档案 →</a>
        </div>
        <div class="panel split-panel">
          <div>
            <p class="section-kicker">SUNRISE-I · SECURITY & ARCHIVE</p>
            <h3 class="panel-title">Bamilen 自主研发的智能体，负责安全风控与档案管理。</h3>
            <p class="panel-copy">
              埃德里奥基于 Sunrise-I 架构。Sunrise-I 在第八代之前代号 Komos；更名后，部分内部模块仍保留 Komos 编号。
              它管理 Bamilen 的访问审计、数据隔离、D-17 风控与档案完整性，不接入公共网络，也不对外发言。
            </p>
            <div class="inline-tags">
              <span>项目代号 ETHERIAL</span>
              <span>架构 SUNRISE-I</span>
              <span>遗留层 KOMOS</span>
              <span>部署 勒勒弗斯</span>
            </div>
          </div>
          <div class="panel-aside">
            <div class="mini-status"><span>运行状态</span><b>在线</b></div>
            <div class="mini-status"><span>越权调用</span><b>0</b></div>
            <div class="mini-status"><span>待复核模块</span><b>KOMOS-LAMP</b></div>
            <div class="mini-status"><span>对外发言</span><b>不授权</b></div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <div><p class="section-kicker">LATEST INTAKE</p><h2 class="section-title">最近归档</h2></div>
          <a class="section-link" href="#/archives">按时间排序 →</a>
        </div>
        <div class="archive-grid">
          ${latest.map((item) => archiveCard(item, { locked: !canRead(item.clearance) })).join('')}
        </div>
      </section>

      <section class="section section-tight">
        <div class="panel split-panel joint-panel">
          <div>
            <p class="section-kicker">JOINT ARCHIVE / SPA</p>
            <h3 class="panel-title">另一套档案系统，同一组身份。</h3>
            <p class="panel-copy">
              Bamilen 档案库与 SPA 中央档案库共用 Supabase 身份系统。你在这里登记的账号，可以在 SPA 档案库登录；
              反之亦然。两站的权限档案相同，但档案内容、风控规则与智能体各自独立。
            </p>
          </div>
          <div class="panel-actions">
            <a class="btn btn-primary" href="${SITE.spaUrl}" target="_blank" rel="noopener">打开 SPA 档案库 ↗</a>
            <a class="btn" href="#/about">查看联合身份说明</a>
          </div>
        </div>
      </section>
    `;
  },
};
