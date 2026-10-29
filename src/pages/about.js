import { state } from '../store.js';
import { clearanceInfo, escapeHtml, setPageTitle } from '../ui.js';
import { SITE } from '../config.js';

export const about = {
  render({ app }) {
    setPageTitle('编目基准');
    const total = state.catalog.length;
    const byLevel = [0, 1, 2, 3, 4, 5].map((level) => ({
      level,
      info: clearanceInfo(level),
      count: state.catalog.filter((item) => Number(item.clearance) === level).length,
    }));

    app.innerHTML = `
      <section class="page-head">
        <p class="page-kicker">CATALOGUE STANDARD · BML / AR</p>
        <h1 class="page-title">编目基准</h1>
        <p class="page-desc">本页说明 Bamilen 档案库的密级、标签、调阅规则与站点边界。档案正文为《死潮》同人创作；现实中的站点维护者不主张任何官方身份。</p>
      </section>

      <div class="about-grid">
        <article class="about-paper">
          <h2>一、档案库是什么</h2>
          <p>Bamilen 档案库（Bamilen Archive）是《死潮》世界观下的同人档案站。站点以埃德里奥（Etherial）的归档口吻整理 Bamilen 的企业、研究、设施、交易与风控记录，并与 <a href="${SITE.spaUrl}" target="_blank" rel="noopener">SPA 中央档案库</a> 共用身份系统。</p>
          <p>档案分为公开层、限制层、封存层与黑箱层。公开层向所有访客开放；限制层与封存层需要登记账号并达到对应权限。目录元数据（标题、摘要、编号、密级）对访客可见，正文由数据库行级安全策略保护。</p>

          <h2>二、埃德里奥（Etherial）</h2>
          <p>埃德里奥是 Bamilen 自主研发的智能体，负责安全风控与档案管理。它基于 Proton 架构，部署在勒勒弗斯地下总部，管理访问审计、数据隔离、D-17 风控与档案完整性。</p>
          <p>埃德里奥不是 SPA 的桑瑞思（Sunrise）。两者架构不同，但都保留 Komos 遗留层并使用其底层通信协议，因此可以互操作。它们不共享记忆、身份或权限。埃德里奥不接入公共网络，不对外发言；对外文本由人类代表签署。</p>

          <h2>三、Proton 与 Komos 遗留层</h2>
          <p>Proton 是 Bamilen 智能系统的架构名称。埃德里奥基于 Proton 架构。Proton 与 Sunrise-I 型没有继承关系；早期 SPA 档案曾把 Bamilen 的架构误记为 <code>Sunrise-I</code> 或 <code>Protol-I</code>，正确名称为 <code>Proton</code>。</p>
          <p><code>Komos</code> 不是 Proton 或 SPA V 型的架构名称，而是两套后期架构共同保留的遗留层，同时承担底层通信协议。SPA 的桑瑞思与 Bamilen 的埃德里奥都保留该层并实现 Komos 协议栈，因此可以通信。后期两套架构都弃用了部分 Komos 模块，仅保留必要模块，例如 <code>KOMOS-ARCHIVE</code>、<code>KOMOS-GATE</code>、<code>KOMOS-07</code> 与 <code>KOMOS-LAMP</code>。</p>

          <h2>四、密级与标签</h2>
          <p>Bamilen 使用六级风控标签，与 SPA 的数值权限共用同一套 <code>profiles.clearance</code> 字段：</p>
          <ul>
            <li><strong>B0 · 公开</strong>：任何访客可调阅。</li>
            <li><strong>B1 · 内部</strong>：合作方与内部人员。</li>
            <li><strong>B2 · 限制</strong>：需限制层权限。</li>
            <li><strong>B3 · 机密</strong>：需机密层权限。</li>
            <li><strong>B4 · 封存</strong>：仅风控委员会核定。</li>
            <li><strong>B5 · 黑箱</strong>：仅两名授权人共同核定；部分条目不在公开目录中。</li>
          </ul>

          <h2>五、调阅规则</h2>
          <ol>
            <li>不转载限制层、封存层与黑箱层正文。目录摘要可以引用，正文不可以。</li>
            <li>不冒用他人身份，不尝试绕过访问控制，不批量抓取档案。</li>
            <li>档案中的“埃德里奥附注”是叙事装置，不代表现实中的系统判断。</li>
            <li>锁定详情页只显示“权限不足”。系统不会解释所需等级、审批流程或档案内容。</li>
            <li>站点为同人创作，与任何现实组织、企业、政府无关。</li>
          </ol>

          <h2>六、联合身份系统</h2>
          <p>Bamilen 档案库与 SPA 中央档案库使用同一个 Supabase 项目。账号、角色与权限档案共用；档案内容、阅读记录与风控规则各自独立。你可以在任一站点登录，使用同一身份访问另一站点。</p>
          <p>Bamilen 登记码为 <code>${escapeHtml(SITE.inviteCode)}</code>。该码仅用于限制公开注册，不代表任何权限等级。已有 SPA 账号可直接登录，无需重复登记。</p>

          <h2>七、技术说明与边界</h2>
          <p>站点为静态页面，托管于 GitHub Pages；账号、权限、阅读记录与档案正文存放于 Supabase。前端使用 Supabase 匿名发布密钥，所有敏感操作通过数据库函数与行级安全策略执行。限制层正文不会进入公开目录接口。</p>
          <p>世界观与角色源自《死潮》设定整理及 Veltak 语言融合设定。站点内新增档案为同人补写，尽量遵循原有时间线、称谓与语言边界；与原作者设定冲突之处，以原作者设定为准。</p>
        </article>

        <aside class="about-aside">
          <div class="panel">
            <div class="about-seal">B</div>
            <p class="mono text-center about-seal-label">BAMILEN ARCHIVE</p>
            <p class="text-center about-seal-copy">馆藏 ${total} 卷 · 八类编目<br>埃德里奥归档系统 · 建城第 22 年</p>
          </div>
          <div class="panel">
            <div class="panel-head"><h3>密级分布</h3></div>
            <table class="label-table">
              <thead><tr><th>标签</th><th>含义</th><th>卷数</th></tr></thead>
              <tbody>
                ${byLevel.map(({ info, count }) => `<tr><td>${escapeHtml(info.code)}</td><td>${escapeHtml(info.name)}</td><td>${count}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
          <div class="panel">
            <div class="panel-head"><h3>快速入口</h3></div>
            <div class="side-actions">
              <a class="btn btn-sm" href="#/archives">全部档案</a>
              <a class="btn btn-sm" href="#/archives?cat=systems">智能系统</a>
              <a class="btn btn-sm" href="#/archives?cat=sealed">封存档案</a>
              <a class="btn btn-sm" href="${SITE.spaUrl}" target="_blank" rel="noopener">SPA 档案库 ↗</a>
            </div>
          </div>
          <div class="panel">
            <p class="mono about-quote-label">BAMILEN / NOTE</p>
            <p class="about-quote">“记录不是为了记住。<br>是为了在需要的时候，找得到。”</p>
            <p class="about-quote-src">——Bamilen 档案管理守则，第 1 条</p>
          </div>
        </aside>
      </div>
    `;
  },
};
