const https = require('https');
const crypto = require('crypto');

const SESSION_COOKIE_NAME = 'terragis_session';
const SESSION_TTL_SEC = 60 * 60 * 24 * 7; // 7 days

function getConfig() {
  const googleClientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  const sessionSecret = (
    process.env.SESSION_SECRET ||
    crypto.createHash('sha256').update(googleClientId || 'terragis-default-secret').digest('hex')
  ).trim();
  return { googleClientId, sessionSecret };
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  Object.entries(extraHeaders).forEach(([k, v]) => res.setHeader(k, v));
  res.end(JSON.stringify(payload));
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    cookies[key] = decodeURIComponent(val);
  });
  return cookies;
}

function signSession(user, secret) {
  const payload = {
    user,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SEC
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifySession(token, secret) {
  if (!token || !token.includes('.')) return null;
  const [encoded, sig] = token.split('.');
  const expectedSig = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload.user || null;
  } catch {
    return null;
  }
}

function verifyGoogleIdToken(idToken) {
  return new Promise((resolve, reject) => {
    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
    const req = https.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode !== 200) {
            return reject(new Error(parsed.error_description || 'Token Google tidak valid'));
          }
          resolve(parsed);
        } catch {
          reject(new Error('Respons verifikasi Google tidak valid'));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Waktu verifikasi ke server Google habis'));
    });
    req.on('error', (err) => reject(err));
  });
}

function isSecureRequest(req) {
  return (
    req.headers['x-forwarded-proto'] === 'https' ||
    Boolean(req.socket && req.socket.encrypted) ||
    process.env.VERCEL === '1'
  );
}

module.exports = {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SEC,
  getConfig,
  sendJson,
  parseCookies,
  signSession,
  verifySession,
  verifyGoogleIdToken,
  isSecureRequest
};

