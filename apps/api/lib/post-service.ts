import { randomUUID } from 'crypto';
import type { RowDataPacket } from 'mysql2';
import { executeQuery, sqlLimitOffset, withConnection, toMysqlDatetime } from './database';
import {
  mapCommerce,
  mapMedia,
  mapPost,
  mapProfile,
  PROFILE_SELECT,
} from './post-mapper';
import { getOrCreateShortUrl } from './share-service';
import { resolveMediaUrl } from './post-mapper';

function sanitizePublicUrl(publicUrl: string | undefined, r2Key: string): string | null {
  return resolveMediaUrl(publicUrl, r2Key);
}

export async function fetchPostById(
  postId: string,
  viewerId?: string
): Promise<ReturnType<typeof mapPost> | null> {
  const posts = await executeQuery<(RowDataPacket & {
    id: string;
    user_id: string;
    caption: string | null;
    post_type: 'photo' | 'video' | 'carousel';
    commerce_mode: import('@inbidz/shared').CommerceMode;
    status: string;
    like_count: number;
    comment_count: number;
    share_count: number;
    created_at: string;
    updated_at: string;
  })[]>('SELECT * FROM posts WHERE id = ? LIMIT 1', [postId]);

  if (posts.length === 0) return null;
  const post = posts[0];

  const profiles = await executeQuery<(RowDataPacket & {
    user_id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    bio: string | null;
    is_seller: number;
    shop_name: string | null;
  })[]>(`SELECT ${PROFILE_SELECT.replace('p.', '')} FROM app_profiles p WHERE user_id = ?`, [
    post.user_id,
  ]);

  const followerRows = await executeQuery<{ c: number }[]>(
    'SELECT COUNT(*) as c FROM app_follows WHERE following_id = ?',
    [post.user_id]
  );
  const followingRows = await executeQuery<{ c: number }[]>(
    'SELECT COUNT(*) as c FROM app_follows WHERE follower_id = ?',
    [post.user_id]
  );

  const author = mapProfile(
    profiles[0] ?? {
      user_id: post.user_id,
      username: 'user',
      display_name: 'User',
      avatar_url: null,
      bio: null,
      is_seller: 0,
      shop_name: null,
    },
    followerRows[0]?.c ?? 0,
    followingRows[0]?.c ?? 0
  );

  const mediaRows = await executeQuery<(RowDataPacket & {
    id: string;
    post_id: string;
    media_type: 'photo' | 'video';
    r2_key: string;
    public_url: string | null;
    hls_url: string | null;
    width: number;
    height: number;
    duration: number | null;
    order_index: number;
  })[]>('SELECT * FROM post_media WHERE post_id = ? ORDER BY order_index ASC', [postId]);

  const commerceRows = await executeQuery<(RowDataPacket & {
    post_id: string;
    price: number | null;
    currency: string;
    inventory: number;
    sold_count: number;
    auction_start: string | null;
    auction_end: string | null;
    reserve_price: number | null;
    min_bid_increment: number | null;
    current_bid: number | null;
    bid_count: number;
  })[]>('SELECT * FROM post_commerce WHERE post_id = ? LIMIT 1', [postId]);

  let isLiked = false;
  if (viewerId) {
    const likes = await executeQuery<{ post_id: string }[]>(
      'SELECT post_id FROM post_likes WHERE post_id = ? AND user_id = ? LIMIT 1',
      [postId, viewerId]
    );
    isLiked = likes.length > 0;
  }

  const { shortUrl } = await getOrCreateShortUrl(postId);

  return mapPost(
    post,
    author,
    mediaRows.map(mapMedia),
    commerceRows[0] ? mapCommerce(commerceRows[0]) : undefined,
    isLiked,
    shortUrl
  );
}

