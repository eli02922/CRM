const router = require('express').Router();
const authenticate = require('../../middleware/authenticate');
const controller = require('./supportCases.controller');

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
