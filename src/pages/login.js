import { supabase } from '../supabase.js';
import { state, refreshProfile } from '../store.js';
import { escapeHtml, setPageTitle, toast } from '../ui.js';
import { navigate } from '../router.js';
import { SITE } from '../config.js';

function safeNext(query) {
  const raw = query.get('next') || '';
  if (!raw) return '/profile';
  let value = raw;
  try { value = decodeURIComponent(raw); } catch { /* keep raw */ }
  if (!value.startsWith('/') || value.startsWith('//')) return '/profile';
  return value;
}

export const login = {
  render({ app, query }) {
    setPageTitle('终端登录');
    const next = safeNext(query);
    app.innerHTML = `
      <section class="auth-wrap">
        <div class="auth-paper">
          <p class="page-kicker">TERMINAL LOGIN · BAMILEN</p>
          <h1>接入档案终端</h1>
          <p class="auth-sub">使用联合身份系统登记邮箱与密码登录。登录后，埃德里奥会按你的权限档案开放对应层级的档案。</p>
          ${state.session?.user ? `
            <div class="form-note mb-16">当前终端已登录为 <strong>${escapeHtml(state.profile?.display_name || state.session.user.email || '未知身份')}</strong>。如需切换账号，请先退出。</div>
          ` : ''}
          <form id="login-form" novalidate>
            <div class="field">
              <label for="login-email">登记邮箱</label>
              <input type="email" id="login-email" name="email" autocomplete="email" placeholder="name@example.com" required>
            </div>
            <div class="field mt-16">
              <label for="login-password">密码</label>
              <input type="password" id="login-password" name="password" autocomplete="current-password" placeholder="至少 8 位" required>
            </div>
            <div id="login-error"></div>
            <div class="form-actions">
              <button class="btn btn-primary" type="submit" id="login-submit">登录终端</button>
              <a class="btn" href="#/register">登记新账号</a>
            </div>
          </form>
          <p class="auth-switch">忘记密码？请联系档案管理员重置。普通访客可先<a href="#/archives">浏览公开目录</a>。</p>
          <div class="auth-demo">
            本终端与 <a href="${SITE.spaUrl}" target="_blank" rel="noopener">SPA 中央档案库</a> 共用 Supabase 身份系统。登录状态仅用于保存调阅记录与权限档案。测试账号由管理员发放，不在公开页面展示。
          </div>
        </div>
        <aside class="auth-aside">
          <div>
            <p class="page-kicker">BAMILEN / ACCESS</p>
            <h2>“灯标不是纪念。<br>它只报告设施还在运行。”</h2>
            <p class="auth-quote">——KOMOS-LAMP 技术说明，第 4 版</p>
          </div>
          <div>
            <p class="mono auth-note">SECURITY NOTICE</p>
            <p class="auth-small">所有登录、调阅与权限变更都会写入审计链。请勿在公共终端保存密码。</p>
            <p class="mono auth-code">B0 · B1 · B2 · B3 · B4 · B5</p>
          </div>
        </aside>
      </section>`;

    const form = app.querySelector('#login-form');
    const errorBox = app.querySelector('#login-error');
    const submit = app.querySelector('#login-submit');

    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      errorBox.innerHTML = '';
      const email = form.email.value.trim();
      const password = form.password.value;
      if (!email || !password) {
        errorBox.innerHTML = '<p class="form-error">请填写邮箱与密码。</p>';
        return;
      }
      submit.disabled = true;
      submit.textContent = '正在核验……';
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          errorBox.innerHTML = `<p class="form-error">${escapeHtml(error.message)}</p>`;
          return;
        }
        await refreshProfile();
        toast('身份核验通过。权限档案已接入。', 'success');
        navigate(next);
      } catch (error) {
        errorBox.innerHTML = `<p class="form-error">${escapeHtml(error.message || '登录失败')}</p>`;
      } finally {
        submit.disabled = false;
        submit.textContent = '登录终端';
      }
    });
  },
};
