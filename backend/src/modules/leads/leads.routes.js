const router = require('express').Router();
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const controller = require('./leads.controller');

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', authorize('admin', 'sales'), controller.create);
router.put('/:id', authorize('admin', 'sales'), controller.update);
router.delete('/:id', authorize('admin'), controller.remove);
router.post('/:id/convert', authorize('admin', 'sales'), controller.convert);

module.exports = router;
