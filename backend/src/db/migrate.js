/**
 * Applies schema.sql to the configured database. Idempotent (uses IF NOT EXISTS).
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function migrate() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  try {
    await pool.query(sql);
    console.log('Migration applied successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

migrate();
