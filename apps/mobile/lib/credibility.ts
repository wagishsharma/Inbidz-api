export function followerTierLabel(count: number): string {
  if (count >= 1000) return '1k+';
  if (count >= 500) return '500+';
  if (count >= 100) return '100+';
  if (count >= 10) return 'Growing';
  return 'New';
}

export function buildCredibilitySignals(input: {
  isSeller?: boolean;
  followerCount?: number;
  followingCount?: number;
}): string[] {
  const followerCount = input.followerCount ?? 0;
  const followingCount = input.followingCount ?? 0;
  const signals: string[] = [];

  if (input.isSeller) signals.push('Verified Creator');
  if (followingCount >= 100) signals.push('Community Contributor');
  if (followerCount >= 500) signals.push('500+ Followers');

  return signals;
}
