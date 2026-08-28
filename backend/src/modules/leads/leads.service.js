const pool = require('../../config/db');
const HttpError = require('../../utils/HttpError');

const ALLOWED_STATUS = ['new', 'contacted', 'qualified', 'unqualified', 'converted'];

async function list({ limit, offset, status, ownerId, search }) {
  const conditions = [];
  const params = [];

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }
  if (ownerId) {
    params.push(ownerId);
    conditions.push(`owner_id = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(
      `(first_name ILIKE $${params.length} OR last_name ILIKE $${params.length} OR company ILIKE $${params.length} OR email ILIKE $${params.length})`
    );
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const totalResult = await pool.query(`SELECT COUNT(*)::int AS total FROM leads ${where}`, params);
  const dataParams = [...params, limit, offset];
  const { rows } = await pool.query(
    `SELECT id, first_name, last_name, email, phone, company, source, status, score, owner_id, created_at, updated_at
     FROM leads ${where}
     ORDER BY created_at DESC
     LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams
  );

  return { rows, total: totalResult.rows[0].total };
}

async function getById(id) {
  const { rows } = await pool.query('SELECT * FROM leads WHERE id = $1', [id]);
  if (!rows[0]) throw new HttpError(404, 'Lead not found');
  return rows[0];
}

async function create(data, ownerId) {
  const { firstName, lastName, email, phone, company, source, score } = data;
  const { rows } = await pool.query(
    `INSERT INTO leads (first_name, last_name, email, phone, company, source, score, owner_id)
     VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 0), $8)
     RETURNING *`,
    [firstName, lastName, email, phone, company, source, score, ownerId]
  );
  return rows[0];
}

async function update(id, data) {
  const fields = ['first_name', 'last_name', 'email', 'phone', 'company', 'source', 'status', 'score', 'owner_id'];
  const map = {
    first_name: data.firstName,
    last_name: data.lastName,
    email: data.email,
    phone: data.phone,
    company: data.company,
    source: data.source,
    status: data.status,
    score: data.score,
    owner_id: data.ownerId,
  };

  if (data.status && !ALLOWED_STATUS.includes(data.status)) {
    throw new HttpError(400, `Invalid status. Must be one of: ${ALLOWED_STATUS.join(', ')}`);
  }

  const updates = [];
  const params = [];
  fields.forEach((field) => {
    if (map[field] !== undefined) {
      params.push(map[field]);
      updates.push(`${field} = $${params.length}`);
    }
  });

  if (!updates.length) throw new HttpError(400, 'No fields to update');

  params.push(id);
  const { rows } = await pool.query(
    `UPDATE leads SET ${updates.join(', ')}, updated_at = now() WHERE id = $${params.length} RETURNING *`,
    params
  );
  if (!rows[0]) throw new HttpError(404, 'Lead not found');
  return rows[0];
}

async function remove(id) {
  const { rowCount } = await pool.query('DELETE FROM leads WHERE id = $1', [id]);
  if (!rowCount) throw new HttpError(404, 'Lead not found');
}

/** Converts a qualified lead into a customer + opportunity in a single transaction. */
async function convert(id, { opportunityName, amount, ownerId }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: leadRows } = await client.query('SELECT * FROM leads WHERE id = $1 FOR UPDATE', [id]);
    const lead = leadRows[0];
    if (!lead) throw new HttpError(404, 'Lead not found');
    if (lead.status === 'converted') throw new HttpError(409, 'Lead already converted');

    const { rows: customerRows } = await client.query(
      `INSERT INTO customers (company_name, email, phone, owner_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [lead.company || `${lead.first_name} ${lead.last_name}`, lead.email, lead.phone, ownerId || lead.owner_id]
    );
    const customer = customerRows[0];

    const { rows: oppRows } = await client.query(
      `INSERT INTO opportunities (name, customer_id, lead_id, stage, amount, owner_id)
       VALUES ($1, $2, $3, 'prospecting', COALESCE($4, 0), $5) RETURNING *`,
      [opportunityName || `${customer.company_name} - New Opportunity`, customer.id, lead.id, amount, ownerId || lead.owner_id]
    );

    await client.query(
      `UPDATE leads SET status = 'converted', converted_customer_id = $1, updated_at = now() WHERE id = $2`,
      [customer.id, id]
    );

    await client.query('COMMIT');
    return { customer, opportunity: oppRows[0] };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { list, getById, create, update, remove, convert };
