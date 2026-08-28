const pool = require('../../config/db');
const HttpError = require('../../utils/HttpError');

async function list({ limit, offset, ownerId, customerId, leadId, opportunityId, completed }) {
  const conditions = [];
  const params = [];

  const addFilter = (column, value) => {
    if (value !== undefined) {
      params.push(value);
      conditions.push(`${column} = $${params.length}`);
    }
  };

  addFilter('owner_id', ownerId);
  addFilter('customer_id', customerId);
  addFilter('lead_id', leadId);
  addFilter('opportunity_id', opportunityId);
  if (completed !== undefined) addFilter('completed', completed === 'true');

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const totalResult = await pool.query(`SELECT COUNT(*)::int AS total FROM activities ${where}`, params);

  const dataParams = [...params, limit, offset];
  const { rows } = await pool.query(
    `SELECT * FROM activities ${where} ORDER BY due_date ASC NULLS LAST, created_at DESC LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams
  );

  return { rows, total: totalResult.rows[0].total };
}

/** Tasks with a due date within the next `hours` that have not yet had a reminder sent. */
async function upcomingReminders({ ownerId, hours = 24 }) {
  const params = [hours];
  let where = `WHERE completed = FALSE AND reminder_sent = FALSE AND due_date IS NOT NULL AND due_date <= now() + ($1 || ' hours')::interval`;
  if (ownerId) {
    params.push(ownerId);
    where += ` AND owner_id = $${params.length}`;
  }
  const { rows } = await pool.query(
    `SELECT * FROM activities ${where} ORDER BY due_date ASC`,
    params
  );
  return rows;
}

async function markReminderSent(id) {
  await pool.query('UPDATE activities SET reminder_sent = TRUE WHERE id = $1', [id]);
}

async function getById(id) {
  const { rows } = await pool.query('SELECT * FROM activities WHERE id = $1', [id]);
  if (!rows[0]) throw new HttpError(404, 'Activity not found');
  return rows[0];
}

async function create(data, ownerId) {
  const { type, subject, notes, dueDate, leadId, customerId, opportunityId } = data;
  if (!subject) throw new HttpError(400, 'subject is required');
  const { rows } = await pool.query(
    `INSERT INTO activities (type, subject, notes, due_date, lead_id, customer_id, opportunity_id, owner_id)
     VALUES (COALESCE($1, 'note'), $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [type, subject, notes, dueDate, leadId, customerId, opportunityId, ownerId]
  );
  return rows[0];
}

async function update(id, data) {
  const fields = ['type', 'subject', 'notes', 'due_date', 'completed'];
  const map = {
    type: data.type,
    subject: data.subject,
    notes: data.notes,
    due_date: data.dueDate,
    completed: data.completed,
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
    `UPDATE activities SET ${updates.join(', ')}, updated_at = now() WHERE id = $${params.length} RETURNING *`,
    params
  );
  if (!rows[0]) throw new HttpError(404, 'Activity not found');
  return rows[0];
}

async function remove(id) {
  const { rowCount } = await pool.query('DELETE FROM activities WHERE id = $1', [id]);
  if (!rowCount) throw new HttpError(404, 'Activity not found');
}

module.exports = { list, upcomingReminders, markReminderSent, getById, create, update, remove };
