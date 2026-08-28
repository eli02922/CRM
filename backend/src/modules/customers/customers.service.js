const pool = require('../../config/db');
const HttpError = require('../../utils/HttpError');

async function list({ limit, offset, search, ownerId }) {
  const conditions = [];
  const params = [];

  if (ownerId) {
    params.push(ownerId);
    conditions.push(`owner_id = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(company_name ILIKE $${params.length} OR email ILIKE $${params.length})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const totalResult = await pool.query(`SELECT COUNT(*)::int AS total FROM customers ${where}`, params);

  const dataParams = [...params, limit, offset];
  const { rows } = await pool.query(
    `SELECT * FROM customers ${where} ORDER BY created_at DESC LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams
  );

  return { rows, total: totalResult.rows[0].total };
}

async function getById(id) {
  const { rows } = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
  if (!rows[0]) throw new HttpError(404, 'Customer not found');
  return rows[0];
}

/** Fetches a customer plus related opportunities/activities/support cases for the 360 view. */
async function getTimeline(id) {
  const customer = await getById(id);
  const [opportunities, activities, supportCases] = await Promise.all([
    pool.query('SELECT * FROM opportunities WHERE customer_id = $1 ORDER BY created_at DESC', [id]),
    pool.query('SELECT * FROM activities WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 50', [id]),
    pool.query('SELECT * FROM support_cases WHERE customer_id = $1 ORDER BY created_at DESC', [id]),
  ]);
  return {
    customer,
    opportunities: opportunities.rows,
    activities: activities.rows,
    supportCases: supportCases.rows,
  };
}

async function create(data, ownerId) {
  const { companyName, industry, email, phone, address, website } = data;
  if (!companyName) throw new HttpError(400, 'companyName is required');
  const { rows } = await pool.query(
    `INSERT INTO customers (company_name, industry, email, phone, address, website, owner_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [companyName, industry, email, phone, address, website, ownerId]
  );
  return rows[0];
}

async function update(id, data) {
  const fields = ['company_name', 'industry', 'email', 'phone', 'address', 'website', 'owner_id'];
  const map = {
    company_name: data.companyName,
    industry: data.industry,
    email: data.email,
    phone: data.phone,
    address: data.address,
    website: data.website,
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
    `UPDATE customers SET ${updates.join(', ')}, updated_at = now() WHERE id = $${params.length} RETURNING *`,
    params
  );
  if (!rows[0]) throw new HttpError(404, 'Customer not found');
  return rows[0];
}

async function remove(id) {
  const { rowCount } = await pool.query('DELETE FROM customers WHERE id = $1', [id]);
  if (!rowCount) throw new HttpError(404, 'Customer not found');
}

module.exports = { list, getById, getTimeline, create, update, remove };
