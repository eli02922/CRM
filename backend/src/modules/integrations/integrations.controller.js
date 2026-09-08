const asyncHandler = require('../../middleware/asyncHandler');
const service = require('./integrations.service');
const { listVendors } = require('./vendors');

function vendorFrom(req) {
  return (req.query.vendor || req.params.vendor || 'hubspot').toLowerCase();
}

const syncContacts = asyncHandler(async (req, res) => {
  const result = await service.syncContacts(vendorFrom(req), req.user.id);
  res.json({ message: `${vendorFrom(req)} contacts synced`, ...result });
});

const syncDeals = asyncHandler(async (req, res) => {
  const result = await service.syncDeals(vendorFrom(req), req.user.id);
  res.json({ message: `${vendorFrom(req)} deals synced`, ...result });
});

const pushCustomer = asyncHandler(async (req, res) => {
  const result = await service.pushCustomer(vendorFrom(req), req.params.id);
  res.json({ message: `Customer pushed to ${vendorFrom(req)}`, ...result });
});

const pushOpportunity = asyncHandler(async (req, res) => {
  const result = await service.pushOpportunity(vendorFrom(req), req.params.id);
  res.json({ message: `Opportunity pushed to ${vendorFrom(req)}`, ...result });
});

const pushAll = asyncHandler(async (req, res) => {
  const result = await service.pushAll(vendorFrom(req), req.user.id);
  res.json({ message: `CRM data pushed to ${vendorFrom(req)}`, ...result });
});

const listLogs = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  const vendor = req.query.vendor ? String(req.query.vendor).toLowerCase() : null;
  const logs = await service.listLogs(vendor, limit);
  res.json({ logs });
});

const listVendorNames = asyncHandler(async (req, res) => {
  res.json({ vendors: listVendors() });
});

module.exports = { syncContacts, syncDeals, pushCustomer, pushOpportunity, pushAll, listLogs, listVendorNames };
