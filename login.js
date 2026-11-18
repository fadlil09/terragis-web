(() => {
  'use strict';

  const THEME_KEY = 'terragis-enterprise-theme';

  const htmlEl = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');
  const alreadyLoggedInBox = document.getElementById('alreadyLoggedInBox');
  const activeAvatar = document.getElementById('activeAvatar');
  const activeName = document.getElementById('activeName');
  const activeEmail = document.getElementById('activeEmail');
  const logoutAccountBtn = document.getElementById('logoutAccountBtn');

  const googleSignInArea = document.getElementById('googleSignInArea');
  const googleBtnContainer = document.getElementById('googleBtnContainer');
  const authStatusText = document.getElementById('authStatusText');
  const configRequiredBox = document.getElementById('configRequiredBox');
  const authError = document.getElementById('authError');

  // Theme Sync
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === 'light' || savedTheme === 'dark') {
    htmlEl.setAttribute('data-theme', savedTheme);
  }

  themeToggle.addEventListener('click', () => {
    const nextTheme = htmlEl.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    htmlEl.setAttribute('data-theme', nextTheme);
    localStorage.setItem(THEME_KEY, nextTheme);
  });

  function getInitials(name) {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function renderAvatar(containerEl, user) {
    containerEl.innerHTML = '';
    if (user.picture) {
      const img = document.createElement('img');
      img.src = user.picture;
      img.alt = user.name;
      img.referrerPolicy = 'no-referrer';
      img.className = 'user-avatar-img';
      img.onerror = () => {
        containerEl.textContent = getInitials(user.name);
      };
      containerEl.appendChild(img);
    } else {
      containerEl.textContent = getInitials(user.name);
    }
  }

  function redirectAfterLogin() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('redirect') === 'checkout') {
      window.location.href = 'index.html?openCheckout=1#pricing';
    } else {
      window.location.href = 'index.html#pricing';
    }
  }

  async function checkExistingSession() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.authenticated && data.user) {
        renderAvatar(activeAvatar, data.user);
        activeName.textContent = data.user.name;
        activeEmail.textContent = data.user.email;
        alreadyLoggedInBox.classList.remove('hidden');
      } else {
        alreadyLoggedInBox.classList.add('hidden');
      }
    } catch {
      // ignore network error
    }
  }

  logoutAccountBtn.addEventListener('click', async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
      if (window.google && window.google.accounts && window.google.accounts.id) {
        window.google.accounts.id.disableAutoSelect();
      }
      alreadyLoggedInBox.classList.add('hidden');
    } catch {
      authError.textContent = 'Gagal keluar dari sesi saat ini.';
    }
  });

  async function handleGoogleCredentialResponse(response) {
    authError.textContent = '';
    authStatusText.textContent = 'Memverifikasi akun Google Anda dengan server...';
    authStatusText.classList.remove('hidden');

    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ credential: response.credential })
      });

      const data = await res.json();
      if (!res.ok || !data.authenticated) {
        throw new Error(data.error || 'Verifikasi akun Google gagal.');
      }

      authStatusText.textContent = `Berhasil masuk sebagai ${data.user.name}. Mengalihkan...`;
      redirectAfterLogin();
    } catch (err) {
      authStatusText.classList.add('hidden');
      authError.textContent = err.message || 'Terjadi kesalahan saat memverifikasi akun Google.';
    }
  }

  function waitForGoogleSDK(timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.accounts && window.google.accounts.id) {
        return resolve(window.google.accounts.id);
      }
      const start = Date.now();
      const timer = setInterval(() => {
        if (window.google && window.google.accounts && window.google.accounts.id) {
          clearInterval(timer);
          resolve(window.google.accounts.id);
        } else if (Date.now() - start > timeoutMs) {
          clearInterval(timer);
          reject(new Error('Layanan Google Identity Services tidak dapat dimuat. Pastikan koneksi internet aktif.'));
        }
      }, 150);
    });
  }

  async function initGoogleSignIn() {
    try {
      const res = await fetch('/api/auth/config', { credentials: 'same-origin' });
      if (!res.ok) {
        throw new Error('Server autentikasi tidak dapat dijangkau. Jalankan website melalui server Node (node server.js).');
      }

      const config = await res.json();
      if (!config.configured || !config.googleClientId) {
        googleSignInArea.classList.add('hidden');
        configRequiredBox.classList.remove('hidden');
        return;
      }

      const googleId = await waitForGoogleSDK();
      googleId.initialize({
        client_id: config.googleClientId,
        callback: handleGoogleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true
      });

      googleBtnContainer.innerHTML = '';
      googleId.renderButton(googleBtnContainer, {
        type: 'standard',
        theme: htmlEl.getAttribute('data-theme') === 'dark' ? 'filled_black' : 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: 360,
        locale: 'id'
      });

      authStatusText.textContent = 'Klik tombol Google di atas untuk masuk menggunakan akun Google resmi Anda.';
    } catch (err) {
      authStatusText.classList.add('hidden');
      authError.textContent = err.message || 'Gagal menyiapkan tombol masuk Google.';
    }
  }

  checkExistingSession();
  initGoogleSignIn();
})();
