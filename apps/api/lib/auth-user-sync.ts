import { randomUUID } from 'crypto';
import { generateShortCode } from '@inbidz/shared';
import type { AccessTokenPayload } from './auth-jwt';
import { executeQuery } from './database';

export async function upsertProfileFromJwt(payload: AccessTokenPayload): Promise<void> {
  const userId = payload.sub;
  const email = payload.email ?? '';
  const baseUsername = email.split('@')[0]?.replace(/[^a-z0-9_]/gi, '').slice(0, 20) || `user${userId.slice(0, 8)}`;
  const displayName = payload.name ?? baseUsername;

  const existing = await executeQuery<{ user_id: string }[]>(
    'SELECT user_id FROM app_profiles WHERE user_id = ? LIMIT 1',
    [userId]
  );

  if (existing.length === 0) {
    let username = baseUsername.toLowerCase();
    let attempt = 0;
    while (attempt < 5) {
      const clash = await executeQuery<{ user_id: string }[]>(
        'SELECT user_id FROM app_profiles WHERE username = ? LIMIT 1',
        [username]
      );
      if (clash.length === 0) break;
      username = `${baseUsername}${Math.floor(Math.random() * 9999)}`.toLowerCase();
      attempt++;
    }

    await executeQuery(
      `INSERT INTO app_profiles (user_id, username, display_name, referral_code)
       VALUES (?, ?, ?, ?)`,
      [userId, username, displayName, generateShortCode(8)]
    );
  } else {
    await executeQuery(
      'UPDATE app_profiles SET display_name = COALESCE(?, display_name) WHERE user_id = ?',
      [displayName, userId]
    );
  }
}

export async function trackOnboardingEvent(
  userId: string,
  eventType: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await executeQuery(
    'INSERT INTO onboarding_events (id, user_id, event_type, metadata) VALUES (?, ?, ?, ?)',
    [randomUUID(), userId, eventType, metadata ? JSON.stringify(metadata) : null]
  );
}
