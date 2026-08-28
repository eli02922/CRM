const router = require('express').Router();
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const controller = require('./opportunities.controller');

router.use(authenticate);

router.get('/', controller.list);
router.get('/pipeline', controller.pipeline);
router.get('/:id', controller.getById);
router.post('/', authorize('admin', 'sales'), controller.create);
router.put('/:id', authorize('admin', 'sales'), controller.update);
router.delete('/:id', authorize('admin'), controller.remove);

module.exports = router;
