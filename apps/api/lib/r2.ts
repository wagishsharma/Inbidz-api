import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

function normalizeEndpoint(raw: string): string {
  return raw.replace(/\/$/, '');
}

function getR2Config() {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  const accountId = process.env.R2_ACCOUNT_ID;
  const endpoint = normalizeEndpoint(
    process.env.R2_ENDPOINT ||
      (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '')
  );

  if (!accessKeyId || !secretAccessKey || !bucket || !endpoint) return null;
  return { accessKeyId, secretAccessKey, bucket, endpoint };
}

export function isR2Configured(): boolean {
  return getR2Config() !== null;
}

function getClient(): S3Client {
  const config = getR2Config();
  if (!config) throw new Error('R2 is not configured');
  return new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
}

function getBucket(): string {
  const config = getR2Config();
  if (!config) throw new Error('R2 is not configured');
  return config.bucket;
}

export function getPostThumbnailKey(userId: string): string {
  return `posts/${userId}/thumb-${randomUUID()}.jpg`;
}

export function getPostMediaKey(userId: string, filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  return `posts/${userId}/${randomUUID()}-${safe}`;
}

export function getPublicUrl(key: string): string {
  const base = process.env.R2_PUBLIC_URL?.replace(/\/$/, '');
  if (base) return `${base}/${key}`;
  return key;
}

/** Upload bytes server-side (avoids bucket CORS + native presigned PUT issues). */
export async function uploadObject(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  const client = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
      ContentLength: body.length,
    })
  );
}

export async function objectExists(key: string): Promise<boolean> {
  if (!isR2Configured()) return false;
  try {
    const client = getClient();
    await client.send(new HeadObjectCommand({ Bucket: getBucket(), Key: key }));
    return true;
  } catch {
    return false;
  }
}

/** True when credentials can write and read back an object. */
export async function verifyR2WriteAccess(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isR2Configured()) {
    return { ok: false, error: 'R2 env vars missing (ACCESS_KEY, SECRET, BUCKET, ENDPOINT)' };
  }

  const key = `_healthcheck/${randomUUID()}.txt`;
  try {
    await uploadObject(key, Buffer.from('ok'), 'text/plain');
    const client = getClient();
    await client.send(new HeadObjectCommand({ Bucket: getBucket(), Key: key }));
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown R2 error';
    return {
      ok: false,
      error:
        message.includes('Access Denied') || message.includes('AccessDenied')
          ? 'R2 API token lacks Object Read & Write on bucket "' +
            getBucket() +
            '". In Cloudflare → R2 → Manage API tokens, create S3 credentials scoped to this bucket.'
          : message,
    };
  }
}

export async function createPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600
): Promise<string> {
  const client = getClient();
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn });
}

export async function createPresignedDownloadUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  const client = getClient();
  const command = new GetObjectCommand({ Bucket: getBucket(), Key: key });
  return getSignedUrl(client, command, { expiresIn });
}
