import { createHash, randomUUID } from 'crypto';
import sharp from 'sharp';
import { generateShortCode } from '@inbidz/shared';
import { executeOrgQuery, executeQuery, isOrgDbConfigured } from './database';
import { mirrorOrgAssetToR2, pickUsername, resolveOrgAssetUrl } from './org-profile-sync';

const SEED_MIRROR_OPTS = {
  fetchTimeoutMs: 90_000,
  retries: 2,
  quiet: true,
} as const;

export type SeedOrgFeedOptions = {
  maxArtists?: number;
  artworksPerArtist?: number;
  dryRun?: boolean;
  /** Store www.inbidz.org image URLs instead of mirroring to R2 (fast cold-start). */
  orgUrlsOnly?: boolean;
};

export type SeedOrgFeedResult = {
  artistsConsidered: number;
  profilesCreated: number;
  profilesSkipped: number;
  postsCreated: number;
  artworksSkipped: number;
  mirrorFallbacks: number;
  dryRun: boolean;
  orgUrlsOnly: boolean;
};

type OrgArtistRow = {
  user_id: number;
  email: string;
  name: string;
  profile_photo_url: string | null;
  username: string | null;
  artist_name: string | null;
  specialization: string | null;
};

type OrgArtworkRow = {
  id: number;
  title: string;
  description: string | null;
  image_url: string;
  list_price: number | null;
  created_at: string;
};

function captionForArtwork(artwork: OrgArtworkRow, artistName: string): string {
  const title = artwork.title?.trim();
  const desc = artwork.description?.trim();
  const parts: string[] = [];
  if (title) parts.push(title);
  if (desc) parts.push(desc.slice(0, 500));
  if (parts.length === 0) parts.push(`Artwork by ${artistName}`);
  return parts.join('\n\n').slice(0, 2200);
}