async function hydratePosts(
  rows: (RowDataPacket & { id: string })[],
  viewerId?: string
): Promise<ReturnType<typeof mapPost>[]> {
  const result: ReturnType<typeof mapPost>[] = [];
  for (const row of rows) {
    const post = await fetchPostById(row.id, viewerId);
    if (post) result.push(post);
  }
  return result;
}

export async function fetchDiscoverFeedPosts(
  viewerId?: string,
  limit = 20,
  offset = 0
): Promise<ReturnType<typeof mapPost>[]> {
  let query = `
    SELECT p.* FROM posts p
    LEFT JOIN post_commerce pc ON pc.post_id = p.id
    WHERE p.status = 'published'
  `;
  const params: (string | number)[] = [];

  if (viewerId) {
    query += ` AND p.user_id != ?`;
    params.push(viewerId);
    query += `
      ORDER BY (
        SELECT COUNT(*) FROM app_follows f WHERE f.follower_id = ? AND f.following_id = p.user_id
      ) DESC,
      (p.commerce_mode != 'none') DESC,
      (
        pc.auction_end IS NOT NULL
        AND pc.auction_end > NOW()
        AND pc.auction_end < DATE_ADD(NOW(), INTERVAL 1 DAY)
      ) DESC,
      (p.like_count + p.share_count) DESC,
      p.created_at DESC
    `;
    params.push(viewerId);
  } else {
    query += `
      ORDER BY
        (p.commerce_mode != 'none') DESC,
        (
          pc.auction_end IS NOT NULL
          AND pc.auction_end > NOW()
          AND pc.auction_end < DATE_ADD(NOW(), INTERVAL 1 DAY)
        ) DESC,
        (p.like_count + p.share_count) DESC,
        p.created_at DESC
    `;
  }

  query += sqlLimitOffset(limit, offset);

  const posts = await executeQuery<(RowDataPacket & { id: string })[]>(query, params);
  return hydratePosts(posts, viewerId);
}

export async function fetchFollowingFeedPosts(
  viewerId: string,
  limit = 20,
  offset = 0
): Promise<ReturnType<typeof mapPost>[]> {
  const query = `
    SELECT p.* FROM posts p
    INNER JOIN app_follows f ON f.following_id = p.user_id AND f.follower_id = ?
    WHERE p.status = 'published' AND p.user_id != ?
    ORDER BY p.created_at DESC
    ${sqlLimitOffset(limit, offset)}
  `;
  const posts = await executeQuery<(RowDataPacket & { id: string })[]>(query, [
    viewerId,
    viewerId,
  ]);
  return hydratePosts(posts, viewerId);
}

/** @deprecated Use fetchDiscoverFeedPosts */
export async function fetchFeedPosts(
  viewerId?: string,
  limit = 20,
  offset = 0
): Promise<ReturnType<typeof mapPost>[]> {
  return fetchDiscoverFeedPosts(viewerId, limit, offset);
}

export async function fetchProfileByUserId(
  userId: string,
  viewerId?: string
): Promise<(ReturnType<typeof mapProfile> & { isFollowing?: boolean; postCount: number }) | null> {
  const profiles = await executeQuery<(RowDataPacket & {
    user_id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    bio: string | null;
    is_seller: number;
    shop_name: string | null;
  })[]>(`SELECT ${PROFILE_SELECT.replace('p.', '')} FROM app_profiles p WHERE user_id = ?`, [
    userId,
  ]);

  if (profiles.length === 0) return null;

  const followerRows = await executeQuery<{ c: number }[]>(
    'SELECT COUNT(*) as c FROM app_follows WHERE following_id = ?',
    [userId]
  );
  const followingRows = await executeQuery<{ c: number }[]>(
    'SELECT COUNT(*) as c FROM app_follows WHERE follower_id = ?',
    [userId]
  );
  const postCountRows = await executeQuery<{ c: number }[]>(
    "SELECT COUNT(*) as c FROM posts WHERE user_id = ? AND status = 'published'",
    [userId]
  );

  const profile = mapProfile(
    profiles[0],
    followerRows[0]?.c ?? 0,
    followingRows[0]?.c ?? 0
  );

  let isFollowing: boolean | undefined;
  if (viewerId && viewerId !== userId) {
    const followRows = await executeQuery<{ follower_id: string }[]>(
      'SELECT follower_id FROM app_follows WHERE follower_id = ? AND following_id = ? LIMIT 1',
      [viewerId, userId]
    );
    isFollowing = followRows.length > 0;
  }

  return {
    ...profile,
    isFollowing,
    postCount: postCountRows[0]?.c ?? 0,
  };
}

