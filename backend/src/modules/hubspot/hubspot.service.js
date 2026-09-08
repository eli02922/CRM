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

async function listLogs(limit = 50) {
  const { rows } = await pool.query(
    'SELECT * FROM hubspot_sync_log ORDER BY created_at DESC LIMIT $1',
    [limit]
  );
  return rows;
}

module.exports = { syncContacts, syncDeals, listLogs };
