const http = require('http');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const CONFIG_PATH = path.join(ROOT, 'config.json');
const SESSION_COOKIE_NAME = 'terragis_session';
const SESSION_TTL_SEC = 60 * 60 * 24 * 7; // 7 days
const FALLBACK_SECRET = crypto.randomBytes(32).toString('hex');

const BLOCKED_FILES = new Set(['server.js', 'config.json', '.env', 'package.json', 'package-lock.json']);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
};

function loadConfig() {
  let fileConfig = {};
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      fileConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
  } catch (err) {
    console.error('Gagal membaca config.json:', err.message);
  }

  const googleClientId = (process.env.GOOGLE_CLIENT_ID || fileConfig.googleClientId || '').trim();
  const sessionSecret = (process.env.SESSION_SECRET || fileConfig.sessionSecret || FALLBACK_SECRET).trim();
  return { googleClientId, sessionSecret };
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders
  });
  res.end(body);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 64 * 1024) {
        reject(new Error('Payload terlalu besar'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Format JSON tidak valid'));
      }
    });
    req.on('error', reject);
  });
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
  return req.headers['x-forwarded-proto'] === 'https' || Boolean(req.socket && req.socket.encrypted);
}

const server = http.createServer(async (req, res) => {
  const cleanUrl = (req.url || '/').split('?')[0];
  const method = (req.method || 'GET').toUpperCase();
  const { googleClientId, sessionSecret } = loadConfig();

  // API: Return Google OAuth Client ID configuration
  if (cleanUrl === '/api/auth/config' && method === 'GET') {
    return sendJson(res, 200, {
      configured: Boolean(googleClientId),
      googleClientId
    });
  }

  // API: Verify real Google ID Token and create HttpOnly session
  if (cleanUrl === '/api/auth/google' && method === 'POST') {
    if (!googleClientId) {
      return sendJson(res, 503, {
        error: 'GOOGLE_CLIENT_ID belum dikonfigurasi pada server.'
      });
    }

    try {
      const body = await readJsonBody(req);
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
  }

  // API: Read current verified session
  if (cleanUrl === '/api/auth/me' && method === 'GET') {
    const cookies = parseCookies(req.headers.cookie);
    const user = verifySession(cookies[SESSION_COOKIE_NAME], sessionSecret);
    if (!user) {
      return sendJson(res, 200, { authenticated: false, user: null });
    }
    return sendJson(res, 200, { authenticated: true, user });
  }

  // API: Logout and clear session cookie
  if (cleanUrl === '/api/auth/logout' && method === 'POST') {
    const secureFlag = isSecureRequest(req) ? '; Secure' : '';
    const clearCookie = `${SESSION_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secureFlag}`;
    return sendJson(res, 200, { ok: true }, { 'Set-Cookie': clearCookie });
  }

  // Static file serving
  if (method !== 'GET' && method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Method Not Allowed');
  }

  let relativePath = cleanUrl === '/' ? 'index.html' : cleanUrl.replace(/^\/+/, '');
  if (relativePath === 'login') {
    relativePath = 'login.html';
  }

  if (BLOCKED_FILES.has(path.basename(relativePath).toLowerCase())) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Forbidden');
  }

  const filePath = path.resolve(ROOT, relativePath);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    });
    res.end(method === 'HEAD' ? undefined : content);
  });
});

server.listen(PORT, () => {
  const { googleClientId } = loadConfig();
  console.log(`TerraGIS server running at http://localhost:${PORT}`);
  if (googleClientId) {
    console.log('Google OAuth Client ID: TERKONFIGURASI (Real Google Sign-In aktif)');
  } else {
    console.log('Google OAuth Client ID: Belum diisi di config.json (isi googleClientId untuk mengaktifkan Real Google Sign-In)');
  }
});
