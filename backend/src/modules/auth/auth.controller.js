const { body, validationResult } = require('express-validator');
const asyncHandler = require('../../middleware/asyncHandler');
const HttpError = require('../../utils/HttpError');
const authService = require('./auth.service');

function checkValidation(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new HttpError(400, 'Validation failed', errors.array());
  }
}

const registerValidators = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

const loginValidators = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const register = asyncHandler(async (req, res) => {
  checkValidation(req);
  const user = await authService.register(req.body);
  res.status(201).json({ user });
});

const login = asyncHandler(async (req, res) => {
  checkValidation(req);
  const result = await authService.login(req.body);
  res.json(result);
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new HttpError(400, 'refreshToken is required');
  const result = await authService.refresh(refreshToken);
  res.json(result);
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.body.refreshToken);
  res.status(204).send();
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.getProfile(req.user.id);
  res.json({ user });
});

module.exports = { register, login, refresh, logout, me, registerValidators, loginValidators };
