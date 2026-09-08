const asyncHandler = require('../../middleware/asyncHandler');
const hubspotService = require('./hubspot.service');

const syncContacts = asyncHandler(async (req, res) => {
  const result = await hubspotService.syncContacts(req.user.id);
  res.json({ message: 'HubSpot contacts synced', ...result });
});

const syncDeals = asyncHandler(async (req, res) => {
  const result = await hubspotService.syncDeals(req.user.id);
  res.json({ message: 'HubSpot deals synced', ...result });
});

const listLogs = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  const logs = await hubspotService.listLogs(limit);
  res.json({ logs });
});

module.exports = { syncContacts, syncDeals, listLogs };
