const pool = require('../../config/db');
const HttpError = require('../../utils/HttpError');

const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

async function list({ limit, offset, status, customerId, assigneeId }) {
  const conditions = [];
  const params = [];
  const addFilter = (column, value) => {
    if (value !== undefined) {
      params.push(value);
      conditions.push(`${column} = $${params.length}`);
    }
  };
  addFilter('status', status);
  addFilter('customer_id', customerId);
  addFilter('assignee_id', assigneeId);

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const totalResult = await pool.query(`SELECT COUNT(*)::int AS total FROM support_cases ${where}`, params);

  const dataParams = [...params, limit, offset];
  const { rows } = await pool.query(
    `SELECT * FROM support_cases ${where} ORDER BY created_at DESC LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams
  );

  return { rows, total: totalResult.rows[0].total };
}

async function getById(id) {
  const { rows } = await pool.query('SELECT * FROM support_cases WHERE id = $1', [id]);
  if (!rows[0]) throw new HttpError(404, 'Support case not found');
  return rows[0];
}

async function create(data) {
  const { subject, description, priority, customerId, assigneeId } = data;
  if (!subject) throw new HttpError(400, 'subject is required');
  const { rows } = await pool.query(
    `INSERT INTO support_cases (subject, description, priority, customer_id, assignee_id)
     VALUES ($1, $2, COALESCE($3, 'medium'), $4, $5) RETURNING *`,
    [subject, description, priority, customerId, assigneeId]
  );
  return rows[0];
}

async function update(id, data) {
  if (data.status && !STATUSES.includes(data.status)) {
    throw new HttpError(400, `Invalid status. Must be one of: ${STATUSES.join(', ')}`);
  }
  const fields = ['subject', 'description', 'status', 'priority', 'assignee_id'];
  const map = {
    subject: data.subject,
    description: data.description,
    status: data.status,
    priority: data.priority,
    assignee_id: data.assigneeId,
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
    `UPDATE support_cases SET ${updates.join(', ')}, updated_at = now() WHERE id = $${params.length} RETURNING *`,
    params
  );
  if (!rows[0]) throw new HttpError(404, 'Support case not found');
  return rows[0];
}

async function remove(id) {
  const { rowCount } = await pool.query('DELETE FROM support_cases WHERE id = $1', [id]);
  if (!rowCount) throw new HttpError(404, 'Support case not found');
}

module.exports = { list, getById, create, update, remove };
