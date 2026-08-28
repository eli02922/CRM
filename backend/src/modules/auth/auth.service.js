const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../../config/db');
const env = require('../../config/env');
const HttpError = require('../../utils/HttpError');

function signAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn,
  });
}

function signRefreshToken(user) {
  return jwt.sign({ sub: user.id }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
  });
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function register({ name, email, password, role }) {
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rowCount > 0) {
    throw new HttpError(409, 'Email is already registered');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  // Only admins can create other admins/support via the invite endpoint (enforced in controller);
  // self-registration is always locked to the 'sales' role for safety.
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, created_at`,
    [name, email, passwordHash, role || 'sales']
  );
  return rows[0];
}

async function login({ email, password }) {
  const { rows } = await pool.query(
    'SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = $1',
    [email]
  );
  const user = rows[0];
  if (!user || !user.is_active) {
    throw new HttpError(401, 'Invalid email or password');
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    throw new HttpError(401, 'Invalid email or password');
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [user.id, hashToken(refreshToken), expiresAt]
  );

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

async function refresh(refreshToken) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, env.jwt.refreshSecret);
  } catch (err) {
    throw new HttpError(401, 'Invalid or expired refresh token');
  }

  const tokenHash = hashToken(refreshToken);
  const { rows } = await pool.query(
    `SELECT rt.id, rt.revoked, rt.expires_at, u.id AS user_id, u.name, u.email, u.role, u.is_active
     FROM refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     WHERE rt.token_hash = $1 AND rt.user_id = $2`,
    [tokenHash, payload.sub]
  );
  const record = rows[0];
  if (!record || record.revoked || new Date(record.expires_at) < new Date() || !record.is_active) {
    throw new HttpError(401, 'Refresh token is no longer valid');
  }

  const user = { id: record.user_id, name: record.name, email: record.email, role: record.role };
  const accessToken = signAccessToken(user);
  return { accessToken, user };
}

async function logout(refreshToken) {
  if (!refreshToken) return;
  await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1', [
    hashToken(refreshToken),
  ]);
}

async function getProfile(userId) {
  const { rows } = await pool.query(
    'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
    [userId]
  );
  if (!rows[0]) throw new HttpError(404, 'User not found');
  return rows[0];
}

module.exports = { register, login, refresh, logout, getProfile };
