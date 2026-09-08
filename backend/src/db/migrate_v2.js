const path = require('path');
const fs = require('fs');
require('dotenv').config();
const pool = require('../config/db');

async function migrateV2() {
  const sql = fs.readFileSync(path.join(__dirname, 'migrate_v2.sql'), 'utf8');
  await pool.query(sql);
  console.log('V2 migration applied successfully');
  await pool.end();
}

migrateV2().catch((err) => { console.error(err); process.exit(1); });
