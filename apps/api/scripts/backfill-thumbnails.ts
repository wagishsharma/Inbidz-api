/**
 * Backfill missing video thumbnails for existing posts.
 * Usage: npm run backfill-thumbnails -- [--limit=50]
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { ensureVideoThumbnail } from '../lib/video-thumbnail-service';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  dotenv.config({ path: path.join(__dirname, '../.env.local') });
  dotenv.config({ path: path.join(__dirname, '../.env') });

  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 100;

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'inbidz_app',
    port: parseInt(process.env.DB_PORT || '3306', 10),
  });

  const [rows] = (await connection.query(
    `SELECT pm.id, pm.r2_key, pm.public_url, p.user_id
     FROM post_media pm
     INNER JOIN posts p ON p.id = pm.post_id
     WHERE pm.media_type = 'video'
       AND (pm.thumbnail_r2_key IS NULL OR pm.thumbnail_r2_key = '')
     ORDER BY pm.id ASC
     LIMIT ?`,
    [limit]
  )) as [
    Array<{
      id: string;
      r2_key: string;
      public_url: string | null;
      user_id: string;
    }>,
    unknown,
  ];

  await connection.end();

  if (rows.length === 0) {
    console.log('No videos missing thumbnails.');
    return;
  }

  let ok = 0;
  let failed = 0;

  for (const row of rows) {
    process.stdout.write(`Thumbnail ${row.id} (${row.r2_key})... `);
    try {
      const thumb = await ensureVideoThumbnail(row.id, row.user_id, row.r2_key, row.public_url);
      if (thumb) {
        ok += 1;
        console.log('ok');
      } else {
        failed += 1;
        console.log('skipped (ffmpeg unavailable or extract failed)');
      }
    } catch (err) {
      failed += 1;
      console.log('error', err instanceof Error ? err.message : err);
    }
  }

  console.log(`Done. Generated ${ok}, failed/skipped ${failed}.`);
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
