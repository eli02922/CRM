const hubspot = require('./hubspot');

/**
 * Vendor registry. To add a new vendor:
 *   1. Create a file in this folder (e.g. `./salesforce.js`) exporting the
 *      normalized interface described below.
 *   2. Add it here.
 *
 * A vendor adapter exposes:
 *   - init(cfg): configure the vendor (baseURL, token), returns the client
 *   - listContacts(after): generic list of contacts
 *   - listDeals(after): generic list of deals
 *   - createContact(props) / updateContact(id, props)
 *   - createDeal(props) / updateDeal(id, props)
 *   - searchContactsByEmail(email) / searchDealsByName(name)
 */
const adapters = {
  hubspot,
};

function getAdapter(name) {
  const adapter = adapters[(name || '').toLowerCase()];
  if (!adapter) {
    throw new Error(`Unknown integration vendor: ${name}. Available: ${Object.keys(adapters).join(', ')}`);
  }
  return adapter;
}

function listVendors() {
  return Object.keys(adapters);
}

module.exports = { getAdapter, listVendors };
