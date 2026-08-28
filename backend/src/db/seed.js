/**
 * Seeds demo data: three users (admin/sales/support), a customer, a lead,
 * an opportunity and an activity. Run with `node src/db/seed.js` after
 * `npm run migrate`.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const PASSWORD = 'Password123!';

async function seed() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const users = [
      { name: 'Ada Admin', email: 'admin@crm.test', role: 'admin' },
      { name: 'Sam Sales', email: 'sales@crm.test', role: 'sales' },
      { name: 'Sue Support', email: 'support@crm.test', role: 'support' },
    ];

    const userIds = {};
    for (const u of users) {
      const { rows } = await client.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
         RETURNING id, role`,
        [u.name, u.email, passwordHash, u.role]
      );
      userIds[u.role] = rows[0].id;
    }

    const { rows: customerRows } = await client.query(
      `INSERT INTO customers (company_name, industry, email, phone, owner_id)
       VALUES ('Acme Corp', 'Manufacturing', 'contact@acme.test', '+1-555-0100', $1)
       RETURNING id`,
      [userIds.sales]
    );
    const customerId = customerRows[0].id;

    const { rows: leadRows } = await client.query(
      `INSERT INTO leads (first_name, last_name, email, company, source, status, score, owner_id)
       VALUES ('Jane', 'Prospect', 'jane.prospect@example.com', 'Globex', 'website', 'qualified', 75, $1)
       RETURNING id`,
      [userIds.sales]
    );
    const leadId = leadRows[0].id;

    const { rows: oppRows } = await client.query(
      `INSERT INTO opportunities (name, customer_id, lead_id, stage, amount, probability, expected_close_date, owner_id)
       VALUES ('Acme Corp - Annual License', $1, $2, 'proposal', 25000, 60, CURRENT_DATE + INTERVAL '30 days', $3)
       RETURNING id`,
      [customerId, leadId, userIds.sales]
    );
    const opportunityId = oppRows[0].id;

    await client.query(
      `INSERT INTO activities (type, subject, notes, due_date, customer_id, opportunity_id, owner_id)
       VALUES ('task', 'Follow up on proposal', 'Send updated pricing sheet', now() + INTERVAL '2 days', $1, $2, $3)`,
      [customerId, opportunityId, userIds.sales]
    );

    await client.query(
      `INSERT INTO support_cases (subject, description, status, priority, customer_id, assignee_id)
       VALUES ('Login issue', 'Customer cannot access the portal', 'open', 'high', $1, $2)`,
      [customerId, userIds.support]
    );

    await client.query('COMMIT');
    console.log('Seed complete. Demo users (password: Password123!):');
    users.forEach((u) => console.log(`  - ${u.email} (${u.role})`));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
