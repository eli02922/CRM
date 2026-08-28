const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Verifies the Bearer access token and attaches { id, role, email } to req.user.
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  try {
    const payload = jwt.verify(token, env.jwt.accessSecret);
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired access token' });
  }
}

module.exports = authenticate;
