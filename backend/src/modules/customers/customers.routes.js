const router = require('express').Router();
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const controller = require('./customers.controller');

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.get('/:id/timeline', controller.getTimeline);
router.post('/', authorize('admin', 'sales'), controller.create);
router.put('/:id', authorize('admin', 'sales', 'support'), controller.update);
router.delete('/:id', authorize('admin'), controller.remove);

// CV / resume upload (admin & sales can upload; support can download)
router.post('/:id/cv', authorize('admin', 'sales'), controller.uploadCv);
router.get('/:id/cv', authorize('admin', 'sales', 'support'), controller.getCv);
router.delete('/:id/cv', authorize('admin', 'sales'), controller.removeCv);

module.exports = router;
