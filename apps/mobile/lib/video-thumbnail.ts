import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as VideoThumbnails from 'expo-video-thumbnails';

/** Copy picker URIs (content://, ph://) to a readable file:// path on native. */
async function ensureReadableVideoUri(videoUri: string): Promise<string> {
  if (Platform.OS === 'web') return videoUri;

  if (videoUri.startsWith('file://')) {
    const info = await FileSystem.getInfoAsync(videoUri);
    if (info.exists) return videoUri;
  }

  const dest = `${FileSystem.cacheDirectory}thumb-src-${Date.now()}.mp4`;
  await FileSystem.copyAsync({ from: videoUri, to: dest });
  const copied = await FileSystem.getInfoAsync(dest);
  if (!copied.exists) {
    throw new Error('Could not read video file');
  }
  return dest;
}

/** Web: extract a frame via canvas (expo-video-thumbnails is native-only). */
async function generateVideoThumbnailWeb(videoUri: string): Promise<string | null> {
  if (typeof document === 'undefined') return null;

  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.crossOrigin = 'anonymous';

    let settled = false;
    const finish = (uri: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      video.removeAttribute('src');
      video.load();
      resolve(uri);
    };

    const timer = setTimeout(() => finish(null), 20_000);

    video.onloadeddata = () => {
      const seekTo = Number.isFinite(video.duration) && video.duration > 0
        ? Math.min(1, video.duration * 0.1)
        : 0;
      video.currentTime = seekTo;
    };

    video.onseeked = () => {
      if (!video.videoWidth || !video.videoHeight) {
        finish(null);
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        finish(null);
        return;
      }
      ctx.drawImage(video, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            finish(null);
            return;
          }
          finish(URL.createObjectURL(blob));
        },
        'image/jpeg',
        0.85
      );
    };

    video.onerror = () => finish(null);
    video.src = videoUri;
  });
}

async function generateVideoThumbnailNative(videoUri: string): Promise<string | null> {
  const readableUri = await ensureReadableVideoUri(videoUri);

  for (const time of [0, 500, 1000, 2000]) {
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(readableUri, {
        time,
        quality: 0.85,
      });
      if (uri) return uri;
    } catch {
      // try next timestamp — some codecs fail at t=0
    }
  }

  return null;
}

/** Extract first-frame JPEG from a local video URI. Returns local file URI or null. */
export async function generateVideoThumbnail(videoUri: string): Promise<string | null> {
  try {
    const uri =
      Platform.OS === 'web'
        ? await generateVideoThumbnailWeb(videoUri)
        : await generateVideoThumbnailNative(videoUri);

    if (!uri) {
      console.warn('Video thumbnail generation failed for', videoUri);
    }
    return uri;
  } catch (err) {
    console.warn('Video thumbnail generation failed for', videoUri, err);
    return null;
  }
}
