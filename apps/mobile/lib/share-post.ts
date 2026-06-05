import { Share } from 'react-native';
import type { Post } from '@inbidz/shared';

/** Build share text with the link included exactly once. */
export function buildPostShareMessage(post: Post): string {
  const title = (post.caption?.trim() || 'this post').slice(0, 80);
  if (post.shortUrl) {
    return `Check out "${title}" on INBIDZ → ${post.shortUrl}`;
  }
  return `Check out "${title}" on INBIDZ`;
}

/**
 * Native share sheet. Pass only `message` — iOS duplicates the URL when both
 * `message` and `url` are set to the same link.
 */
export async function sharePost(post: Post): Promise<void> {
  await Share.share({ message: buildPostShareMessage(post) });
}

export async function shareText(message: string): Promise<void> {
  await Share.share({ message });
}
