import { Modal, Pressable, StyleSheet, Text, View, Linking, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { colors, fonts, fs, radii, shared, sp } from '@/constants/theme';
import { shareText } from '@/lib/share-post';

type Props = {
  visible: boolean;
  title: string;
  shortUrl: string;
  whatsappMessage: string;
  shareImageUrl?: string;
  momentId?: string;
  onClose: () => void;
  onShared?: (platform: string) => void;
  onSkip?: () => void;
};

export function ShareMomentModal({
  visible,
  title,
  shortUrl,
  whatsappMessage,
  onClose,
  onShared,
  onSkip,
}: Props) {
  const trackShare = (platform: string) => {
    onShared?.(platform);
  };

  const shareWhatsApp = async () => {
    const url = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;
    await Linking.openURL(url);
    trackShare('whatsapp');
  };

  const shareNative = async () => {
    await shareText(whatsappMessage);
    trackShare('native');
  };

  const copyLink = async () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(shortUrl);
    } else {
      await Clipboard.setStringAsync(shortUrl);
    }
    trackShare('copy');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.heading}>Share</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.url}>{shortUrl}</Text>

          <Pressable style={styles.btnWhatsApp} onPress={shareWhatsApp}>
            <Text style={styles.btnText}>WhatsApp</Text>
          </Pressable>
          <Pressable style={styles.btnSecondary} onPress={shareNative}>
            <Text style={styles.btnTextSecondary}>Share elsewhere</Text>
          </Pressable>
          <Pressable style={styles.btnSecondary} onPress={copyLink}>
            <Text style={styles.btnTextSecondary}>Copy link</Text>
          </Pressable>

          <Pressable
            style={styles.skip}
            onPress={() => {
              onSkip?.();
              onClose();
            }}
          >
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    padding: sp(24),
    paddingBottom: sp(40),
  },
  heading: {
    fontFamily: fonts.sans,
    color: colors.textMuted,
    fontSize: fs(11),
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  title: {
    fontFamily: fonts.sans,
    color: colors.text,
    fontSize: fs(18),
    fontWeight: '600',
    marginTop: sp(8),
  },
  url: {
    fontFamily: fonts.sans,
    color: colors.textSecondary,
    fontSize: fs(12),
    marginTop: sp(8),
    marginBottom: sp(20),
  },
  btnWhatsApp: {
    backgroundColor: '#25D366',
    padding: sp(14),
    borderRadius: radii.sm,
    alignItems: 'center',
    marginBottom: sp(10),
  },
  btnSecondary: {
    ...shared.btnOutline,
    marginBottom: sp(10),
  },
  btnText: {
    fontFamily: fonts.sans,
    color: colors.surface,
    fontWeight: '600',
    fontSize: fs(14),
  },
  btnTextSecondary: shared.btnOutlineText,
  skip: { alignItems: 'center', marginTop: sp(8) },
  skipText: {
    fontFamily: fonts.sans,
    color: colors.textMuted,
    fontSize: fs(13),
  },
});
