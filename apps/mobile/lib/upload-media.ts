import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { API_URL } from './config';

type UploadResult = { key: string; publicUrl: string };
export type UploadProgressCallback = (progress: number) => void;

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

function reportProgress(
  onProgress: UploadProgressCallback | undefined,
  sent: number,
  total: number
) {
  if (!onProgress || total <= 0) return;
  onProgress(Math.min(1, sent / total));
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
  token: string,
  onProgress?: UploadProgressCallback
): Promise<UploadResult> {
  const fileUri = await ensureUploadUri(uri, filename);
  const url = `${API_URL}${path}`;
  const options = {
    httpMethod: 'POST' as const,
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'file',
    mimeType: contentType,
    parameters: { filename, contentType },
    headers: authHeaders(token),
  };

  const fs = FileSystem as typeof FileSystem & {
    createUploadTask?: (
      uploadUrl: string,
      uploadUri: string,
      uploadOptions: typeof options,
      callback?: (data: { totalBytesSent: number; totalBytesExpectedToSend: number }) => void
    ) => { uploadAsync: () => Promise<{ status: number; body: string }> };
  };

  if (fs.createUploadTask && onProgress) {
    const task = fs.createUploadTask(url, fileUri, options, (data) => {
      reportProgress(onProgress, data.totalBytesSent, data.totalBytesExpectedToSend);
    });
    const result = await task.uploadAsync();
    return parseUploadResponse(result.status, result.body);
  }

  const result = await FileSystem.uploadAsync(url, fileUri, options);
  onProgress?.(1);
  return parseUploadResponse(result.status, result.body);
}

async function uploadMultipartWeb(
  path: string,
  uri: string,
  filename: string,
  contentType: string,
  token: string,
  onProgress?: UploadProgressCallback
): Promise<UploadResult> {
  const blob = await fetch(uri).then((r) => r.blob());
  if (blob.size === 0) {
    throw new Error('Could not read file — try picking again');
  }

  const form = new FormData();
  form.append('file', blob, filename);
  form.append('filename', filename);
  form.append('contentType', contentType);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}${path}`);
    const headers = authHeaders(token);
    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value);
    }
    xhr.withCredentials = true;

    xhr.upload.onprogress = (event) => {
      reportProgress(onProgress, event.loaded, event.total);
    };

    xhr.onload = () => {
      try {
        resolve(parseUploadResponse(xhr.status, xhr.responseText));
      } catch (err) {
        reject(err);
      }
    };

    xhr.onerror = () => reject(new Error('Upload failed — check your connection'));
    xhr.onabort = () => reject(new Error('Upload cancelled'));
    xhr.send(form);
  });
}

export async function uploadR2File(
  token: string,
  uri: string,
  filename: string,
  contentType: string,
  onProgress?: UploadProgressCallback
): Promise<UploadResult> {
  if (Platform.OS === 'web') {
    return uploadMultipartWeb('/api/upload/r2', uri, filename, contentType, token, onProgress);
  }
  return uploadMultipartNative('/api/upload/r2', uri, filename, contentType, token, onProgress);
}

export async function uploadDevFile(
  token: string,
  uri: string,
  filename: string,
  contentType: string,
  onProgress?: UploadProgressCallback
): Promise<UploadResult> {
  if (Platform.OS === 'web') {
    return uploadMultipartWeb('/api/upload/dev', uri, filename, contentType, token, onProgress);
  }
  return uploadMultipartNative('/api/upload/dev', uri, filename, contentType, token, onProgress);
}