export async function fetchPostsByUserId(
  userId: string,
  viewerId?: string,
  limit = 30,
  offset = 0
): Promise<ReturnType<typeof mapPost>[]> {
  const query = `
    SELECT p.* FROM posts p
    WHERE p.user_id = ? AND p.status = 'published'
    ORDER BY p.created_at DESC
    ${sqlLimitOffset(limit, offset)}
  `;
  const posts = await executeQuery<(RowDataPacket & { id: string })[]>(query, [userId]);
  return hydratePosts(posts, viewerId);
}

export async function createPost(
  userId: string,
  input: {
    caption: string;
    postType: 'photo' | 'video' | 'carousel';
    commerceMode: import('@inbidz/shared').CommerceMode;
    media: Array<{
      type: 'photo' | 'video';
      r2Key: string;
      publicUrl?: string;
      thumbnailR2Key?: string;
      thumbnailPublicUrl?: string;
      width: number;
      height: number;
      duration?: number;
      orderIndex: number;
    }>;
    commerce?: {
      price?: number;
      currency: string;
      inventory: number;
      auctionStart?: string;
      auctionEnd?: string;
      reservePrice?: number;
      minBidIncrement?: number;
    };
  }
): Promise<string> {
  const postId = randomUUID();
  const hasCommerce = input.commerceMode !== 'none';

  if (hasCommerce) {
    const shop = await executeQuery<{ shop_setup_complete: number }[]>(
      'SELECT shop_setup_complete FROM app_profiles WHERE user_id = ? LIMIT 1',
      [userId]
    );
    if (shop.length === 0 || !shop[0].shop_setup_complete) {
      throw new Error('SHOP_NOT_SETUP');
    }
  }

  await withConnection(async (conn) => {
    await conn.execute(
      `INSERT INTO posts (id, user_id, caption, post_type, commerce_mode, status)
       VALUES (?, ?, ?, ?, ?, 'published')`,
      [postId, userId, input.caption, input.postType, input.commerceMode]
    );

    for (const m of input.media) {
      const mediaId = randomUUID();
      const publicUrl = sanitizePublicUrl(m.publicUrl, m.r2Key);
      const thumbnailUrl =
        m.thumbnailR2Key ?
          sanitizePublicUrl(m.thumbnailPublicUrl, m.thumbnailR2Key)
        : null;
      await conn.execute(
        `INSERT INTO post_media (id, post_id, media_type, r2_key, public_url, thumbnail_r2_key, thumbnail_url, width, height, duration, order_index)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mediaId,
          postId,
          m.type,
          m.r2Key,
          publicUrl,
          m.thumbnailR2Key ?? null,
          thumbnailUrl,
          m.width,
          m.height,
          m.duration ?? null,
          m.orderIndex,
        ]
      );
    }

    if (hasCommerce && input.commerce) {
      await conn.execute(
        `INSERT INTO post_commerce (post_id, price, currency, inventory, auction_start, auction_end, reserve_price, min_bid_increment)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          postId,
          input.commerce.price ?? null,
          input.commerce.currency,
          input.commerce.inventory,
          toMysqlDatetime(input.commerce.auctionStart),
          toMysqlDatetime(input.commerce.auctionEnd),
          input.commerce.reservePrice ?? null,
          input.commerce.minBidIncrement ?? 100,
        ]
      );
    }
  });

  return postId;
}
