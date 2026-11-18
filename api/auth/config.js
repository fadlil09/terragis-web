const { getConfig, sendJson } = require('../_auth');

module.exports = (req, res) => {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }
  const { googleClientId } = getConfig();
  return sendJson(res, 200, {
    configured: Boolean(googleClientId),
    googleClientId
  });
};

