const { SESSION_COOKIE_NAME, getConfig, sendJson, parseCookies, verifySession } = require('../_auth');

module.exports = (req, res) => {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  const { sessionSecret } = getConfig();
  const cookies = parseCookies(req.headers.cookie);
  const user = verifySession(cookies[SESSION_COOKIE_NAME], sessionSecret);

  if (!user) {
    return sendJson(res, 200, { authenticated: false, user: null });
  }
  return sendJson(res, 200, { authenticated: true, user });
};

