const asyncHandler = require('../../middleware/asyncHandler');
const { getPagination, buildPaginatedResponse } = require('../../utils/pagination');
const opportunitiesService = require('./opportunities.service');

const list = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const { stage, ownerId, customerId } = req.query;
  const { rows, total } = await opportunitiesService.list({ limit, offset, stage, ownerId, customerId });
  res.json(buildPaginatedResponse({ rows, total, page, limit }));
});

const pipeline = asyncHandler(async (req, res) => {
  const board = await opportunitiesService.pipeline(req.query.ownerId);
  res.json({ pipeline: board });
});

const getById = asyncHandler(async (req, res) => {
  const opportunity = await opportunitiesService.getById(req.params.id);
  res.json({ opportunity });
});

const create = asyncHandler(async (req, res) => {
  const opportunity = await opportunitiesService.create(req.body, req.user.id);
  res.status(201).json({ opportunity });
});

const update = asyncHandler(async (req, res) => {
  const opportunity = await opportunitiesService.update(req.params.id, req.body);
  res.json({ opportunity });
});

const remove = asyncHandler(async (req, res) => {
  await opportunitiesService.remove(req.params.id);
  res.status(204).send();
});

module.exports = { list, pipeline, getById, create, update, remove };
