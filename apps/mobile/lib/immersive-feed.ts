import type { FeedMode, Post } from '@inbidz/shared';

type ImmersiveFeedSession = {
  posts: Post[];
  initialIndex: number;
  feedMode?: FeedMode;
};

let session: ImmersiveFeedSession | null = null;

export function setImmersiveFeedSession(
  posts: Post[],
  initialIndex: number,
  feedMode?: FeedMode
) {
  session = { posts, initialIndex, feedMode };
}

export function peekImmersiveFeedSession(): ImmersiveFeedSession | null {
  return session;
}
