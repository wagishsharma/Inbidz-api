import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { API_URL } from './config';

type UploadResult = { key: string; publicUrl: string };

function authHeaders(token: string): Record<string, string> {
  if (token && token.split('.').length === 3) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

function parseUploadResponse(status: number, body: string): UploadResult {
  const data = JSON.parse(body || '{}') as UploadResult & { error?: string };
  if (status < 200 || status >= 300) {
    throw new Error(data.error || `Upload failed (${status})`);
  }
  if (!data.key || !data.publicUrl) {
    throw new Error('Invalid upload response');
  }
  return { key: data.key, publicUrl: data.publicUrl };
}

/** Ensure picker URI is a readable file:// path (copy content:// / ph:// to cache). */
async function ensureUploadUri(uri: string, filename: string): Promise<string> {
  if (uri.startsWith('file://')) {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists && typeof info.size === 'number' && info.size > 0) {
      return uri;
    }
  }

  const ext = filename.includes('.') ? filename.slice(filename.lastIndexOf('.')) : '';
  const dest = `${FileSystem.cacheDirectory}upload-${Date.now()}${ext}`;
  await FileSystem.copyAsync({ from: uri, to: dest });

  const copied = await FileSystem.getInfoAsync(dest);
  if (!copied.exists || !copied.size) {
    throw new Error('Could not read media file — try picking again');
  }

  return dest;
}

async function uploadMultipartNative(
  path: string,
  uri: string,
  filename: string,
  contentType: string,
  token: string
): Promise<UploadResult> {
  const fileUri = await ensureUploadUri(uri, filename);

  const result = await FileSystem.uploadAsync(`${API_URL}${path}`, fileUri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'file',
    mimeType: contentType,
    parameters: { filename, contentType },
    headers: authHeaders(token),
  });

  return parseUploadResponse(result.status, result.body);
}

async function uploadMultipartWeb(
  path: string,
  uri: string,
  filename: string,
  contentType: string,
  token: string
): Promise<UploadResult> {
  const blob = await fetch(uri).then((r) => r.blob());
  if (blob.size === 0) {
    throw new Error('Could not read file — try picking again');
  }

  const form = new FormData();
  form.append('file', blob, filename);
  form.append('filename', filename);
  form.append('contentType', contentType);

  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: authHeaders(token),
    body: form,
    credentials: 'include',
  });

  const text = await res.text();
  return parseUploadResponse(res.status, text);
}

export async function uploadR2File(
  token: string,
  uri: string,
  filename: string,
  contentType: string
): Promise<UploadResult> {
  if (Platform.OS === 'web') {
    return uploadMultipartWeb('/api/upload/r2', uri, filename, contentType, token);
  }
  return uploadMultipartNative('/api/upload/r2', uri, filename, contentType, token);
}

export async function uploadDevFile(
  token: string,
  uri: string,
  filename: string,
  contentType: string
): Promise<UploadResult> {
  if (Platform.OS === 'web') {
    return uploadMultipartWeb('/api/upload/dev', uri, filename, contentType, token);
  }
  return uploadMultipartNative('/api/upload/dev', uri, filename, contentType, token);
}
