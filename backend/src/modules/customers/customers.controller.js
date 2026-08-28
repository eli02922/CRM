const asyncHandler = require('../../middleware/asyncHandler');
const { getPagination, buildPaginatedResponse } = require('../../utils/pagination');
const customersService = require('./customers.service');

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

module.exports = { list, getById, getTimeline, create, update, remove };
