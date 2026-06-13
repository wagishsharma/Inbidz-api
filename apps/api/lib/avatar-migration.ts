import {
  getAvatarKey,
  getPublicUrl,
  isR2Configured,
  uploadObject,
} from './r2';

const inFlight = new Map<string, Promise<string | null>>();

function legacyUploadBases(): string[] {
  const bases = [
    process.env.AUTH_LEGACY_UPLOADS_BASE_URL,
    process.env.CREATOR_MANAGER_ORG_URL,
    process.env.NEXT_PUBLIC_ORG_URL,
    process.env.AUTH_LOGIN_APP_URL,
    'https://www.inbidz.org',
    'https://inbidz.org',
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.replace(/\/$/, ''));

  return [...new Set(bases)];
}

function r2PublicBase(): string | null {
  return process.env.R2_PUBLIC_URL?.replace(/\/$/, '') ?? null;
}

/** True when avatar is stored on the legacy login/org site rather than R2. */
export function needsAvatarMigration(url: string): boolean {
  const value = url.trim();
  if (!value) return false;

  const r2Base = r2PublicBase();
  if (r2Base && value.startsWith(r2Base)) return false;

  if (value.startsWith('/api/uploads/') || value.startsWith('/uploads/')) return true;
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  if (value.includes('localhost') || value.includes('127.0.0.1')) return true;

  for (const base of legacyUploadBases()) {
    if (value.startsWith(`${base}/api/uploads/`)) return true;
    if (value.startsWith(`${base}/uploads/`)) return true;
  }

  return false;
}

/** Turn a legacy relative path into an absolute URL for clients (fallback when R2 migration fails). */
export function absolutizeLegacyAvatarUrl(url: string): string {
  const value = url.trim();
  if (!value) return value;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.startsWith('//')) return `https:${value}`;

  const path = value.startsWith('/') ? value : `/${value}`;
  const base = legacyUploadBases()[0] ?? 'https://www.inbidz.org';
  return `${base}${path}`;
}

function legacyFetchCandidates(url: string): string[] {
  const value = url.trim();
  if (value.startsWith('http://') || value.startsWith('https://')) return [value];
  if (value.startsWith('//')) return [`https:${value}`];

  const path = value.startsWith('/') ? value : `/${value}`;
  return legacyUploadBases().map((base) => `${base}${path}`);
}

function extensionFromContentType(contentType: string | null, url: string): string {
  const type = contentType?.split(';')[0]?.trim().toLowerCase();
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/gif') return 'gif';
  if (type === 'image/jpeg' || type === 'image/jpg') return 'jpg';

  const match = url.match(/\.([a-z0-9]{2,4})(?:\?|$)/i);
  if (match) return match[1].toLowerCase();
  return 'jpg';
}

async function fetchLegacyAvatar(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  for (const fetchUrl of legacyFetchCandidates(url)) {
    try {
      const res = await fetch(fetchUrl, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) continue;
      const contentType = res.headers.get('content-type') ?? 'image/jpeg';
      if (!contentType.startsWith('image/')) continue;
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length === 0) continue;
      return { buffer, contentType };
    } catch {
      // try next base URL
    }
  }
  return null;
}

/** Download a legacy avatar and store it in R2. Returns the public R2 URL. */
export async function migrateLegacyAvatarToR2(
  userId: string,
  avatarUrl: string
): Promise<string | null> {
  const trimmed = avatarUrl.trim();
  if (!trimmed || !needsAvatarMigration(trimmed)) return trimmed || null;
  if (!isR2Configured()) return absolutizeLegacyAvatarUrl(trimmed);

  const existing = inFlight.get(`${userId}:${trimmed}`);
  if (existing) return existing;

  const work = (async () => {
    const fetched = await fetchLegacyAvatar(trimmed);
    if (!fetched) {
      console.warn('[avatar-migration] fetch failed', userId, trimmed);
      return absolutizeLegacyAvatarUrl(trimmed);
    }

    const ext = extensionFromContentType(fetched.contentType, trimmed);
    const key = getAvatarKey(userId, ext);
    await uploadObject(key, fetched.buffer, fetched.contentType.split(';')[0] || 'image/jpeg');
    return getPublicUrl(key);
  })().finally(() => {
    inFlight.delete(`${userId}:${trimmed}`);
  });

  inFlight.set(`${userId}:${trimmed}`, work);
  return work;
}

/** Pick the best avatar URL for a profile row, migrating legacy sources to R2 when possible. */
export async function resolveAvatarForProfile(
  userId: string,
  jwtAvatar: string | null | undefined,
  existingDbAvatar: string | null | undefined
): Promise<string | null> {
  const jwtValue = jwtAvatar?.trim() || null;
  const dbValue = existingDbAvatar?.trim() || null;

  // Prefer JWT on sign-in/register, but never downgrade an already-migrated R2 URL.
  let candidate = jwtValue || dbValue;
  if (jwtValue && dbValue && needsAvatarMigration(jwtValue) && !needsAvatarMigration(dbValue)) {
    candidate = dbValue;
  }

  if (!candidate) return null;
  if (!needsAvatarMigration(candidate)) return candidate;

  const migrated = await migrateLegacyAvatarToR2(userId, candidate);
  return migrated ?? absolutizeLegacyAvatarUrl(candidate);
}

/** Resolve avatar URLs for API responses (handles unmigrated relative paths). */
export function resolveAvatarUrl(url: string | null | undefined): string | undefined {
  if (!url?.trim()) return undefined;
  const value = url.trim();
  if (needsAvatarMigration(value)) return absolutizeLegacyAvatarUrl(value);
  return value;
}
