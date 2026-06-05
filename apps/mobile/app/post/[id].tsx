import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { useLocalSearchParams, router } from 'expo-router';
import type { Post } from '@inbidz/shared';
import { formatINR, getMinimumBidAmount } from '@inbidz/shared';
import { AdaptiveMedia } from '@/components/AdaptiveMedia';
import { CommerceBar } from '@/components/CommerceBar';
import { PostCommentsSection } from '@/components/PostCommentsSection';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Card } from '@/components/Card';
import { Field } from '@/components/Field';
import { showAlert } from '@/lib/alert';
import { completePurchase } from '@/lib/complete-purchase';
import { colors, fonts, fs, layout, shared, sp } from '@/constants/theme';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const headerHeight = useHeaderHeight();
  const scrollRef = useRef<ScrollView>(null);
  const { accessToken, login, user, refreshUser } = useAuth();
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

  const ensureFreshToken = async (): Promise<string | null> => {
    const token = await refreshUser();
    if (token) return token;
    await login();
    return refreshUser();
  };

  const handleBuy = async () => {
    if (!post || buying) return;
    const token = await ensureFreshToken();
    if (!token) return;
    setBuying(true);
    try {
      const order = await api.buyNow(token, post.id);
      const result = await completePurchase(order, token);
      if (result === 'paid') {
        const res = await api.getPost(post.id, token);
        setPost(res.post);
      }
    } catch (e) {
      showAlert('Error', e instanceof Error ? e.message : 'Buy failed');
    } finally {
      setBuying(false);
    }
  };

  const handleBid = async () => {
    if (!post) return;
    const token = await ensureFreshToken();
    if (!token) return;
    const amount = parseFloat(bidAmount);
    if (!amount) return;
    if (post.commerce) {
      const floor = getMinimumBidAmount(post.commerce);
      if (amount < floor) {
        showAlert('Bid too low', `Enter at least ${formatINR(floor)}.`);
        return;
      }
    }
    Keyboard.dismiss();
    try {
      const res = await api.placeBid(token, post.id, amount);
      setPost(res.post);
      setBidAmount('');
    } catch (e) {
      showAlert('Error', e instanceof Error ? e.message : 'Bid failed');
    }
  };

  const handleOffer = async () => {
    if (!post) return;
    const token = await ensureFreshToken();
    if (!token) return;
    const amount = parseFloat(offerAmount);
    if (!amount) return;
    Keyboard.dismiss();
    try {
      await api.createOffer(token, post.id, amount, offerMessage);
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

  const commerce = post.commerce;
  const minBid = commerce ? getMinimumBidAmount(commerce) : null;

  const scrollToActions = () => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <AdaptiveMedia media={post.media} autoPlay compact />
        <Pressable
          style={styles.detail}
          onPress={() => router.push(`/user/${post.userId}`)}
        >
          <Text style={styles.author}>@{post.author.username}</Text>
          {post.caption ? <Text style={styles.caption}>{post.caption}</Text> : null}
        </Pressable>
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
                <View style={styles.actionSection}>
                  <Text style={styles.actionTitle}>Place a bid</Text>
                  {commerce?.currentBid != null ? (
                    <Text style={styles.actionHint}>
                      Current high bid {formatINR(commerce.currentBid)}
                      {minBid != null ? ` · enter at least ${formatINR(minBid)}` : ''}
                    </Text>
                  ) : minBid != null ? (
                    <Text style={styles.actionHint}>Starting bid {formatINR(minBid)}</Text>
                  ) : (
                    <Text style={styles.actionHint}>Enter your bid amount in INR</Text>
                  )}
                  <Field
                    label="Your bid (INR)"
                    placeholder={minBid != null ? String(minBid) : 'Enter amount'}
                    keyboardType="decimal-pad"
                    value={bidAmount}
                    onChangeText={setBidAmount}
                    onFocus={scrollToActions}
                  />
                  <Pressable style={styles.ctaPrimary} onPress={handleBid}>
                    <Text style={styles.ctaText}>Place bid</Text>
                  </Pressable>
                </View>
              )}
              {canOffer && (
                <View style={[styles.actionSection, canBid && styles.actionSectionBorder]}>
                  <Text style={styles.actionTitle}>Make an offer</Text>
                  <Text style={styles.actionHint}>The seller can accept, decline, or counter.</Text>
                  <Field
                    label="Your offer (INR)"
                    placeholder="Amount in INR"
                    keyboardType="decimal-pad"
                    value={offerAmount}
                    onChangeText={setOfferAmount}
                    onFocus={scrollToActions}
                  />
                  <Field
                    label="Message"
                    placeholder="Optional note to seller"
                    value={offerMessage}
                    onChangeText={setOfferMessage}
                    onFocus={scrollToActions}
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                  />
                  <Pressable style={styles.ctaSecondary} onPress={handleOffer}>
                    <Text style={styles.ctaTextSecondary}>Send offer</Text>
                  </Pressable>
                </View>
              )}
            </Card>
          </View>
        )}

        <PostCommentsSection
          post={post}
          onCommentCountChange={(count) => setPost((p) => (p ? { ...p, commentCount: count } : p))}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: shared.screen,
  scrollContent: {
    flexGrow: 1,
    paddingBottom: sp(32),
  },
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
  actionsWrap: { padding: layout.contentPadding, paddingTop: sp(12) },
  actionSection: { gap: sp(4) },
  actionSectionBorder: {
    marginTop: sp(20),
    paddingTop: sp(20),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  actionTitle: {
    fontFamily: fonts.sans,
    fontSize: fs(16),
    fontWeight: '600',
    color: colors.text,
    marginBottom: sp(4),
  },
  actionHint: {
    fontFamily: fonts.sans,
    fontSize: fs(13),
    color: colors.textSecondary,
    lineHeight: fs(18),
    marginBottom: sp(8),
  },
  ctaPrimary: {
    ...shared.btnPrimary,
    minHeight: sp(44),
    justifyContent: 'center',
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: shared.btnPrimaryText,
  ctaSecondary: shared.btnOutline,
  ctaTextSecondary: shared.btnOutlineText,
});
