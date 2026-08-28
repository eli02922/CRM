const router = require('express').Router();
const authenticate = require('../../middleware/authenticate');
const controller = require('./auth.controller');

router.post('/register', controller.registerValidators, controller.register);
router.post('/login', controller.loginValidators, controller.login);
router.post('/refresh', controller.refresh);
router.post('/logout', controller.logout);
router.get('/me', authenticate, controller.me);

module.exports = router;
