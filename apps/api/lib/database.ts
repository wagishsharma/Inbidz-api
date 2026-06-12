import mysql from 'mysql2/promise';

type QueryValues = (string | number | null | Date | boolean | Buffer)[];

type PoolConfig = {
  host: string;
  user: string;
  password: string;
  database: string;
  port: number;
  connectionLimit: number;
};

function appDbConfig(): PoolConfig {
  return {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'inbidz_app',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    connectionLimit: 10,
  };
}

/** Read-only org DB (`inbidz_org`) for login-time profile sync. */
function orgDbConfig(): PoolConfig | null {
  const user = process.env.ORG_DB_USER?.trim();
  const database = process.env.ORG_DB_NAME?.trim();
  if (!user || !database) return null;

  return {
    host: process.env.ORG_DB_HOST?.trim() || process.env.DB_HOST || 'localhost',
    user,
    password: process.env.ORG_DB_PASSWORD ?? '',
    database,
    port: parseInt(process.env.ORG_DB_PORT || process.env.DB_PORT || '3306', 10),
    connectionLimit: 4,
  };
}

let appPool: mysql.Pool | null = null;
let orgPool: mysql.Pool | null = null;
let orgPoolChecked = false;

function poolOptions(config: PoolConfig): mysql.PoolOptions {
  return { ...config, waitForConnections: true, queueLimit: 0, dateStrings: true };
}

function getAppPool(): mysql.Pool {
  if (!appPool) {
    appPool = mysql.createPool(poolOptions(appDbConfig()));
  }
  return appPool;
}

function getOrgPool(): mysql.Pool | null {
  if (orgPoolChecked) return orgPool;
  orgPoolChecked = true;
  const config = orgDbConfig();
  if (!config) return null;
  orgPool = mysql.createPool(poolOptions(config));
  return orgPool;
}

/** True when ORG_DB_USER + ORG_DB_NAME are set (dedicated read-only org connection). */
export function isOrgDbConfigured(): boolean {
  return orgDbConfig() !== null;
}

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
 * App DB (`inbidz_app`) — all commerce/feed writes and reads.
 */
export async function executeQuery<T = unknown>(
  query: string,
  params: QueryValues = []
): Promise<T> {
  const [result] = await getAppPool().query(query, params);
  return result as T;
}

/**
 * Org DB (`inbidz_org`) — read-only login-time sync (`inbidz_org_app`).
 * Falls back to app pool when ORG_DB_* is unset (single-DB local dev).
 */
export async function executeOrgQuery<T = unknown>(
  query: string,
  params: QueryValues = []
): Promise<T> {
  const target = getOrgPool() ?? getAppPool();
  const [result] = await target.query(query, params);
  return result as T;
}

export async function withConnection<T>(
  callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await getAppPool().getConnection();
  try {
    return await callback(connection);
  } finally {
    connection.release();
  }
}

export default getAppPool;
