const path = require('path');
const fs = require('fs');
const multer = require('multer');
const asyncHandler = require('../../middleware/asyncHandler');
const { getPagination, buildPaginatedResponse } = require('../../utils/pagination');
const HttpError = require('../../utils/HttpError');
const customersService = require('./customers.service');

// CV uploads: stored on disk under backend/uploads/cvs with a unique name.
const CV_DIR = path.join(__dirname, '..', '..', '..', 'uploads', 'cvs');
fs.mkdirSync(CV_DIR, { recursive: true });

const ALLOWED_CV_TYPES = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};

const cvUpload = multer({
  storage: multer.diskStorage({
    destination: CV_DIR,
    filename: (req, file, cb) =>
      cb(null, `${req.params.id}-${Date.now()}${ALLOWED_CV_TYPES[file.mimetype] || path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_CV_TYPES[file.mimetype]) return cb(null, true);
    cb(new HttpError(400, 'Only PDF, DOC and DOCX files are allowed'));
  },
});

const list = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const { search, ownerId } = req.query;
  const { rows, total } = await customersService.list({ limit, offset, search, ownerId });
  res.json(buildPaginatedResponse({ rows, total, page, limit }));
});

const getById = asyncHandler(async (req, res) => {
  const customer = await customersService.getById(req.params.id);
  res.json({ customer });
});

const getTimeline = asyncHandler(async (req, res) => {
  const timeline = await customersService.getTimeline(req.params.id);
  res.json(timeline);
});

const create = asyncHandler(async (req, res) => {
  const customer = await customersService.create(req.body, req.user.id);
  res.status(201).json({ customer });
});

const update = asyncHandler(async (req, res) => {
  const customer = await customersService.update(req.params.id, req.body);
  res.json({ customer });
});

const remove = asyncHandler(async (req, res) => {
  await customersService.remove(req.params.id);
  res.status(204).send();
});

const uploadCv = [
  cvUpload.single('cv'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'No file uploaded (expected field "cv")');
    const cv = await customersService.saveCv(req.params.id, req.file);
    res.status(201).json({ cv });
  }),
];

const getCv = asyncHandler(async (req, res) => {
  await customersService.getCv(req.params.id, res);
});

const removeCv = asyncHandler(async (req, res) => {
  await customersService.removeCv(req.params.id);
  res.status(204).send();
});

module.exports = { list, getById, getTimeline, create, update, remove, uploadCv, getCv, removeCv };
