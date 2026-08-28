const asyncHandler = require('../../middleware/asyncHandler');
const { getPagination, buildPaginatedResponse } = require('../../utils/pagination');
const leadsService = require('./leads.service');

const list = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const { status, ownerId, search } = req.query;
  const { rows, total } = await leadsService.list({ limit, offset, status, ownerId, search });
  res.json(buildPaginatedResponse({ rows, total, page, limit }));
});

const getById = asyncHandler(async (req, res) => {
  const lead = await leadsService.getById(req.params.id);
  res.json({ lead });
});

const create = asyncHandler(async (req, res) => {
  const lead = await leadsService.create(req.body, req.user.id);
  res.status(201).json({ lead });
});

const update = asyncHandler(async (req, res) => {
  const lead = await leadsService.update(req.params.id, req.body);
  res.json({ lead });
});

const remove = asyncHandler(async (req, res) => {
  await leadsService.remove(req.params.id);
  res.status(204).send();
});

const convert = asyncHandler(async (req, res) => {
  const result = await leadsService.convert(req.params.id, { ...req.body, ownerId: req.user.id });
  res.status(201).json(result);
});

module.exports = { list, getById, create, update, remove, convert };
