import { formatINR } from '@inbidz/shared';
import type { Post } from '@inbidz/shared';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, fs, sp } from '@/constants/theme';

type Props = {
  post: Post;
};

export function CommerceBar({ post }: Props) {
  const commerce = post.commerce;
  if (!commerce || post.commerceMode === 'none') return null;

  const soldOut = commerce.inventory <= commerce.soldCount;

  return (
    <View style={styles.bar}>
      {soldOut ? (
        <Text style={styles.sold}>Sold out</Text>
      ) : (
        <View style={styles.row}>
          {(post.commerceMode === 'buy_now' || post.commerceMode === 'buy_now_and_offers') &&
            commerce.price != null && (
              <Text style={styles.price}>{formatINR(commerce.price)}</Text>
            )}
          {(post.commerceMode === 'auction' || post.commerceMode === 'buy_now_and_offers') && (
            <Text style={styles.bid}>
              {commerce.currentBid
                ? `High bid ${formatINR(commerce.currentBid)}`
                : 'Open for bids'}
              {commerce.bidCount > 0 ? ` · ${commerce.bidCount} bids` : ''}
            </Text>
          )}
          {(post.commerceMode === 'offers' || post.commerceMode === 'buy_now_and_offers') && (
            <Text style={styles.offer}>Offers welcome</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: sp(16),
    paddingVertical: sp(12),
    backgroundColor: colors.accentSoft,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: sp(12), alignItems: 'center' },
  price: {
    fontFamily: fonts.sans,
    color: colors.accent,
    fontSize: fs(15),
    fontWeight: '600',
  },
  bid: {
    fontFamily: fonts.sans,
    color: colors.textSecondary,
    fontSize: fs(13),
  },
  offer: {
    fontFamily: fonts.sans,
    color: colors.textMuted,
    fontSize: fs(13),
  },
  sold: {
    fontFamily: fonts.sans,
    color: colors.textMuted,
    fontSize: fs(13),
    fontWeight: '500',
  },
});
