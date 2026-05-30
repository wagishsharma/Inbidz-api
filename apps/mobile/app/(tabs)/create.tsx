import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import type { CommerceMode } from '@inbidz/shared';
import { ShareMomentModal } from '@/components/ShareMomentModal';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { showAlert } from '@/lib/alert';
import { colors, fonts, fs, layout, radii, shared, sp } from '@/constants/theme';
import { getContentWidth } from '@/lib/dimensions';

const THUMB_SIZE = (getContentWidth() - layout.contentPadding * 2 - sp(16)) / 3;

type LocalMedia = {
  uri: string;
  type: 'photo' | 'video';
  width: number;
  height: number;
  duration?: number;
};

const COMMERCE_OPTIONS: { value: CommerceMode; label: string }[] = [
  { value: 'none', label: 'No shop — just share' },
  { value: 'buy_now', label: 'Let people buy this' },
  { value: 'auction', label: 'Run an auction' },
  { value: 'offers', label: 'Accept offers' },
  { value: 'buy_now_and_offers', label: 'Buy now + offers' },
];

function MediaThumbnail({ item, onRemove }: { item: LocalMedia; onRemove: () => void }) {
  const isLandscape = item.width > item.height;
  return (
    <View style={styles.thumbWrap}>
      <Image
        source={{ uri: item.uri }}
        style={[styles.thumb, isLandscape && styles.thumbLandscape]}
        contentFit="cover"
      />
      {item.type === 'video' && (
        <View style={styles.videoBadge}>
          <Text style={styles.videoBadgeText}>▶</Text>
        </View>
      )}
      <Pressable style={styles.removeBtn} onPress={onRemove} hitSlop={8}>
        <Text style={styles.removeBtnText}>✕</Text>
      </Pressable>
    </View>
  );
}

