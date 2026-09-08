const router = require('express').Router();
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const controller = require('./hubspot.controller');

router.use(authenticate);
router.use(authorize('admin'));

router.post('/contacts/sync', controller.syncContacts);
router.post('/deals/sync', controller.syncDeals);
router.get('/logs', controller.listLogs);

module.exports = router;
