const pool = require('../../config/db');
const env = require('../../config/env');
const HttpError = require('../../utils/HttpError');
const hubspot = require('./hubspot.client');

function ensureEnabled() {
  if (!env.hubspot.enabled || !env.hubspot.token) {
    throw new HttpError(503, 'HubSpot integration is disabled. Set HUBSPOT_ENABLED=true and HUBSPOT_ACCESS_TOKEN in .env');
  }
}

async function logSync(syncType, status, recordsSynced, errorMessage, syncedBy) {
  await pool.query(
    `INSERT INTO hubspot_sync_log (sync_type, status, records_synced, error_message, synced_by)
     VALUES ($1, $2, $3, $4, $5)`,
    [syncType, status, recordsSynced, errorMessage || null, syncedBy || null]
  );
}

/** Syncs HubSpot contacts into the `customers` table, keyed on hubspot_id. */
async function syncContacts(userId) {
  ensureEnabled();
  let synced = 0;
  let failed = 0;
  let after;

  try {
    do {
      const data = await hubspot.getContacts(after);
      const { results = [], paging } = data;
      for (const c of results) {
        const props = c.properties || {};
        const hsId = String(props.hs_object_id || c.id || '');
        const company = props.company || '';
        const email = props.email || '';
        if (!hsId || !props.firstname) { failed += 1; continue; }

        // company_name is NOT NULL, so fall back to the contact's name.
        const companyName = company || `${props.firstname || ''} ${props.lastname || ''}`.trim() || 'Unknown';

        await pool.query(
          `INSERT INTO customers (company_name, email, phone, hubspot_id, owner_id)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (hubspot_id) DO UPDATE
             SET company_name = EXCLUDED.company_name,
                 email = EXCLUDED.email,
                 phone = EXCLUDED.phone,
                 updated_at = now()`,
          [companyName, email || null, props.phone || null, hsId, userId]
        );
        synced += 1;
      }
      after = paging && paging.next && paging.next.after;
    } while (after);

    await logSync('contacts', failed ? 'partial' : 'success', synced, failed ? `${failed} contact(s) skipped` : null, userId);
    return { synced, failed };
  } catch (err) {
    await logSync('contacts', 'failed', synced, err.message, userId);
    throw err;
  }
}

/** Syncs HubSpot deals into the `opportunities` table, keyed on hubspot_id. */
async function syncDeals(userId) {
  ensureEnabled();
  let synced = 0;
  let failed = 0;
  let after;

  try {
    do {
      const data = await hubspot.getDeals(after);
      const { results = [], paging } = data;
      for (const d of results) {
        const props = d.properties || {};
        const hsId = String(props.hs_object_id || d.id || '');
        if (!hsId || !props.dealname) { failed += 1; continue; }

        const amount = parseFloat(props.amount);
        await pool.query(
          `INSERT INTO opportunities (name, amount, stage, expected_close_date, hubspot_id, owner_id)
           VALUES ($1, $2, 'prospecting', $3, $4, $5)
           ON CONFLICT (hubspot_id) DO UPDATE
             SET name = EXCLUDED.name,
                 amount = EXCLUDED.amount,
                 expected_close_date = EXCLUDED.expected_close_date,
                 updated_at = now()`,
          [props.dealname, Number.isNaN(amount) ? 0 : amount, props.closedate || null, hsId, userId]
        );
        synced += 1;
      }
      after = paging && paging.next && paging.next.after;
    } while (after);

    await logSync('deals', failed ? 'partial' : 'success', synced, failed ? `${failed} deal(s) skipped` : null, userId);
    return { synced, failed };
  } catch (err) {
    await logSync('deals', 'failed', synced, err.message, userId);
    throw err;
  }
}

/** Maps a local CRM customer to HubSpot contact properties. */
function customerToContactProps(customer) {
  const props = {
    company: customer.company_name || '',
    email: customer.email || '',
    phone: customer.phone || '',
  };
  // HubSpot requires at least one of email/firstname/lastname; use company as firstname fallback.
  if (!props.email) {
    props.firstname = customer.company_name || 'Unknown';
  }
  return props;
}

