const asyncHandler = require('../../middleware/asyncHandler');
const reportsService = require('./reports.service');

const summary = asyncHandler(async (req, res) => {
  res.json(await reportsService.summary());
});

const leadConversion = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  res.json(await reportsService.leadConversion({ from, to }));
});

const salesPerformance = asyncHandler(async (req, res) => {
  res.json({ data: await reportsService.salesPerformance() });
});

const customerEngagement = asyncHandler(async (req, res) => {
  res.json({ data: await reportsService.customerEngagement({ limit: req.query.limit }) });
});

const revenueTrend = asyncHandler(async (req, res) => {
  res.json({ data: await reportsService.revenueTrend({ months: req.query.months }) });
});

module.exports = { summary, leadConversion, salesPerformance, customerEngagement, revenueTrend };
