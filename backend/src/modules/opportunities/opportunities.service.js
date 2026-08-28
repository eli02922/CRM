const pool = require('../../config/db');
const HttpError = require('../../utils/HttpError');

const STAGES = ['prospecting', 'qualification', 'proposal', 'negotiation', 'won', 'lost'];

async function list({ limit, offset, stage, ownerId, customerId }) {
  const conditions = [];
  const params = [];

  if (stage) {
    params.push(stage);
    conditions.push(`stage = $${params.length}`);
  }
  if (ownerId) {
    params.push(ownerId);
    conditions.push(`owner_id = $${params.length}`);
  }
  if (customerId) {
    params.push(customerId);
    conditions.push(`customer_id = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const totalResult = await pool.query(`SELECT COUNT(*)::int AS total FROM opportunities ${where}`, params);

  const dataParams = [...params, limit, offset];
  const { rows } = await pool.query(
    `SELECT o.*, c.company_name
     FROM opportunities o LEFT JOIN customers c ON c.id = o.customer_id
     ${where}
     ORDER BY o.created_at DESC
     LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams
  );

  return { rows, total: totalResult.rows[0].total };
}

/** Groups open opportunities by stage for the Kanban pipeline board. */
async function pipeline(ownerId) {
  const params = [];
  let where = "WHERE stage NOT IN ('won', 'lost')";
  if (ownerId) {
    params.push(ownerId);
    where += ` AND owner_id = $${params.length}`;
  }

  const { rows } = await pool.query(
    `SELECT o.*, c.company_name
     FROM opportunities o LEFT JOIN customers c ON c.id = o.customer_id
     ${where}
     ORDER BY o.expected_close_date ASC NULLS LAST`,
    params
  );

  const grouped = STAGES.filter((s) => s !== 'won' && s !== 'lost').reduce((acc, stage) => {
    acc[stage] = [];
    return acc;
  }, {});

  rows.forEach((row) => {
    if (grouped[row.stage]) grouped[row.stage].push(row);
  });

  return grouped;
}

async function getById(id) {
  const { rows } = await pool.query('SELECT * FROM opportunities WHERE id = $1', [id]);
  if (!rows[0]) throw new HttpError(404, 'Opportunity not found');
  return rows[0];
}

async function create(data, ownerId) {
  const { name, customerId, leadId, amount, probability, expectedCloseDate, currency } = data;
  if (!name) throw new HttpError(400, 'name is required');
  const { rows } = await pool.query(
    `INSERT INTO opportunities (name, customer_id, lead_id, amount, probability, expected_close_date, currency, owner_id)
     VALUES ($1, $2, $3, COALESCE($4, 0), COALESCE($5, 10), $6, COALESCE($7, 'USD'), $8)
     RETURNING *`,
    [name, customerId, leadId, amount, probability, expectedCloseDate, currency, ownerId]
  );
  return rows[0];
}

async function update(id, data) {
  if (data.stage && !STAGES.includes(data.stage)) {
    throw new HttpError(400, `Invalid stage. Must be one of: ${STAGES.join(', ')}`);
  }

  const fields = ['name', 'stage', 'amount', 'probability', 'expected_close_date', 'currency', 'owner_id'];
  const map = {
    name: data.name,
    stage: data.stage,
    amount: data.amount,
    probability: data.probability,
    expected_close_date: data.expectedCloseDate,
    currency: data.currency,
    owner_id: data.ownerId,
  };

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
    `UPDATE opportunities SET ${updates.join(', ')}, updated_at = now() WHERE id = $${params.length} RETURNING *`,
    params
  );
  if (!rows[0]) throw new HttpError(404, 'Opportunity not found');
  return rows[0];
}

async function remove(id) {
  const { rowCount } = await pool.query('DELETE FROM opportunities WHERE id = $1', [id]);
  if (!rowCount) throw new HttpError(404, 'Opportunity not found');
}

module.exports = { list, pipeline, getById, create, update, remove, STAGES };
