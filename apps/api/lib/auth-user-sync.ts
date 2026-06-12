import { randomUUID } from 'crypto';
import { generateShortCode } from '@inbidz/shared';
import type { AccessTokenPayload } from './auth-jwt';
import {
  loadOrgArtistProfile,
  mirrorAvatarToR2,
  pickUsername,
  resolveDisplayName,
} from './org-profile-sync';
import { executeQuery } from './database';

export async function upsertProfileFromJwt(payload: AccessTokenPayload): Promise<void> {
  const userId = payload.sub;
  const email = payload.email ?? '';

  const orgProfile = await loadOrgArtistProfile(userId);
  const username = await pickUsername(userId, orgProfile?.username, email);
  const displayName = resolveDisplayName(payload, orgProfile?.artist_name, username);
  const avatarUrl = await mirrorAvatarToR2(userId, payload);

  const existing = await executeQuery<{ user_id: string }[]>(
    'SELECT user_id FROM app_profiles WHERE user_id = ? LIMIT 1',
    [userId]
  );

  if (existing.length === 0) {
    await executeQuery(
      `INSERT INTO app_profiles (user_id, username, display_name, avatar_url, referral_code)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, username, displayName, avatarUrl, generateShortCode(8)]
    );
  } else {
    await executeQuery(
      `UPDATE app_profiles SET
        username = ?,
        display_name = COALESCE(?, display_name),
        avatar_url = COALESCE(?, avatar_url)
       WHERE user_id = ?`,
      [username, displayName, avatarUrl, userId]
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
