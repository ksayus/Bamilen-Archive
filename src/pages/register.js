import { supabase } from '../supabase.js';
import { refreshProfile } from '../store.js';
import { SITE } from '../config.js';
import { escapeHtml, setPageTitle, toast } from '../ui.js';
import { navigate } from '../router.js';

export const register = {
  render({ app, query }) {
    setPageTitle('登记调阅资格');
    const next = query.get('next') || '/profile';
    app.innerHTML = `
      <section class="auth-wrap">
        <div class="auth-paper">
          <p class="page-kicker">ENLISTMENT · JOINT IDENTITY</p>
          <h1>登记调阅资格</h1>
          <p class="auth-sub">新档案员从 B0（公开）开始。B1—B3 由联合身份档案与风控委员会核定；B4 与 B5 仅由 Bamilen 风控委员会授权。</p>
          <form id="register-form" novalidate>
            <div class="field">
              <label for="reg-name">显示名称</label>
              <input type="text" id="reg-name" name="displayName" maxlength="40" placeholder="你在档案库中使用的名字" required>
            </div>
            <div class="field mt-16">
              <label for="reg-email">登记邮箱</label>
              <input type="email" id="reg-email" name="email" autocomplete="email" placeholder="name@example.com" required>
            </div>
            <div class="field mt-16">
              <label for="reg-password">密码</label>
              <input type="password" id="reg-password" name="password" autocomplete="new-password" placeholder="至少 8 位" minlength="8" required>
            </div>
            <div class="field mt-16">
              <label for="reg-invite">Bamilen 登记码</label>
              <input type="text" id="reg-invite" name="invite" placeholder="${escapeHtml(SITE.inviteCode)}" required>
              <span class="hint">本期开放登记码：<code>${escapeHtml(SITE.inviteCode)}</code>。登记后使用与 SPA 档案库相同的身份系统；登记码不代表任何权限等级。</span>
            </div>
            <div id="register-error"></div>
            <div class="form-actions">
              <button class="btn btn-primary" type="submit" id="register-submit">提交登记</button>
              <a class="btn" href="#/login">已有账号登录</a>
            </div>
          </form>
          <p class="auth-switch">登记即表示你同意遵守联合档案调阅规则：不转载限制层与封存层正文，不冒用他人身份，不尝试绕过访问控制。</p>
        </div>
        <aside class="auth-aside">
          <div>
            <p class="page-kicker">BAMILEN / OATH</p>
            <h2>“记录不是为了记住。<br>是为了在需要的时候，找得到。”</h2>
            <p class="auth-quote">——Bamilen 档案管理守则，第 1 条</p>
          </div>
          <div>
            <p class="mono auth-note">CLEARANCE PATH</p>
            <p class="auth-small">B0 公开 → B1 内部 → B2 限制 → B3 机密。B4 封存与 B5 黑箱仅由风控委员会核定。阅读、纠错与联合档案贡献可计入权限评估。</p>
            <p class="mono auth-code">THE ARCHIVE REMEMBERS</p>
          </div>
        </aside>
      </section>`;

    const form = app.querySelector('#register-form');
    const errorBox = app.querySelector('#register-error');
    const submit = app.querySelector('#register-submit');

    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      errorBox.innerHTML = '';
      const displayName = form.displayName.value.trim();
      const email = form.email.value.trim();
      const password = form.password.value;
      const invite = form.invite.value.trim();

      if (!displayName || !email || !password || !invite) {
        errorBox.innerHTML = '<p class="form-error">请填写全部字段。</p>';
        return;
      }
      if (password.length < 8) {
        errorBox.innerHTML = '<p class="form-error">密码至少需要 8 位。</p>';
        return;
      }

      submit.disabled = true;
      submit.textContent = '正在登记……';
      try {
        const { data, error } = await supabase.rpc('bamilen_register_account', {
          p_email: email,
          p_password: password,
          p_display_name: displayName,
          p_invite: invite,
        });
        if (error) {
          errorBox.innerHTML = `<p class="form-error">${escapeHtml(error.message)}</p>`;
          return;
        }
        if (!data?.ok) {
          errorBox.innerHTML = `<p class="form-error">${escapeHtml(data?.error || '登记失败')}</p>`;
          return;
        }

        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) {
          toast('登记成功，但自动登录失败。请手动登录。', 'info');
          navigate('/login');
          return;
        }
        await refreshProfile();
        toast('登记完成。你的联合权限档案已建立。', 'success');
        navigate(next.startsWith('/') ? next : '/profile');
      } catch (error) {
        errorBox.innerHTML = `<p class="form-error">${escapeHtml(error.message || '登记失败')}</p>`;
      } finally {
        submit.disabled = false;
        submit.textContent = '提交登记';
      }
    });
  },
};
