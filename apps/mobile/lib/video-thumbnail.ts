import * as VideoThumbnails from 'expo-video-thumbnails';

/** Extract first-frame JPEG from a local video URI. Returns local file URI or null. */
export async function generateVideoThumbnail(videoUri: string): Promise<string | null> {
  for (const time of [0, 500, 1000]) {
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time,
        quality: 0.85,
      });
      if (uri) return uri;
    } catch {
      // try next timestamp — some codecs fail at t=0
    }
  }
  console.warn('Video thumbnail generation failed for', videoUri);
  return null;
}
