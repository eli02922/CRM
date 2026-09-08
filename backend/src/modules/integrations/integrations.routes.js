const router = require('express').Router();
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const controller = require('./integrations.controller');

router.use(authenticate);
router.use(authorize('admin'));

router.get('/vendors', controller.listVendorNames);
router.get('/logs', controller.listLogs);
router.post('/contacts/sync', controller.syncContacts);
router.post('/deals/sync', controller.syncDeals);
router.post('/push-all', controller.pushAll);
router.post('/customers/:id/push', controller.pushCustomer);
router.post('/opportunities/:id/push', controller.pushOpportunity);

module.exports = router;
