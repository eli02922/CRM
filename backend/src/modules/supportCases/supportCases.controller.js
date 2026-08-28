const asyncHandler = require('../../middleware/asyncHandler');
const { getPagination, buildPaginatedResponse } = require('../../utils/pagination');
const service = require('./supportCases.service');

const list = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const { status, customerId, assigneeId } = req.query;
  const { rows, total } = await service.list({ limit, offset, status, customerId, assigneeId });
  res.json(buildPaginatedResponse({ rows, total, page, limit }));
});

const getById = asyncHandler(async (req, res) => {
  res.json({ supportCase: await service.getById(req.params.id) });
});

const create = asyncHandler(async (req, res) => {
  res.status(201).json({ supportCase: await service.create(req.body) });
});

const update = asyncHandler(async (req, res) => {
  res.json({ supportCase: await service.update(req.params.id, req.body) });
});

const remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.id);
  res.status(204).send();
});

module.exports = { list, getById, create, update, remove };
