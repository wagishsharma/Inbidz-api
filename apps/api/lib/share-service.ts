import { randomUUID } from 'crypto';
import { generateShortCode, getPostWhatsAppMessage } from '@inbidz/shared';
import type { ShareMomentType } from '@inbidz/shared';
import { executeQuery } from './database';

export function getShortUrlBase(): string {
  return (process.env.SHORT_URL_BASE || process.env.APP_PUBLIC_URL || 'http://localhost:8081/p').replace(/\/$/, '');
}

export async function getOrCreateShortUrl(
  postId: string,
  referrerUserId?: string
): Promise<{ shortCode: string; shortUrl: string }> {
  const existing = await executeQuery<{ short_code: string }[]>(
    'SELECT short_code FROM post_short_urls WHERE post_id = ? AND referrer_user_id <=> ? LIMIT 1',
    [postId, referrerUserId ?? null]
  );

  if (existing.length > 0) {
    const shortCode = existing[0].short_code;
    return { shortCode, shortUrl: `${getShortUrlBase()}/${shortCode}` };
  }

  let shortCode = generateShortCode(6);
  for (let i = 0; i < 5; i++) {
    const clash = await executeQuery<{ id: string }[]>(
      'SELECT id FROM post_short_urls WHERE short_code = ? LIMIT 1',
      [shortCode]
    );
    if (clash.length === 0) break;
    shortCode = generateShortCode(6);
  }

  await executeQuery(
    'INSERT INTO post_short_urls (id, short_code, post_id, referrer_user_id) VALUES (?, ?, ?, ?)',
    [randomUUID(), shortCode, postId, referrerUserId ?? null]
  );

  return { shortCode, shortUrl: `${getShortUrlBase()}/${shortCode}` };
}

export async function resolveShortCode(shortCode: string): Promise<string | null> {
  const rows = await executeQuery<{ post_id: string }[]>(
    'SELECT post_id FROM post_short_urls WHERE short_code = ? LIMIT 1',
    [shortCode]
  );
  if (rows.length === 0) return null;
  await executeQuery(
    'UPDATE post_short_urls SET click_count = click_count + 1, last_clicked_at = NOW() WHERE short_code = ?',
    [shortCode]
  );
  return rows[0].post_id;
}

export async function createShareMoment(
  postId: string,
  userId: string,
  momentType: ShareMomentType,
  metadata?: Record<string, unknown>
): Promise<{ id: string; shortUrl: string; whatsappMessage: string } | null> {
  const existing = await executeQuery<{ id: string }[]>(
    'SELECT id FROM share_moments WHERE post_id = ? AND moment_type = ? AND user_id = ? LIMIT 1',
    [postId, momentType, userId]
  );
  if (existing.length > 0) return null;

  const posts = await executeQuery<{ caption: string | null }[]>(
    'SELECT caption FROM posts WHERE id = ? LIMIT 1',
    [postId]
  );
  if (posts.length === 0) return null;

  const title = (posts[0].caption || 'My post').slice(0, 80);
  const { shortUrl } = await getOrCreateShortUrl(postId, userId);
  const bidAmount = metadata?.bidAmount as number | undefined;
  const whatsappMessage = getPostWhatsAppMessage(momentType, title, shortUrl, { bidAmount });

  const id = randomUUID();
  const shareImageUrl = `/api/share-image?post=${postId}&template=${momentType}&url=${encodeURIComponent(shortUrl)}`;

  await executeQuery(
    `INSERT INTO share_moments (id, post_id, user_id, moment_type, share_image_url, metadata)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, postId, userId, momentType, shareImageUrl, metadata ? JSON.stringify(metadata) : null]
  );

  return { id, shortUrl, whatsappMessage };
}

export async function markShareMomentShared(
  momentId: string,
  platform: string
): Promise<void> {
  await executeQuery(
    'UPDATE share_moments SET shared = 1, share_platform = ?, share_prompt_shown = 1 WHERE id = ?',
    [platform, momentId]
  );
  const rows = await executeQuery<{ post_id: string }[]>(
    'SELECT post_id FROM share_moments WHERE id = ? LIMIT 1',
    [momentId]
  );
  if (rows.length > 0) {
    await executeQuery('UPDATE posts SET share_count = share_count + 1 WHERE id = ?', [
      rows[0].post_id,
    ]);
  }
}
