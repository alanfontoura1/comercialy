require('../config/env');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const migrationsDir = path.join(__dirname, 'migrations');

  const files = ['init.sql', 'schema_v2.sql'];

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    console.log(`[Migrate] Running ${file}...`);
    const sql = fs.readFileSync(filePath, 'utf8');
    await pool.query(sql);
    console.log(`[Migrate] ${file} complete.`);
  }

  console.log('[Migrate] All migrations complete.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('[Migrate] Migration failed:', err.message);
  process.exit(1);
});
