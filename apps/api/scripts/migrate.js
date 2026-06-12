const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function ensureMigrationsTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function isMigrationApplied(connection, filename) {
  const [rows] = await connection.query(
    'SELECT 1 FROM schema_migrations WHERE filename = ? LIMIT 1',
    [filename]
  );
  return rows.length > 0;
}

/** Infer migrations already applied before schema_migrations existed. */
async function inferMigrationApplied(connection, filename) {
  const hasTable = async (table) => {
    const [rows] = await connection.query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = ?
       LIMIT 1`,
      [table]
    );
    return rows.length > 0;
  };

  const hasColumn = async (table, column) => {
    const [rows] = await connection.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?
       LIMIT 1`,
      [table, column]
    );
    return rows.length > 0;
  };

  switch (filename) {
    case '001_initial_schema.sql':
      return hasTable('posts');
    case '002_media_thumbnails.sql':
      return hasColumn('post_media', 'thumbnail_r2_key');
    case '003_post_comments.sql':
      return hasTable('post_comments');
    case '004_org_seed_tracking.sql':
      return hasTable('org_seed_artworks');
    default:
      return false;
  }
}

async function bootstrapExistingMigrations(connection, files) {
  const [rows] = await connection.query('SELECT COUNT(*) AS c FROM schema_migrations');
  if (Number(rows[0].c) > 0) return;

  for (const file of files) {
    if (await inferMigrationApplied(connection, file)) {
      await connection.query('INSERT IGNORE INTO schema_migrations (filename) VALUES (?)', [
        file,
      ]);
      console.log(`Already applied (bootstrapped): ${file}`);
    }
  }
}

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

  await ensureMigrationsTable(connection);

  const migrationsDir = path.join(__dirname, '../migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  await bootstrapExistingMigrations(connection, files);

  for (const file of files) {
    if (await isMigrationApplied(connection, file)) {
      console.log(`Skipped (already applied): ${file}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    await connection.query(sql);
    await connection.query('INSERT INTO schema_migrations (filename) VALUES (?)', [file]);
    console.log(`Migration complete: ${file}`);
  }

  await connection.end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
