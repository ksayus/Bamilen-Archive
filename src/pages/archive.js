import { supabase } from '../supabase.js';
import { state, canRead } from '../store.js';
import {
  archiveCard, clearanceInfo, escapeHtml, formatDate,
  renderMarkdown, setPageTitle, toast,
} from '../ui.js';
import { SITE } from '../config.js';

function renderDenied(app, { title = '权限不足', message = '当前账号无权调阅此档案。' } = {}) {
  setPageTitle(title);
  app.innerHTML = `
    <section class="page-head denied-page">
      <p class="page-kicker">ACCESS DENIED</p>
      <h1 class="page-title">${escapeHtml(title)}</h1>
      <p class="page-desc">${escapeHtml(message)}</p>
    </section>
    <div class="btn-row"><a class="btn btn-primary" href="#/archives">返回档案库</a></div>
  `;
}

export const archive = {
  async render({ app, params, setCleanup }) {
    const slug = params[0];
    const catalogItem = state.catalogBySlug.get(slug);

    if (!catalogItem) {
      setPageTitle('档案不存在');
      app.innerHTML = `
        <section class="page-head">
          <p class="page-kicker">NOT FOUND · ${escapeHtml(slug || '')}</p>
          <h1 class="page-title">目录中没有这卷档案</h1>
          <p class="page-desc">可能是编号错误，也可能该条目不在公开目录中。</p>
        </section>
        <div class="btn-row"><a class="btn btn-primary" href="#/archives">返回档案库</a></div>`;
      return;
    }

    if (!canRead(catalogItem.clearance)) {
      renderDenied(app);
      return;
    }

    const { data: record, error } = await supabase
      .from('bamilen_archives')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    if (!record) {
      renderDenied(app, { title: '档案暂时无法调阅', message: '档案正文未能载入，请稍后再试。' });
      return;
    }

    const related = state.catalog
      .filter((item) => item.category_id === record.category_id && item.id !== record.id)
      .slice(0, 3);

    const meta = record.metadata || {};
    const metaRows = Object.entries(meta)
      .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
      .map(([key, value]) => `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(String(value))}</dd></div>`)
      .join('');

    const required = clearanceInfo(record.clearance);
    const category = state.categoryById.get(record.category_id);
    const spaRef = meta['SPA 关联'] || meta['关联档案'] || '';

    setPageTitle(record.title);
    app.innerHTML = `
      <div class="archive-page">
        <article class="doc-paper" id="doc-paper">
          <header class="doc-header">
            <p class="doc-kicker">${escapeHtml(record.archive_no)} · ${escapeHtml(category?.name || '未分类')} · ${escapeHtml(required.code)} / ${escapeHtml(required.name)}</p>
            <h1 class="doc-title">${escapeHtml(record.title)}</h1>
            ${record.subtitle ? `<p class="doc-sub">${escapeHtml(record.subtitle)}</p>` : ''}
            <div class="doc-stamp">${escapeHtml(required.code)}<br>${escapeHtml(required.name)}</div>
          </header>
          ${metaRows ? `<dl class="doc-meta">${metaRows}</dl>` : ''}
          <div class="prose">${renderMarkdown(record.content)}</div>
          <footer class="doc-footer">
            <span class="mono">BAMILEN ARCHIVE · ${escapeHtml(record.archive_no)}</span>
            <span class="mono">调阅记录已登记 · ${formatDate(record.updated_at)}</span>
          </footer>
        </article>

        <aside class="side-stack">
          <div class="side-card">
            <h3>DOCUMENT CONTROL</h3>
            <div class="side-kv"><span>档案编号</span><span>${escapeHtml(record.archive_no)}</span></div>
            <div class="side-kv"><span>密级</span><span>${escapeHtml(required.code)} · ${escapeHtml(required.name)}</span></div>
            <div class="side-kv"><span>分类</span><span>${escapeHtml(category?.name || '未分类')}</span></div>
            <div class="side-kv"><span>阅读时长</span><span>约 ${Number(record.read_minutes || 1)} 分钟</span></div>
            <div class="side-kv"><span>调阅次数</span><span id="doc-views">${Number(record.views || 0)}</span></div>
            <div class="side-kv"><span>最后编目</span><span>${formatDate(record.updated_at, false)}</span></div>
          </div>

          <div class="side-card">
            <h3>ACTIONS</h3>
            <div class="side-actions">
              <button class="btn btn-sm" id="copy-link">复制档案链接</button>
              <a class="btn btn-sm" href="#/archives?cat=${encodeURIComponent(category?.slug || '')}">返回同分类</a>
              ${spaRef ? `<a class="btn btn-sm" href="${SITE.spaUrl}" target="_blank" rel="noopener">在 SPA 查看关联档案 ↗</a>` : ''}
            </div>
          </div>

          <div class="side-card">
            <h3>ACCESS NOTE</h3>
            <p>${state.profile ? `当前身份：${escapeHtml(state.profile.display_name)} · ${escapeHtml(clearanceInfo(state.profile.clearance).code)} 级。` : '当前为访客身份，仅可调阅公开层。'}</p>
            <p>本卷已通过 Bamilen 风控校验。正文不会出现在公开目录接口中。</p>
            <a class="section-link" href="#/about">查看密级说明 →</a>
          </div>

          <div class="side-card">
            <h3>ARCHIVE NO.</h3>
            <p class="mono side-no">${escapeHtml(record.archive_no)}</p>
            <p class="side-tags">${escapeHtml((record.tags || []).join(' / '))}</p>
          </div>
        </aside>
      </div>

      ${related.length ? `
        <section class="section">
          <div class="section-head">
            <div><p class="section-kicker">RELATED RECORDS</p><h2 class="section-title">同分类档案</h2></div>
            <a class="section-link" href="#/archives?cat=${encodeURIComponent(category?.slug || '')}">查看分类 →</a>
          </div>
          <div class="related-grid">${related.map((item) => archiveCard(item, { locked: !canRead(item.clearance) })).join('')}</div>
        </section>` : ''}
    `;

    const progress = document.createElement('div');
    progress.className = 'reading-progress';
    document.body.appendChild(progress);
    const onScroll = () => {
      const paper = app.querySelector('#doc-paper');
      if (!paper) return;
      const rect = paper.getBoundingClientRect();
      const total = Math.max(1, rect.height - window.innerHeight * 0.55);
      const done = Math.min(1, Math.max(0, (-rect.top + 120) / total));
      progress.style.width = `${done * 100}%`;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const cleanup = () => {
      window.removeEventListener('scroll', onScroll);
      progress.remove();
    };
    setCleanup(cleanup);

    const bumpViewCount = () => {
      const views = app.querySelector('#doc-views');
      if (views) views.textContent = String(Number(views.textContent || 0) + 1);
    };
    if (state.session?.user) {
      supabase.rpc('bamilen_mark_read', { p_archive_id: record.id }).then(({ data, error: readError }) => {
        if (readError) console.warn('bamilen_mark_read failed', readError.message);
        else if (data?.ok) bumpViewCount();
      });
    } else {
      supabase.rpc('bamilen_record_view', { p_archive_id: record.id }).then(({ data, error: viewError }) => {
        if (viewError) console.warn('bamilen_record_view failed', viewError.message);
        else if (data?.ok) bumpViewCount();
      });
    }

    app.querySelector('#copy-link')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(location.href);
        toast('档案链接已复制。', 'success');
      } catch {
        toast('复制失败，请手动复制地址栏链接。', 'error');
      }
    });
  },
};
