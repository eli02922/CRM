const pool = require('../../config/db');
const env = require('../../config/env');
const HttpError = require('../../utils/HttpError');
const { getAdapter } = require('./vendors');

function resolveVendor(name) {
  const cfg = env.getIntegration(name);
  const adapter = getAdapter(name);
  return { adapter, cfg, name };
}

function ensureEnabled(cfg, name) {
  if (!cfg.enabled || !cfg.token) {
    throw new HttpError(503, `Integration "${name}" is disabled. Set INTEGRATIONS_${name.toUpperCase()}_ENABLED=true and *_TOKEN in .env`);
  }
}

async function logSync(vendor, syncType, status, recordsSynced, errorMessage, syncedBy) {
  await pool.query(
    `INSERT INTO vendor_sync_log (vendor, sync_type, status, records_synced, error_message, synced_by)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [vendor, syncType, status, recordsSynced, errorMessage || null, syncedBy || null]
  );
}

/** Pull vendor contacts into the customers table (keyed on generic external_id). */
async function syncContacts(vendor, userId) {
  const { adapter, cfg } = resolveVendor(vendor);
  ensureEnabled(cfg, vendor);
  adapter.init(cfg);

  let synced = 0;
  let failed = 0;
  let after;

  try {
    do {
      const data = await adapter.listContacts(after);
      const { results = [], paging } = data;
      for (const c of results) {
        const props = c.properties || c;
        const extId = String(props.id || props.hs_object_id || c.id || '');
        const email = props.email || '';
        const company = props.company || props.company_name || '';
        const firstName = props.firstname || props.first_name || '';
        const lastName = props.lastname || props.last_name || '';
        if (!extId) { failed += 1; continue; }

        const companyName = company || `${firstName} ${lastName}`.trim() || 'Unknown';

        // Generic upsert on external_id. This example stores vendor-specific ID in
        // the existing hubspot_id column for now; see note in README about migrating.
        await pool.query(
          `INSERT INTO customers (company_name, email, phone, hubspot_id, owner_id)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (hubspot_id) DO UPDATE
             SET company_name = EXCLUDED.company_name,
                 email = EXCLUDED.email,
                 phone = EXCLUDED.phone,
                 updated_at = now()`,
          [companyName, email || null, props.phone || null, extId, userId]
        );
        synced += 1;
      }
      after = paging && (paging.next ? paging.next.after : paging.after);
    } while (after);

    await logSync(vendor, 'contacts', failed ? 'partial' : 'success', synced, failed ? `${failed} skipped` : null, userId);
    return { synced, failed };
  } catch (err) {
    await logSync(vendor, 'contacts', 'failed', synced, err.message, userId);
    throw err;
  }
}

/** Pull vendor deals into opportunities (keyed on generic external id). */
async function syncDeals(vendor, userId) {
  const { adapter, cfg } = resolveVendor(vendor);
  ensureEnabled(cfg, vendor);
  adapter.init(cfg);

  let synced = 0;
  let failed = 0;
  let after;

  try {
    do {
      const data = await adapter.listDeals(after);
      const { results = [], paging } = data;
      for (const d of results) {
        const props = d.properties || d;
        const extId = String(props.id || props.hs_object_id || d.id || '');
        const name = props.dealname || props.title || props.name || '';
        if (!extId || !name) { failed += 1; continue; }

        const amount = parseFloat(props.amount);
        await pool.query(
          `INSERT INTO opportunities (name, amount, stage, expected_close_date, hubspot_id, owner_id)
           VALUES ($1, $2, 'prospecting', $3, $4, $5)
           ON CONFLICT (hubspot_id) DO UPDATE
             SET name = EXCLUDED.name,
                 amount = EXCLUDED.amount,
                 expected_close_date = EXCLUDED.expected_close_date,
                 updated_at = now()`,
          [name, Number.isNaN(amount) ? 0 : amount, props.closedate || props.close_date || null, extId, userId]
        );
        synced += 1;
      }
      after = paging && (paging.next ? paging.next.after : paging.after);
    } while (after);

    await logSync(vendor, 'deals', failed ? 'partial' : 'success', synced, failed ? `${failed} skipped` : null, userId);
    return { synced, failed };
  } catch (err) {
    await logSync(vendor, 'deals', 'failed', synced, err.message, userId);
    throw err;
  }
}

/** Push a single customer to a vendor as a contact. */
async function pushCustomer(vendor, customerId) {
  const { adapter, cfg } = resolveVendor(vendor);
  ensureEnabled(cfg, vendor);
  adapter.init(cfg);

  const { rows } = await pool.query('SELECT * FROM customers WHERE id = $1', [customerId]);
  const customer = rows[0];
  if (!customer) throw new HttpError(404, 'Customer not found');

  const props = {
    company: customer.company_name || '',
    email: customer.email || '',
    phone: customer.phone || '',
  };
  if (!props.email) props.firstname = customer.company_name || 'Unknown';

  let extId = customer.hubspot_id;
  if (extId) {
    await adapter.updateContact(extId, props);
  } else if (customer.email) {
    const existing = await adapter.searchContactsByEmail(customer.email);
    const match = existing.results && existing.results[0];
    if (match) {
      extId = String(match.id || match.properties?.hs_object_id || match.id);
      await adapter.updateContact(extId, props);
    } else {
      const created = await adapter.createContact(props);
      extId = String(created.id);
    }
  } else {
    const created = await adapter.createContact(props);
    extId = String(created.id);
  }

  await pool.query('UPDATE customers SET hubspot_id = $1, updated_at = now() WHERE id = $2', [extId, customerId]);
  return { customerId, externalId: extId };
}

/** Push a single opportunity to a vendor as a deal. */
async function pushOpportunity(vendor, opportunityId) {
  const { adapter, cfg } = resolveVendor(vendor);
  ensureEnabled(cfg, vendor);
  adapter.init(cfg);

  const { rows } = await pool.query('SELECT * FROM opportunities WHERE id = $1', [opportunityId]);
  const opp = rows[0];
  if (!opp) throw new HttpError(404, 'Opportunity not found');

  const props = {
    name: opp.name || '',
    amount: opp.amount != null ? String(opp.amount) : '0',
    closeDate: opp.expected_close_date || undefined,
  };

  let extId = opp.hubspot_id;
  if (extId) {
    await adapter.updateDeal(extId, props);
  } else if (opp.name) {
    const existing = await adapter.searchDealsByName(opp.name);
    const match = existing.results && existing.results[0];
    if (match) {
      extId = String(match.id || match.properties?.hs_object_id || match.id);
      await adapter.updateDeal(extId, props);
    } else {
      const created = await adapter.createDeal(props);
      extId = String(created.id);
    }
  } else {
    const created = await adapter.createDeal(props);
    extId = String(created.id);
  }

  await pool.query('UPDATE opportunities SET hubspot_id = $1, updated_at = now() WHERE id = $2', [extId, opportunityId]);
  return { opportunityId, externalId: extId };
}

/** Bulk push all customers + opportunities to a vendor. */
async function pushAll(vendor, userId) {
  const { adapter, cfg } = resolveVendor(vendor);
  ensureEnabled(cfg, vendor);
  adapter.init(cfg);

  const { rows: customers } = await pool.query('SELECT id FROM customers');
  const { rows: opportunities } = await pool.query('SELECT id FROM opportunities');

  let pushed = 0;
  let failed = 0;

  for (const c of customers) {
    try { await pushCustomer(vendor, c.id); pushed += 1; }
    catch (err) { failed += 1; await logSync(vendor, 'contacts_push', 'failed', pushed, err.message, userId); }
  }
  for (const o of opportunities) {
    try { await pushOpportunity(vendor, o.id); pushed += 1; }
    catch (err) { failed += 1; await logSync(vendor, 'deals_push', 'failed', pushed, err.message, userId); }
  }

  await logSync(vendor, 'push_all', failed ? 'partial' : 'success', pushed, failed ? `${failed} failed` : null, userId);
  return { pushed, failed };
}

async function listLogs(vendor, limit = 50) {
  const params = [];
  let where = '';
  if (vendor) { params.push(vendor); where = 'WHERE vendor = $1'; }
  params.push(limit);
  const { rows } = await pool.query(
    `SELECT * FROM vendor_sync_log ${where} ORDER BY created_at DESC LIMIT $${params.length}`,
    params
  );
  return rows;
}

module.exports = { syncContacts, syncDeals, pushCustomer, pushOpportunity, pushAll, listLogs };
