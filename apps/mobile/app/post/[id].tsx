import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import type { Post } from '@inbidz/shared';
import { formatINR } from '@inbidz/shared';
import { AdaptiveMedia } from '@/components/AdaptiveMedia';
import { CommerceBar } from '@/components/CommerceBar';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Card } from '@/components/Card';
import { Field } from '@/components/Field';
import { showAlert, showConfirm } from '@/lib/alert';
import { colors, fonts, fs, layout, shared, sp } from '@/constants/theme';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken, login, user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .getPost(id, accessToken)
      .then((res) => setPost(res.post))
      .finally(() => setLoading(false));
  }, [id, accessToken]);

  const requireAuth = async () => {
    if (!accessToken) {
      await login();
      return false;
    }
    return true;
  };

  const handleBuy = async () => {
    if (!post || !(await requireAuth()) || buying) return;
    setBuying(true);
    try {
      const order = await api.buyNow(accessToken!, post.id);
      if (order.devMode) {
        const confirmed = await showConfirm(
          'Test checkout',
          `Confirm test payment of ${formatINR(order.amount)}? (Razorpay not configured — dev mode)`
        );
        if (!confirmed) return;
        await api.confirmDevOrder(accessToken!, order.orderId);
        showAlert('Paid!', 'Test order completed.');
        const res = await api.getPost(post.id, accessToken);
        setPost(res.post);
        return;
      }
      showAlert(
        'Checkout',
        `Order created for ${formatINR(order.amount)}. Complete payment with Razorpay order ${order.razorpayOrderId}.`
      );
    } catch (e) {
      showAlert('Error', e instanceof Error ? e.message : 'Buy failed');
    } finally {
      setBuying(false);
    }
  };

  const handleBid = async () => {
    if (!post || !(await requireAuth())) return;
    const amount = parseFloat(bidAmount);
    if (!amount) return;
    try {
      const res = await api.placeBid(accessToken!, post.id, amount);
      setPost(res.post);
      setBidAmount('');
    } catch (e) {
      showAlert('Error', e instanceof Error ? e.message : 'Bid failed');
    }
  };

  const handleOffer = async () => {
    if (!post || !(await requireAuth())) return;
    const amount = parseFloat(offerAmount);
    if (!amount) return;
    try {
      await api.createOffer(accessToken!, post.id, amount, offerMessage);
      showAlert('Offer sent', 'The seller will respond in messages.');
      setOfferAmount('');
      setOfferMessage('');
    } catch (e) {
      showAlert('Error', e instanceof Error ? e.message : 'Offer failed');
    }
  };

  if (loading || !post) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  const isOwner = Boolean(user?.id && post?.userId && user.id === post.userId);
  const canBuy =
    !isOwner && ['buy_now', 'buy_now_and_offers'].includes(post.commerceMode);
  const canBid =
    !isOwner && ['auction', 'buy_now_and_offers'].includes(post.commerceMode);
  const canOffer =
    !isOwner && ['offers', 'buy_now_and_offers'].includes(post.commerceMode);

  return (
    <View style={styles.container}>
      <AdaptiveMedia media={post.media} autoPlay />
      <View style={styles.detail}>
        <Text style={styles.author}>{post.author.username}</Text>
        {post.caption ? <Text style={styles.caption}>{post.caption}</Text> : null}
      </View>
      <CommerceBar post={post} />

      {isOwner && (
        <View style={styles.ownerBanner}>
          <Text style={styles.ownerBannerText}>This is your listing</Text>
        </View>
      )}

      {(canBuy || canBid || canOffer) && (
        <View style={styles.actionsWrap}>
          <Card>
            {canBuy && post.commerce?.price != null && (
              <Pressable
                style={[styles.ctaPrimary, buying && styles.ctaDisabled]}
                onPress={handleBuy}
                disabled={buying}
              >
                {buying ? (
                  <ActivityIndicator color={colors.surface} />
                ) : (
                  <Text style={styles.ctaText}>Buy {formatINR(post.commerce.price)}</Text>
                )}
              </Pressable>
            )}
            {canBid && (
              <View style={styles.row}>
                <Field
                  label="Bid amount"
                  placeholder="Enter amount"
                  keyboardType="numeric"
                  value={bidAmount}
                  onChangeText={setBidAmount}
                  style={styles.fieldInput}
                />
                <Pressable style={styles.ctaSecondary} onPress={handleBid}>
                  <Text style={styles.ctaTextSecondary}>Place bid</Text>
                </Pressable>
              </View>
            )}
            {canOffer && (
              <View style={styles.offerBox}>
                <Field
                  label="Your offer"
                  placeholder="Amount in INR"
                  keyboardType="numeric"
                  value={offerAmount}
                  onChangeText={setOfferAmount}
                />
                <Field
                  label="Message"
                  placeholder="Optional note to seller"
                  value={offerMessage}
                  onChangeText={setOfferMessage}
                />
                <Pressable style={styles.ctaSecondary} onPress={handleOffer}>
                  <Text style={styles.ctaTextSecondary}>Send offer</Text>
                </Pressable>
              </View>
            )}
          </Card>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: shared.screen,
  center: shared.screenCenter,
  detail: {
    paddingHorizontal: layout.contentPadding,
    paddingTop: sp(16),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  caption: {
    fontFamily: fonts.sans,
    color: colors.textSecondary,
    fontSize: fs(14),
    lineHeight: fs(21),
    fontStyle: 'italic',
    marginTop: sp(8),
    marginBottom: sp(4),
  },
  author: {
    fontFamily: fonts.sans,
    color: colors.text,
    fontSize: fs(13),
    fontWeight: '500',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  ownerBanner: {
    marginHorizontal: layout.contentPadding,
    marginBottom: sp(8),
    padding: sp(12),
    backgroundColor: colors.bgMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  ownerBannerText: {
    fontFamily: fonts.sans,
    color: colors.textSecondary,
    fontSize: fs(12),
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  actionsWrap: { padding: layout.contentPadding, paddingBottom: sp(24) },
  ctaPrimary: {
    ...shared.btnPrimary,
    minHeight: sp(44),
    justifyContent: 'center',
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: shared.btnPrimaryText,
  ctaSecondary: shared.btnOutline,
  ctaTextSecondary: shared.btnOutlineText,
  row: { gap: sp(8) },
  fieldInput: { marginBottom: sp(8) },
  offerBox: { marginTop: sp(4) },
});