export default function CreateScreen() {
  const { accessToken, login } = useAuth();
  const [step, setStep] = useState(1);
  const [caption, setCaption] = useState('');
  const [media, setMedia] = useState<LocalMedia[]>([]);
  const [commerceMode, setCommerceMode] = useState<CommerceMode>('none');
  const [price, setPrice] = useState('');
  const [inventory, setInventory] = useState('1');
  const [auctionHours, setAuctionHours] = useState('24');
  const [submitting, setSubmitting] = useState(false);
  const [shareModal, setShareModal] = useState<{
    title: string;
    shortUrl: string;
    whatsappMessage: string;
    momentId?: string;
  } | null>(null);

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 0.9,
      videoMaxDuration: 60,
    });
    if (result.canceled) return;
    const items: LocalMedia[] = result.assets.map((a) => ({
      uri: a.uri,
      type: a.type === 'video' ? 'video' : 'photo',
      width: a.width ?? 1080,
      height: a.height ?? 1080,
      duration: a.duration ? a.duration / 1000 : undefined,
    }));
    setMedia((prev) => [...prev, ...items]);
  };

  const removeMedia = (index: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadMediaItem = async (
    m: LocalMedia,
    index: number,
    token: string
  ): Promise<{
    type: 'photo' | 'video';
    r2Key: string;
    publicUrl?: string;
    width: number;
    height: number;
    duration?: number;
    orderIndex: number;
  }> => {
    const ext = m.type === 'video' ? 'mp4' : 'jpg';
    const contentType = m.type === 'video' ? 'video/mp4' : 'image/jpeg';
    const filename = `upload-${Date.now()}-${index}.${ext}`;

    try {
      const uploaded = await api.uploadR2(token, m.uri, filename, contentType);
      return {
        type: m.type,
        r2Key: uploaded.key,
        publicUrl: uploaded.publicUrl,
        width: m.width,
        height: m.height,
        duration: m.duration,
        orderIndex: index,
      };
    } catch (r2Err) {
      const message = r2Err instanceof Error ? r2Err.message : '';
      // R2 not configured or token lacks bucket write — fall back to local dev storage
      if (
        message.includes('not configured') ||
        message.includes('Object Read & Write') ||
        message.includes('Access Denied')
      ) {
        const dev = await api.uploadDev(token, m.uri, filename);
        return {
          type: m.type,
          r2Key: dev.key,
          publicUrl: dev.publicUrl,
          width: m.width,
          height: m.height,
          duration: m.duration,
          orderIndex: index,
        };
      }
      throw r2Err;
    }
  };

  const publish = async () => {
    if (!accessToken) {
      await login();
      return;
    }
    if (media.length === 0) {
      showAlert('Add media', 'Pick at least one photo or video.');
      return;
    }

    if (commerceMode !== 'none') {
      const shop = await api.getShop(accessToken);
      if (!shop.setupComplete) {
        router.push('/shop/setup');
        return;
      }
    }

    setSubmitting(true);
    try {
      const uploaded = await Promise.all(
        media.map((m, index) => uploadMediaItem(m, index, accessToken))
      );

      const postType =
        uploaded.length > 1 ? 'carousel' : uploaded[0].type === 'video' ? 'video' : 'photo';

      const needsPrice = ['buy_now', 'buy_now_and_offers', 'auction'].includes(commerceMode);
      const body: Record<string, unknown> = {
        caption,
        postType,
        commerceMode,
        media: uploaded,
      };

      if (commerceMode !== 'none') {
        const commerce: Record<string, unknown> = {
          currency: 'INR',
          inventory: parseInt(inventory, 10) || 1,
        };
        if (needsPrice && price) commerce.price = parseFloat(price);
        if (commerceMode === 'auction' || commerceMode === 'buy_now_and_offers') {
          const hours = parseInt(auctionHours, 10) || 24;
          commerce.auctionStart = new Date().toISOString();
          commerce.auctionEnd = new Date(Date.now() + hours * 3600000).toISOString();
          commerce.minBidIncrement = 100;
        }
        body.commerce = commerce;
      }

      const res = await api.createPost(accessToken, body);

      if (res.shareMoment) {
        setShareModal({
          title: caption || 'My post',
          shortUrl: res.shareMoment.shortUrl,
          whatsappMessage: res.shareMoment.whatsappMessage,
          momentId: res.shareMoment.id,
        });
        setStep(4);
      } else {
        showAlert('Published!', 'Your post is live.');
        router.push('/(tabs)');
      }

      setCaption('');
      setMedia([]);
      setCommerceMode('none');
      setPrice('');
      setStep(1);
    } catch (e) {
      showAlert('Error', e instanceof Error ? e.message : 'Failed to publish');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Create post</Text>
      <Text style={styles.step}>Step {step} of 3</Text>

      {step === 1 && (
        <>
          {media.length > 0 ? (
            <FlatList
              data={media}
              keyExtractor={(_, i) => `${media[i].uri}-${i}`}
              numColumns={3}
              scrollEnabled={false}
              columnWrapperStyle={styles.thumbRow}
              contentContainerStyle={styles.thumbGrid}
              renderItem={({ item, index }) => (
                <MediaThumbnail item={item} onRemove={() => removeMedia(index)} />
              )}
            />
          ) : null}

          <Pressable style={styles.pickBtn} onPress={pickMedia}>
            <Text style={styles.pickText}>
              {media.length ? '+ Add more' : 'Pick photos or videos'}
            </Text>
          </Pressable>

          <TextInput
            style={[styles.input, styles.captionInput]}
            placeholder="Write a caption..."
            placeholderTextColor={colors.textMuted}
            value={caption}
            onChangeText={setCaption}
            multiline
          />
          <Pressable style={styles.nextBtn} onPress={() => setStep(2)} disabled={!media.length}>
            <Text style={styles.nextText}>Next: Commerce</Text>
          </Pressable>
        </>
      )}

      {step === 2 && (
        <>
          <Text style={styles.label}>How should people interact?</Text>
          {COMMERCE_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={[styles.option, commerceMode === opt.value && styles.optionActive]}
              onPress={() => setCommerceMode(opt.value)}
            >
              <Text style={styles.optionText}>{opt.label}</Text>
            </Pressable>
          ))}

          {commerceMode !== 'none' && (
            <>
              {['buy_now', 'buy_now_and_offers', 'auction'].includes(commerceMode) && (
                <TextInput
                  style={styles.input}
                  placeholder="Price (INR)"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={price}
                  onChangeText={setPrice}
                />
              )}
              {(commerceMode === 'buy_now' || commerceMode === 'buy_now_and_offers') && (
                <TextInput
                  style={styles.input}
                  placeholder="Inventory"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={inventory}
                  onChangeText={setInventory}
                />
              )}
              {(commerceMode === 'auction' || commerceMode === 'buy_now_and_offers') && (
                <TextInput
                  style={styles.input}
                  placeholder="Auction duration (hours)"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={auctionHours}
                  onChangeText={setAuctionHours}
                />
              )}
            </>
          )}

          <View style={styles.row}>
            <Pressable style={styles.backBtn} onPress={() => setStep(1)}>
              <Text style={styles.backText}>Back</Text>
            </Pressable>
            <Pressable style={styles.nextBtn} onPress={() => setStep(3)}>
              <Text style={styles.nextText}>Review</Text>
            </Pressable>
          </View>
        </>
      )}

      {step === 3 && (
        <>
          {media[0] && (
            <Image
              source={{ uri: media[0].uri }}
              style={styles.reviewThumb}
              contentFit="cover"
            />
          )}
          <Text style={styles.summary}>{caption || '(no caption)'}</Text>
          <Text style={styles.summary}>Mode: {commerceMode}</Text>
          {price ? <Text style={styles.summary}>Price: ₹{price}</Text> : null}
          <Pressable style={styles.publishBtn} onPress={publish} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.publishText}>Publish</Text>
            )}
          </Pressable>
          <Pressable style={styles.backBtn} onPress={() => setStep(2)}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        </>
      )}

      {shareModal && (
        <ShareMomentModal
          visible={!!shareModal}
          title={shareModal.title}
          shortUrl={shareModal.shortUrl}
          whatsappMessage={shareModal.whatsappMessage}
          momentId={shareModal.momentId}
          onClose={() => {
            setShareModal(null);
            router.push('/(tabs)');
          }}
          onShared={(platform) => {
            if (accessToken && shareModal.momentId) {
              api.markShared(accessToken, shareModal.momentId, platform);
            }
          }}
          onSkip={() => {
            if (accessToken) {
              api.trackOnboarding(accessToken, 'share_step_skipped', {
                postId: shareModal.shortUrl,
              });
            }
          }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: shared.screen,
  content: { padding: layout.contentPadding, paddingBottom: sp(40) },
  title: {
    fontFamily: fonts.sans,
    color: colors.text,
    fontSize: fs(22),
    fontWeight: '700',
  },
  step: {
    fontFamily: fonts.sans,
    color: colors.textMuted,
    fontSize: fs(12),
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: sp(20),
  },
  thumbGrid: { marginBottom: sp(12) },
  thumbRow: { gap: sp(8), marginBottom: sp(8) },
  thumbWrap: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radii.sm,
    overflow: 'hidden',
    backgroundColor: colors.bgMuted,
    position: 'relative',
  },
  thumb: { width: '100%', height: '100%' },
  thumbLandscape: { backgroundColor: colors.bgMuted },
  videoBadge: {
    position: 'absolute',
    bottom: sp(6),
    left: sp(6),
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radii.sm,
    paddingHorizontal: sp(6),
    paddingVertical: sp(2),
  },
  videoBadgeText: { color: colors.surface, fontSize: fs(10) },
  removeBtn: {
    position: 'absolute',
    top: sp(4),
    right: sp(4),
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: sp(22),
    height: sp(22),
    borderRadius: sp(11),
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: { color: colors.surface, fontSize: fs(12), fontWeight: '600' },
  pickBtn: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderStyle: 'dashed',
    padding: sp(24),
    borderRadius: radii.sm,
    alignItems: 'center',
    marginBottom: sp(16),
    backgroundColor: colors.surface,
  },
  pickText: {
    fontFamily: fonts.sans,
    color: colors.textSecondary,
    fontWeight: '500',
    fontSize: fs(14),
  },
  input: {
    ...shared.input,
    marginBottom: sp(12),
  },
  captionInput: { minHeight: sp(100), textAlignVertical: 'top' },
  label: {
    fontFamily: fonts.sans,
    color: colors.text,
    fontWeight: '500',
    fontSize: fs(14),
    marginBottom: sp(12),
  },
  option: {
    padding: sp(14),
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    marginBottom: sp(8),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  optionActive: { borderColor: colors.text, borderWidth: 1 },
  optionText: {
    fontFamily: fonts.sans,
    color: colors.text,
    fontSize: fs(14),
  },
  nextBtn: {
    ...shared.btnPrimary,
    marginTop: sp(8),
    flex: 1,
  },
  nextText: shared.btnPrimaryText,
  backBtn: { padding: sp(14), alignItems: 'center' },
  backText: {
    fontFamily: fonts.sans,
    color: colors.textMuted,
    fontSize: fs(13),
  },
  row: { flexDirection: 'row', gap: sp(12), alignItems: 'center' },
  publishBtn: {
    ...shared.btnPrimary,
    marginBottom: sp(12),
  },
  publishText: {
    ...shared.btnPrimaryText,
    fontSize: fs(15),
  },
  summary: {
    fontFamily: fonts.sans,
    color: colors.textSecondary,
    marginBottom: sp(8),
    fontSize: fs(14),
  },
  reviewThumb: {
    width: '100%',
    height: sp(200),
    borderRadius: radii.sm,
    marginBottom: sp(16),
    backgroundColor: colors.bgMuted,
  },
});
