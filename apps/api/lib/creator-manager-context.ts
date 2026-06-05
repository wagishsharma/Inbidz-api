import { executeQuery } from '@/lib/database';

export interface AppCreatorSnapshot {
  hasAppAccount: boolean;
  postCount: number;
  commercePostCount: number;
  shopSetupComplete: boolean;
  isSeller: boolean;
  salesCount: number;
  followerCount: number;
}

export async function buildAppCreatorSnapshot(userId: string): Promise<AppCreatorSnapshot> {
  const profileRows = await executeQuery<{ shop_setup_complete: number; is_seller: number }[]>(
    'SELECT shop_setup_complete, is_seller FROM app_profiles WHERE user_id = ? LIMIT 1',
    [userId]
  );
  const profile = profileRows[0];

  const postRows = await executeQuery<{ c: number }[]>(
    `SELECT COUNT(*) as c FROM posts WHERE user_id = ? AND status = 'published'`,
    [userId]
  );
  const commerceRows = await executeQuery<{ c: number }[]>(
    `SELECT COUNT(*) as c FROM posts WHERE user_id = ? AND status = 'published' AND commerce_mode != 'none'`,
    [userId]
  );
  const salesRows = await executeQuery<{ c: number }[]>(
    `SELECT COUNT(DISTINCT o.id) as c
     FROM app_orders o
     JOIN posts p ON p.id = o.post_id
     WHERE p.user_id = ? AND o.status = 'paid'`,
    [userId]
  );
  const followerRows = await executeQuery<{ c: number }[]>(
    'SELECT COUNT(*) as c FROM app_follows WHERE following_id = ?',
    [userId]
  );

  return {
    hasAppAccount: Boolean(profile),
    postCount: postRows[0]?.c ?? 0,
    commercePostCount: commerceRows[0]?.c ?? 0,
    shopSetupComplete: Boolean(profile?.shop_setup_complete),
    isSeller: Boolean(profile?.is_seller),
    salesCount: salesRows[0]?.c ?? 0,
    followerCount: followerRows[0]?.c ?? 0,
  };
}
