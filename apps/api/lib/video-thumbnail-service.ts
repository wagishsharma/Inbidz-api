import { execFile } from 'child_process';
import { randomUUID } from 'crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { promisify } from 'util';
import { executeQuery } from './database';
import { resolveMediaUrl } from './post-mapper';
import {
  downloadObject,
  getPostThumbnailKey,
  getPublicUrl,
  isR2Configured,
  uploadObject,
} from './r2';

const execFileAsync = promisify(execFile);
const UPLOAD_DIR = path.join(process.cwd(), '.uploads');

const inFlight = new Map<
  string,
  Promise<{ thumbnailR2Key: string; thumbnailUrl: string } | null>
>();

function apiMediaBase(): string {
  return (process.env.API_PUBLIC_URL || 'http://localhost:3001').replace(/\/$/, '');
}

async function getFfmpegPath(): Promise<string | null> {
  if (process.env.FFMPEG_PATH?.trim()) return process.env.FFMPEG_PATH.trim();
  try {
    const mod = await import('ffmpeg-static');
    const binary = mod.default;
    if (typeof binary === 'string' && binary.length > 0) return binary;
  } catch {
    // optional dependency
  }
  return 'ffmpeg';
}

async function extractFrameWithFfmpeg(
  input: string,
  isRemoteUrl: boolean
): Promise<Buffer | null> {
  const ffmpeg = await getFfmpegPath();
  if (!ffmpeg) return null;

  const dir = await mkdtemp(path.join(tmpdir(), 'inbidz-thumb-'));
  const outPath = path.join(dir, 'frame.jpg');

  const args = ['-y'];
  if (isRemoteUrl) {
    args.push('-protocol_whitelist', 'file,http,https,tcp,tls');
  }
  args.push(
    '-ss',
    '0.5',
    '-i',
    input,
    '-vframes',
    '1',
    '-q:v',
    '4',
    '-vf',
    'scale=720:-2',
    outPath
  );

  try {
    await execFileAsync(ffmpeg, args, { timeout: 120_000 });
    return await readFile(outPath);
  } catch (err) {
    console.warn('ffmpeg thumbnail extract failed', err);
    return null;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

async function extractFrameFromVideo(
  r2Key: string,
  publicUrl: string | null | undefined
): Promise<Buffer | null> {
  const resolvedUrl = resolveMediaUrl(publicUrl, r2Key);

  if (r2Key.startsWith('dev/')) {
    const localPath = path.join(UPLOAD_DIR, r2Key);
    try {
      await readFile(localPath);
      return extractFrameWithFfmpeg(localPath, false);
    } catch {
      // fall through to URL fetch
    }
  }

  if (resolvedUrl.startsWith('http://') || resolvedUrl.startsWith('https://')) {
    const fromUrl = await extractFrameWithFfmpeg(resolvedUrl, true);
    if (fromUrl) return fromUrl;
  }

  if (r2Key.startsWith('dev/')) return null;

  if (!isR2Configured()) return null;

  try {
    const videoBuffer = await downloadObject(r2Key);
    const dir = await mkdtemp(path.join(tmpdir(), 'inbidz-thumb-'));
    const videoPath = path.join(dir, 'input.mp4');
    try {
      await writeFile(videoPath, videoBuffer);
      return await extractFrameWithFfmpeg(videoPath, false);
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  } catch (err) {
    console.warn('R2 video download for thumbnail failed', r2Key, err);
    return null;
  }
}

async function persistThumbnailJpeg(
  userId: string,
  jpeg: Buffer,
  videoR2Key: string
): Promise<{ key: string; publicUrl: string }> {
  if (videoR2Key.startsWith('dev/') && !isR2Configured()) {
    const key = `dev/${userId}/${randomUUID()}-thumb.jpg`;
    await mkdir(path.join(UPLOAD_DIR, path.dirname(key)), { recursive: true });
    await writeFile(path.join(UPLOAD_DIR, key), jpeg);
    const publicUrl = `${apiMediaBase()}/api/media/${key
      .split('/')
      .map(encodeURIComponent)
      .join('/')}`;
    return { key, publicUrl };
  }

  const key = getPostThumbnailKey(userId);
  await uploadObject(key, jpeg, 'image/jpeg');
  return { key, publicUrl: getPublicUrl(key) };
}

/** Generate a thumbnail JPEG for a video without touching the database. */
export async function generateVideoThumbnail(
  userId: string,
  videoR2Key: string,
  publicUrl?: string | null
): Promise<{ key: string; publicUrl: string } | null> {
  const frame = await extractFrameFromVideo(videoR2Key, publicUrl);
  if (!frame) return null;
  return persistThumbnailJpeg(userId, frame, videoR2Key);
}

/** Generate and persist thumbnail for an existing post_media row. */
export async function ensureVideoThumbnail(
  mediaId: string,
  userId: string,
  videoR2Key: string,
  publicUrl?: string | null
): Promise<{ thumbnailR2Key: string; thumbnailUrl: string } | null> {
  const existing = inFlight.get(mediaId);
  if (existing) return existing;

  const work = (async () => {
    const generated = await generateVideoThumbnail(userId, videoR2Key, publicUrl);
    if (!generated) return null;

    await executeQuery(
      'UPDATE post_media SET thumbnail_r2_key = ?, thumbnail_url = ? WHERE id = ? AND (thumbnail_r2_key IS NULL OR thumbnail_r2_key = \'\')',
      [generated.key, generated.publicUrl, mediaId]
    );

    return {
      thumbnailR2Key: generated.key,
      thumbnailUrl: generated.publicUrl,
    };
  })().finally(() => {
    inFlight.delete(mediaId);
  });

  inFlight.set(mediaId, work);
  return work;
}

type MediaRow = {
  id: string;
  post_id?: string;
  media_type: 'photo' | 'video';
  r2_key: string;
  public_url: string | null;
  thumbnail_r2_key?: string | null;
  thumbnail_url?: string | null;
};

export async function backfillMissingThumbnailsForMedia<T extends MediaRow>(
  userId: string,
  mediaRows: T[]
): Promise<T[]> {
  const updated = [...mediaRows];
  for (let i = 0; i < updated.length; i++) {
    const row = updated[i];
    if (row.media_type !== 'video') continue;
    if (row.thumbnail_r2_key?.trim()) continue;

    const thumb = await ensureVideoThumbnail(row.id, userId, row.r2_key, row.public_url);
    if (thumb) {
      updated[i] = {
        ...row,
        thumbnail_r2_key: thumb.thumbnailR2Key,
        thumbnail_url: thumb.thumbnailUrl,
      };
    }
  }
  return updated;
}