async function tableExists(table: string): Promise<boolean> {
  try {
    const rows = await executeOrgQuery<{ t: number }[]>(
      `SELECT 1 AS t FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = ?
       LIMIT 1`,
      [table]
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

async function fetchFeaturedArtistIds(): Promise<number[]> {
  if (!(await tableExists('explore_featured_artists'))) return [];
  try {
    const rows = await executeOrgQuery<{ user_id: number }[]>(
      `SELECT user_id FROM explore_featured_artists ORDER BY created_at ASC`
    );
    return rows.map((r) => Number(r.user_id));
  } catch {
    return [];
  }
}

async function fetchOrgArtists(limit: number): Promise<OrgArtistRow[]> {
  const featuredIds = await fetchFeaturedArtistIds();

  if (featuredIds.length > 0) {
    const placeholders = featuredIds.map(() => '?').join(', ');
    const rows = await executeOrgQuery<OrgArtistRow[]>(
      `
      SELECT
        u.id AS user_id,
        u.email,
        u.name,
        u.profile_photo_url,
        ap.username,
        ap.artist_name,
        ap.specialization
      FROM auth_users u
      INNER JOIN artist_profiles ap ON ap.user_id = u.id
      WHERE u.id IN (${placeholders})
        AND u.status = 'active'
      ORDER BY FIELD(u.id, ${placeholders})
      LIMIT ?
      `,
      [...featuredIds, ...featuredIds, limit]
    );
    if (rows.length > 0) return rows;
  }

  return executeOrgQuery<OrgArtistRow[]>(
    `
    SELECT
      u.id AS user_id,
      u.email,
      u.name,
      u.profile_photo_url,
      ap.username,
      ap.artist_name,
      ap.specialization
    FROM auth_users u
    INNER JOIN artist_profiles ap ON ap.user_id = u.id
    INNER JOIN artworks a ON a.user_id = u.id
      AND a.status = 'active'
      AND (a.is_public = 1 OR a.is_public IS NULL)
      AND a.image_url IS NOT NULL
      AND TRIM(a.image_url) != ''
    WHERE u.status = 'active'
    GROUP BY u.id, u.email, u.name, u.profile_photo_url, ap.username, ap.artist_name, ap.specialization
    ORDER BY COUNT(a.id) DESC, MAX(a.created_at) DESC
    LIMIT ?
    `,
    [limit]
  );
}

async function fetchArtistArtworks(
  userId: number,
  limit: number,
  excludeIds: number[]
): Promise<OrgArtworkRow[]> {
  const params: (string | number)[] = [userId];
  let excludeClause = '';
  if (excludeIds.length > 0) {
    excludeClause = `AND a.id NOT IN (${excludeIds.map(() => '?').join(', ')})`;
    params.push(...excludeIds);
  }
  params.push(limit);

  return executeOrgQuery<OrgArtworkRow[]>(
    `
    SELECT a.id, a.title, a.description, a.image_url, a.list_price, a.created_at
    FROM artworks a
    WHERE a.user_id = ?
      AND a.status = 'active'
      AND (a.is_public = 1 OR a.is_public IS NULL)
      AND a.image_url IS NOT NULL
      AND TRIM(a.image_url) != ''
      ${excludeClause}
    ORDER BY a.created_at DESC
    LIMIT ?
    `,
    params
  );
}

async function getSeededArtworkIds(): Promise<Set<number>> {
  try {
    const rows = await executeQuery<{ org_artwork_id: number }[]>(
      'SELECT org_artwork_id FROM org_seed_artworks'
    );
    return new Set(rows.map((r) => Number(r.org_artwork_id)));
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes("doesn't exist")) {
      throw new Error('Run migrations first: npm run migrate --workspace=@inbidz/api');
    }
    throw e;
  }
}

async function imageDimensions(
  buffer: Buffer | undefined,
  fallback = { width: 1080, height: 1350 }
): Promise<{ width: number; height: number }> {
  if (!buffer || buffer.length === 0) return fallback;
  try {
    const meta = await sharp(buffer).metadata();
    if (meta.width && meta.height) {
      return { width: meta.width, height: meta.height };
    }
  } catch {
    /* use fallback */
  }
  return fallback;
}

async function upsertArtistProfile(
  artist: OrgArtistRow,
  dryRun: boolean,
  orgUrlsOnly: boolean
): Promise<'created' | 'skipped'> {
  const userId = String(artist.user_id);
  const existing = await executeQuery<{ user_id: string }[]>(
    'SELECT user_id FROM app_profiles WHERE user_id = ? LIMIT 1',
    [userId]
  );
  if (existing.length > 0) return 'skipped';

  const username = await pickUsername(userId, artist.username, artist.email);
  const displayName = (artist.artist_name?.trim() || artist.name?.trim() || username).slice(0, 100);
  const bio = artist.specialization?.trim()?.slice(0, 500) ?? null;

  let avatarUrl: string | null = null;
  if (artist.profile_photo_url) {
    if (dryRun || orgUrlsOnly) {
      avatarUrl = resolveOrgAssetUrl(artist.profile_photo_url);
    } else {
      const mirrored = await mirrorOrgAssetToR2(
        `avatars/${userId}`,
        artist.profile_photo_url,
        SEED_MIRROR_OPTS
      );
      avatarUrl = mirrored?.publicUrl ?? resolveOrgAssetUrl(artist.profile_photo_url);
    }
  }

  if (dryRun) return 'created';

  await executeQuery(
    `INSERT INTO app_profiles (user_id, username, display_name, avatar_url, bio, referral_code)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, username, displayName, avatarUrl, bio, generateShortCode(8)]
  );
  return 'created';
}

async function seedArtworkPost(
  artist: OrgArtistRow,
  artwork: OrgArtworkRow,
  dryRun: boolean,
  orgUrlsOnly: boolean
): Promise<{ created: boolean; mirrorFallback: boolean }> {
  const userId = String(artist.user_id);
  const artistName = artist.artist_name?.trim() || artist.name?.trim() || 'Artist';
  const sourceUrl = resolveOrgAssetUrl(artwork.image_url);
  if (!sourceUrl) return { created: false, mirrorFallback: false };

  if (dryRun) return { created: true, mirrorFallback: false };

  let publicUrl = sourceUrl;
  let buffer: Buffer | undefined;
  let mirrorFallback = false;

  if (orgUrlsOnly) {
    mirrorFallback = true;
  } else {
    const mirrored = await mirrorOrgAssetToR2(
      `seed/artworks/${artwork.id}`,
      artwork.image_url,
      SEED_MIRROR_OPTS
    );
    if (!mirrored) return { created: false, mirrorFallback: false };
    publicUrl = mirrored.publicUrl;
    buffer = mirrored.buffer;
    mirrorFallback = !mirrored.mirrored;
  }

  const { width, height } = await imageDimensions(buffer);
  const r2Key = `seed/artworks/${artwork.id}/${createHash('sha256')
    .update(publicUrl)
    .digest('hex')
    .slice(0, 16)}`;
  const postId = randomUUID();
  const mediaId = randomUUID();
  const caption = captionForArtwork(artwork, artistName);
  const createdAt = artwork.created_at || new Date().toISOString().slice(0, 19).replace('T', ' ');

  await executeQuery(
    `INSERT INTO posts (id, user_id, caption, post_type, commerce_mode, status, created_at)
     VALUES (?, ?, ?, 'photo', 'none', 'published', ?)`,
    [postId, userId, caption, createdAt]
  );

  await executeQuery(
    `INSERT INTO post_media (id, post_id, media_type, r2_key, public_url, width, height, order_index)
     VALUES (?, ?, 'photo', ?, ?, ?, ?, 0)`,
    [mediaId, postId, r2Key, publicUrl, width, height]
  );

  await executeQuery(
    `INSERT INTO org_seed_artworks (org_artwork_id, post_id, org_user_id)
     VALUES (?, ?, ?)`,
    [artwork.id, postId, userId]
  );

  return { created: true, mirrorFallback };
}

export async function seedOrgFeed(options: SeedOrgFeedOptions = {}): Promise<SeedOrgFeedResult> {
  if (!isOrgDbConfigured()) {
    throw new Error(
      'ORG_DB_USER and ORG_DB_NAME must be set (read-only connection to inbidz_org).'
    );
  }

  const maxArtists = options.maxArtists ?? 40;
  const artworksPerArtist = options.artworksPerArtist ?? 3;
  const dryRun = options.dryRun ?? false;
  const orgUrlsOnly = options.orgUrlsOnly ?? false;

  const seededIds = await getSeededArtworkIds();
  const artists = await fetchOrgArtists(maxArtists);

  const result: SeedOrgFeedResult = {
    artistsConsidered: artists.length,
    profilesCreated: 0,
    profilesSkipped: 0,
    postsCreated: 0,
    artworksSkipped: seededIds.size,
    mirrorFallbacks: 0,
    dryRun,
    orgUrlsOnly,
  };

  let artworkIndex = 0;

  for (const artist of artists) {
    const profileOutcome = await upsertArtistProfile(artist, dryRun, orgUrlsOnly);
    if (profileOutcome === 'created') result.profilesCreated++;
    else result.profilesSkipped++;

    const excludeIds = [...seededIds];
    const artworks = await fetchArtistArtworks(artist.user_id, artworksPerArtist, excludeIds);

    for (const artwork of artworks) {
      if (seededIds.has(artwork.id)) {
        result.artworksSkipped++;
        continue;
      }

      artworkIndex++;
      if (!dryRun && artworkIndex % 10 === 0) {
        console.log(`  … ${artworkIndex} artworks processed`);
      }

      const outcome = await seedArtworkPost(artist, artwork, dryRun, orgUrlsOnly);
      if (outcome.created) {
        result.postsCreated++;
        seededIds.add(artwork.id);
        if (outcome.mirrorFallback) result.mirrorFallbacks++;
      }
    }
  }

  if (!dryRun && result.mirrorFallbacks > 0 && !orgUrlsOnly) {
    console.log(
      `Note: ${result.mirrorFallbacks} image(s) use www.inbidz.org URLs (R2 mirror timed out or failed). Re-run later or use --org-urls-only for a fast seed.`
    );
  }

  return result;
}