/**
 * Pushes a single customer to HubSpot as a contact.
 * If the customer has hubspot_id, update; otherwise search by email, else create.
 * Records the returned hubspot_id back on the customer.
 */
async function pushCustomer(customerId) {
  ensureEnabled();
  const { rows } = await pool.query('SELECT * FROM customers WHERE id = $1', [customerId]);
  const customer = rows[0];
  if (!customer) throw new HttpError(404, 'Customer not found');

  const properties = customerToContactProps(customer);
  let hsId = customer.hubspot_id;

  if (hsId) {
    await hubspot.updateContact(hsId, properties);
  } else if (customer.email) {
    const existing = await hubspot.searchContactsByEmail(customer.email);
    const match = existing.results && existing.results[0];
    if (match) {
      hsId = String(match.id || match.properties.hs_object_id);
      await hubspot.updateContact(hsId, properties);
    } else {
      const created = await hubspot.createContact(properties);
      hsId = String(created.id);
    }
  } else {
    const created = await hubspot.createContact(properties);
    hsId = String(created.id);
  }

  await pool.query('UPDATE customers SET hubspot_id = $1, updated_at = now() WHERE id = $2', [hsId, customerId]);
  return { customerId, hubspotId: hsId };
}

/** Maps a local opportunity to HubSpot deal properties. */
function opportunityToDealProps(opp) {
  return {
    dealname: opp.name || '',
    amount: opp.amount != null ? String(opp.amount) : '0',
    closedate: opp.expected_close_date || undefined,
  };
}

/**
 * Pushes a single opportunity to HubSpot as a deal (update if linked, else search by name, else create).
 */
async function pushOpportunity(opportunityId) {
  ensureEnabled();
  const { rows } = await pool.query('SELECT * FROM opportunities WHERE id = $1', [opportunityId]);
  const opp = rows[0];
  if (!opp) throw new HttpError(404, 'Opportunity not found');

  const properties = opportunityToDealProps(opp);
  let hsId = opp.hubspot_id;

  if (hsId) {
    await hubspot.updateDeal(hsId, properties);
  } else if (opp.name) {
    const existing = await hubspot.searchDealsByName(opp.name);
    const match = existing.results && existing.results[0];
    if (match) {
      hsId = String(match.id || match.properties.hs_object_id);
      await hubspot.updateDeal(hsId, properties);
    } else {
      const created = await hubspot.createDeal(properties);
      hsId = String(created.id);
    }
  } else {
    const created = await hubspot.createDeal(properties);
    hsId = String(created.id);
  }

  await pool.query('UPDATE opportunities SET hubspot_id = $1, updated_at = now() WHERE id = $2', [hsId, opportunityId]);
  return { opportunityId, hubspotId: hsId };
}

/**
 * Bulk-push: pushes all customers (contacts) and opportunities (deals) to HubSpot.
 */
async function pushAll(userId) {
  ensureEnabled();
  const { rows: customers } = await pool.query('SELECT id FROM customers');
  const { rows: opportunities } = await pool.query('SELECT id FROM opportunities');

  let pushed = 0;
  let failed = 0;

  for (const c of customers) {
    try {
      await pushCustomer(c.id);
      pushed += 1;
    } catch (err) {
      failed += 1;
      await logSync('contacts_push', 'failed', pushed, err.message, userId);
    }
  }
  for (const o of opportunities) {
    try {
      await pushOpportunity(o.id);
      pushed += 1;
    } catch (err) {
      failed += 1;
      await logSync('deals_push', 'failed', pushed, err.message, userId);
    }
  }

  await logSync('push_all', failed ? 'partial' : 'success', pushed, failed ? `${failed} record(s) failed` : null, userId);
  return { pushed, failed };
}

async function listLogs(limit = 50) {
  const { rows } = await pool.query(
    'SELECT * FROM hubspot_sync_log ORDER BY created_at DESC LIMIT $1',
    [limit]
  );
  return rows;
}

module.exports = {
  syncContacts,
  syncDeals,
  pushCustomer,
  pushOpportunity,
  pushAll,
  listLogs,
};
