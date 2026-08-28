const asyncHandler = require('../../middleware/asyncHandler');
const { getPagination, buildPaginatedResponse } = require('../../utils/pagination');
const activitiesService = require('./activities.service');

const list = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const { ownerId, customerId, leadId, opportunityId, completed } = req.query;
  const { rows, total } = await activitiesService.list({
    limit,
    offset,
    ownerId,
    customerId,
    leadId,
    opportunityId,
    completed,
  });
  res.json(buildPaginatedResponse({ rows, total, page, limit }));
});

const reminders = asyncHandler(async (req, res) => {
  const rows = await activitiesService.upcomingReminders({
    ownerId: req.query.ownerId || req.user.id,
    hours: req.query.hours,
  });
  res.json({ data: rows });
});

const getById = asyncHandler(async (req, res) => {
  const activity = await activitiesService.getById(req.params.id);
  res.json({ activity });
});

const create = asyncHandler(async (req, res) => {
  const activity = await activitiesService.create(req.body, req.user.id);
  res.status(201).json({ activity });
});

const update = asyncHandler(async (req, res) => {
  const activity = await activitiesService.update(req.params.id, req.body);
  res.json({ activity });
});

const remove = asyncHandler(async (req, res) => {
  await activitiesService.remove(req.params.id);
  res.status(204).send();
});

module.exports = { list, reminders, getById, create, update, remove };
