const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function main() {
  require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
  require('dotenv').config({ path: path.join(__dirname, '../.env') });

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'inbidz_app',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    multipleStatements: true,
  });

  const sqlPath = path.join(__dirname, '../migrations/001_initial_schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await connection.query(sql);
  console.log('Migration complete: 001_initial_schema.sql');
  await connection.end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
