/**
 * Creates the PostgreSQL database defined by DATABASE_URL if it does not exist.
 * Usage: npm run db:create
 *
 * Environment variables (see .env):
 *  - DATABASE_URL : full connection string, incl. target database name
 *  - PGSSL        : "true" to use SSL, anything else = no SSL
 *  - PG_ADMIN_DB  : database to connect to for admin tasks (default: postgres)
 */
require('dotenv').config();

const { Client } = require('pg');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  // Parse the URL so we can connect to the admin database first.
  const parsed = new URL(url);
  const dbName = parsed.pathname.replace(/^\//, '');
  if (!dbName) {
    console.error('DATABASE_URL does not contain a database name');
    process.exit(1);
  }

  const adminDbName = process.env.PG_ADMIN_DB || 'postgres';
  const adminUrl = new URL(url);
  adminUrl.pathname = `/${adminDbName}`;

  const useSsl = /true/i.test(process.env.PGSSL || '');
  const client = new Client({
    connectionString: adminUrl.toString(),
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await client.connect();
    const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (exists.rowCount > 0) {
      console.log(`Database "${dbName}" already exists. Nothing to do.`);
    } else {
      // Identifier cannot be parameterized, so validate/quote it.
      const safeName = dbName.replace(/"/g, '""');
      await client.query(`CREATE DATABASE "${safeName}"`);
      console.log(`Database "${dbName}" created.`);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Failed to create database:', err.message);
  process.exit(1);
});
