const { SESSION_COOKIE_NAME, sendJson, isSecureRequest } = require('../_auth');

module.exports = (req, res) => {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  const secureFlag = isSecureRequest(req) ? '; Secure' : '';
  const clearCookie = `${SESSION_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secureFlag}`;
  return sendJson(res, 200, { ok: true }, { 'Set-Cookie': clearCookie });
};

