const router = require('express').Router();
const authenticate = require('../../middleware/authenticate');
const controller = require('./activities.controller');

router.use(authenticate);

router.get('/', controller.list);
router.get('/reminders', controller.reminders);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
