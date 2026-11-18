const {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SEC,
  getConfig,
  sendJson,
  signSession,
  verifyGoogleIdToken,
  isSecureRequest
} = require('../_auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  const { googleClientId, sessionSecret } = getConfig();
  if (!googleClientId) {
    return sendJson(res, 503, { error: 'GOOGLE_CLIENT_ID belum dikonfigurasi pada server.' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      body = JSON.parse(body || '{}');
    } else if (!body) {
      body = {};
    }

    const credential = typeof body.credential === 'string' ? body.credential.trim() : '';
    if (!credential) {
      return sendJson(res, 400, { error: 'Token kredensial Google tidak ditemukan.' });
    }

    const tokenInfo = await verifyGoogleIdToken(credential);

    if (tokenInfo.aud !== googleClientId) {
      return sendJson(res, 401, { error: 'Token Google tidak sesuai dengan Client ID aplikasi ini.' });
    }

    if (tokenInfo.email_verified !== 'true' && tokenInfo.email_verified !== true) {
      return sendJson(res, 401, { error: 'Alamat email Google Anda belum terverifikasi.' });
    }

    const exp = Number(tokenInfo.exp || 0);
    if (exp && exp < Math.floor(Date.now() / 1000)) {
      return sendJson(res, 401, { error: 'Sesi token Google sudah kedaluwarsa. Silakan coba lagi.' });
    }

    const user = {
      sub: tokenInfo.sub,
      name: tokenInfo.name || tokenInfo.email.split('@')[0],
      email: tokenInfo.email,
      picture: tokenInfo.picture || '',
      emailVerified: true,
      provider: 'Google'
    };

    const sessionValue = signSession(user, sessionSecret);
    const secureFlag = isSecureRequest(req) ? '; Secure' : '';
    const setCookie = `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionValue)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SEC}${secureFlag}`;

    return sendJson(res, 200, { authenticated: true, user }, { 'Set-Cookie': setCookie });
  } catch (err) {
    return sendJson(res, 401, { error: err.message || 'Autentikasi Google gagal diverifikasi.' });
  }
};

