const router = require('express').Router();
const authenticate = require('../../middleware/authenticate');
const controller = require('./reports.controller');

router.use(authenticate);

router.get('/summary', controller.summary);
router.get('/lead-conversion', controller.leadConversion);
router.get('/sales-performance', controller.salesPerformance);
router.get('/customer-engagement', controller.customerEngagement);
router.get('/revenue-trend', controller.revenueTrend);

module.exports = router;
