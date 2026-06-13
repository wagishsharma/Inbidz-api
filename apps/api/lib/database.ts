import path from 'path';
import mysql from 'mysql2/promise';

// Standalone scripts (migrate, backfill) load env before importing this module.
function loadEnvFiles() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dotenv = require('dotenv') as typeof import('dotenv');
    const root = path.join(__dirname, '..');
    dotenv.config({ path: path.join(root, '.env.local') });
    dotenv.config({ path: path.join(root, '.env') });
  } catch {
    // dotenv optional when Next injects env
  }
}

loadEnvFiles();

function createPool() {
  return mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'inbidz_app',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true,
  });
}

let pool: mysql.Pool | null = null;

function getPool(): mysql.Pool {
  if (!pool) pool = createPool();
  return pool;
}

type QueryValues = (string | number | null | Date | boolean | Buffer)[];

/** Clamp pagination inputs to safe integers. */
export function clampPagination(
  limit?: number | string,
  offset?: number | string,
  maxLimit = 50
): { limit: number; offset: number } {
  return {
    limit: Math.min(Math.max(Number(limit) || 20, 1), maxLimit),
    offset: Math.max(Number(offset) || 0, 0),
  };
}

/**
 * LIMIT/OFFSET as SQL literals — MySQL prepared statements (pool.execute) reject bound LIMIT params.
 */
export function sqlLimitOffset(limit?: number | string, offset?: number | string, maxLimit = 50): string {
  const { limit: safeLimit, offset: safeOffset } = clampPagination(limit, offset, maxLimit);
  return ` LIMIT ${safeLimit} OFFSET ${safeOffset}`;
}

/** ISO / Date → MySQL DATETIME string (`YYYY-MM-DD HH:MM:SS`, UTC). */
export function toMysqlDatetime(value?: string | Date | null): string | null {
  if (value == null || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Run a parameterized query. Uses pool.query (text protocol) so LIMIT/OFFSET placeholders work
 * when inlined via sqlLimitOffset, and avoids ER_WRONG_ARGUMENTS from pool.execute.
 */
export async function executeQuery<T = unknown>(
  query: string,
  params: QueryValues = []
): Promise<T> {
  const [result] = await getPool().query(query, params);
  return result as T;
}

export async function withConnection<T>(
  callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await getPool().getConnection();
  try {
    return await callback(connection);
  } finally {
    connection.release();
  }
}

export default getPool;
