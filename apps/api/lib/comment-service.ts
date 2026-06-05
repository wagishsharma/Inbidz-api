import { randomUUID } from 'crypto';
import type { RowDataPacket } from 'mysql2';
import type { PostComment } from '@inbidz/shared';
import { executeQuery, sqlLimitOffset } from './database';
import { mapProfile, PROFILE_SELECT } from './post-mapper';

export async function fetchComments(
  postId: string,
  limit = 50,
  offset = 0
): Promise<PostComment[]> {
  const rows = await executeQuery<
    (RowDataPacket & {
      id: string;
      post_id: string;
      user_id: string;
      body: string;
      created_at: string;
    })[]
  >(
    `SELECT * FROM post_comments WHERE post_id = ? ORDER BY created_at ASC ${sqlLimitOffset(limit, offset)}`,
    [postId]
  );

  const result: PostComment[] = [];
  for (const row of rows) {
    const profiles = await executeQuery<
      (RowDataPacket & {
        user_id: string;
        username: string;
        display_name: string;
        avatar_url: string | null;
        bio: string | null;
        is_seller: number;
        shop_name: string | null;
      })[]
    >(`SELECT ${PROFILE_SELECT.replace('p.', '')} FROM app_profiles p WHERE user_id = ?`, [
      row.user_id,
    ]);

    const author = mapProfile(
      profiles[0] ?? {
        user_id: row.user_id,
        username: 'user',
        display_name: 'User',
        avatar_url: null,
        bio: null,
        is_seller: 0,
        shop_name: null,
      }
    );

    result.push({
      id: row.id,
      postId: row.post_id,
      userId: row.user_id,
      body: row.body,
      createdAt: row.created_at,
      author: {
        id: author.id,
        username: author.username,
        displayName: author.displayName,
        avatarUrl: author.avatarUrl,
      },
    });
  }
  return result;
}

export async function createComment(
  postId: string,
  userId: string,
  body: string
): Promise<PostComment> {
  const postRows = await executeQuery<{ id: string }[]>(
    "SELECT id FROM posts WHERE id = ? AND status = 'published' LIMIT 1",
    [postId]
  );
  if (postRows.length === 0) {
    throw new Error('POST_NOT_FOUND');
  }

  const id = randomUUID();
  await executeQuery(
    'INSERT INTO post_comments (id, post_id, user_id, body) VALUES (?, ?, ?, ?)',
    [id, postId, userId, body]
  );
  await executeQuery('UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?', [
    postId,
  ]);

  const profiles = await executeQuery<
    (RowDataPacket & {
      user_id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
      bio: string | null;
      is_seller: number;
      shop_name: string | null;
    })[]
  >(`SELECT ${PROFILE_SELECT.replace('p.', '')} FROM app_profiles p WHERE user_id = ?`, [userId]);

  const author = mapProfile(
    profiles[0] ?? {
      user_id: userId,
      username: 'user',
      display_name: 'User',
      avatar_url: null,
      bio: null,
      is_seller: 0,
      shop_name: null,
    }
  );

  const rows = await executeQuery<
    (RowDataPacket & { created_at: string })[]
  >('SELECT created_at FROM post_comments WHERE id = ?', [id]);

  return {
    id,
    postId,
    userId,
    body,
    createdAt: rows[0]?.created_at ?? new Date().toISOString(),
    author: {
      id: author.id,
      username: author.username,
      displayName: author.displayName,
      avatarUrl: author.avatarUrl,
    },
  };
}

export async function deleteComment(
  commentId: string,
  userId: string
): Promise<boolean> {
  const rows = await executeQuery<{ post_id: string; user_id: string }[]>(
    'SELECT post_id, user_id FROM post_comments WHERE id = ? LIMIT 1',
    [commentId]
  );
  if (rows.length === 0) return false;
  if (rows[0].user_id !== userId) {
    throw new Error('FORBIDDEN');
  }

  await executeQuery('DELETE FROM post_comments WHERE id = ?', [commentId]);
  await executeQuery(
    'UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = ?',
    [rows[0].post_id]
  );
  return true;
}
