import { createHash, randomUUID } from 'crypto';
import type { AccessTokenPayload } from './auth-jwt';
import { getAvatarUrlFromPayload } from './auth-jwt';
import { executeOrgQuery, executeQuery, isOrgDbConfigured } from './database';
import { getPublicUrl, isR2Configured, objectExists, uploadObject } from './r2';

type OrgArtistRow = {
  username: string | null;
  artist_name: string | null;
};

function orgPublicBase(): string {
  return (process.env.ORG_PUBLIC_URL || 'https://www.inbidz.org').replace(/\/$/, '');
}

function r2PublicBase(): string | null {
  const base = process.env.R2_PUBLIC_URL?.trim();
  return base ? base.replace(/\/$/, '') : null;
}

function normalizeUsername(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase().slice(0, 50);
}

function extensionFrom(contentType: string | null, sourceUrl: string): string {
  const fromUrl = sourceUrl.match(/\.([a-z0-9]{2,5})(?:\?|$)/i)?.[1]?.toLowerCase();
  if (fromUrl && ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic'].includes(fromUrl)) {
    return fromUrl === 'jpeg' ? 'jpg' : fromUrl;
  }
  if (contentType?.includes('png')) return 'png';
  if (contentType?.includes('webp')) return 'webp';
  if (contentType?.includes('gif')) return 'gif';
  return 'jpg';
}

/** Absolute URL for org-hosted uploads (`/api/uploads/...`). */
export function resolveOrgAssetUrl(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('/')) return `${orgPublicBase()}${trimmed}`;
  return null;
}

export async function loadOrgArtistProfile(userId: string): Promise<OrgArtistRow | null> {
  try {
    const rows = await executeOrgQuery<OrgArtistRow[]>(
      `SELECT ap.username, ap.artist_name
       FROM artist_profiles ap
       WHERE ap.user_id = ?
       LIMIT 1`,
      [userId]
    );
    if (rows[0]) return rows[0];

    // Artist row may not exist yet; still pick up auth_users.name for display.
    const users = await executeOrgQuery<{ name: string | null }[]>(
      `SELECT name FROM auth_users WHERE id = ? LIMIT 1`,
      [userId]
    );
    const name = users[0]?.name?.trim();
    if (!name) return null;
    return { username: null, artist_name: name };
  } catch (e) {
    if (isOrgDbConfigured()) {
      console.warn('[org-profile-sync] org DB read failed for user', userId, e);
    }
    return null;
  }
}

export async function pickUsername(
  userId: string,
  orgUsername: string | null | undefined,
  email: string
): Promise<string> {
  const fromOrg = orgUsername?.trim() ? normalizeUsername(orgUsername) : '';
  if (fromOrg.length >= 2) {
    const clash = await executeQuery<{ user_id: string }[]>(
      'SELECT user_id FROM app_profiles WHERE username = ? LIMIT 1',
      [fromOrg]
    );
    if (clash.length === 0 || clash[0].user_id === userId) return fromOrg;
  }

  const baseUsername =
    email.split('@')[0]?.replace(/[^a-z0-9_]/gi, '').slice(0, 20) ||
    `user${userId.slice(0, 8)}`;
  let username = baseUsername.toLowerCase();
  let attempt = 0;
  while (attempt < 5) {
    const clash = await executeQuery<{ user_id: string }[]>(
      'SELECT user_id FROM app_profiles WHERE username = ? LIMIT 1',
      [username]
    );
    if (clash.length === 0 || clash[0].user_id === userId) return username;
    username = `${baseUsername}${Math.floor(Math.random() * 9999)}`.toLowerCase();
    attempt++;
  }
  return `${baseUsername}${randomUUID().slice(0, 6)}`.toLowerCase();
}

export type MirrorOrgAssetOptions = {
  fetchTimeoutMs?: number;
  retries?: number;
  /** Suppress per-asset console warnings (bulk seed). */
  quiet?: boolean;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Mirror an org-hosted asset to R2; returns public URL or absolute org URL as fallback. */
export async function mirrorOrgAssetToR2(
  objectKey: string,
  rawUrl: string | null | undefined,
  options: MirrorOrgAssetOptions = {}
): Promise<{ publicUrl: string; buffer?: Buffer; contentType?: string; mirrored: boolean } | null> {
  const sourceUrl = resolveOrgAssetUrl(rawUrl);
  if (!sourceUrl) return null;

  const r2Base = r2PublicBase();
  if (r2Base && rawUrl?.startsWith(r2Base)) {
    return { publicUrl: rawUrl, mirrored: true };
  }

  if (!isR2Configured()) return { publicUrl: sourceUrl, mirrored: false };

  const sourceHash = createHash('sha256').update(sourceUrl).digest('hex').slice(0, 16);
  const extGuess = extensionFrom(null, sourceUrl);
  const keyGuess = `${objectKey}/${sourceHash}.${extGuess}`;

  if (await objectExists(keyGuess)) {
    return { publicUrl: getPublicUrl(keyGuess), mirrored: true };
  }

  const timeoutMs = options.fetchTimeoutMs ?? 20_000;
  const maxAttempts = (options.retries ?? 0) + 1;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) {
        if (!options.quiet) {
          console.warn('[org-profile-sync] asset fetch failed', res.status, sourceUrl);
        }
        return { publicUrl: sourceUrl, mirrored: false };
      }

      const contentType = res.headers.get('content-type') || 'image/jpeg';
      const ext = extensionFrom(contentType, sourceUrl);
      const key = `${objectKey}/${sourceHash}.${ext}`;

      if (key !== keyGuess && (await objectExists(key))) {
        return { publicUrl: getPublicUrl(key), mirrored: true };
      }

      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length === 0) return { publicUrl: sourceUrl, mirrored: false };
      const mime = contentType.split(';')[0]?.trim() || 'image/jpeg';
      await uploadObject(key, buffer, mime);
      return { publicUrl: getPublicUrl(key), buffer, contentType: mime, mirrored: true };
    } catch (e) {
      lastError = e;
      if (attempt < maxAttempts) {
        await sleep(1500 * attempt);
      }
    }
  }

  if (!options.quiet) {
    console.warn('[org-profile-sync] asset mirror failed', sourceUrl, lastError);
  }
  return { publicUrl: sourceUrl, mirrored: false };
}

/** Mirror org profile photo to R2; returns public URL or absolute org URL as fallback. */
export async function mirrorAvatarToR2(
  userId: string,
  payload: AccessTokenPayload
): Promise<string | null> {
  const raw = getAvatarUrlFromPayload(payload);
  const mirrored = await mirrorOrgAssetToR2(`avatars/${userId}`, raw);
  return mirrored?.publicUrl ?? null;
}

export function resolveDisplayName(
  payload: AccessTokenPayload,
  orgArtistName: string | null | undefined,
  usernameFallback: string
): string {
  const fromOrg = orgArtistName?.trim();
  if (fromOrg) return fromOrg.slice(0, 100);
  const fromJwt = payload.name?.trim();
  if (fromJwt) return fromJwt.slice(0, 100);
  return usernameFallback;
}
