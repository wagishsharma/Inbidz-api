import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, fonts, fs, radii, sp } from '@/constants/theme';

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  /** 0–1 when known; null for indeterminate (e.g. publishing post). */
  progress: number | null;
};

export function UploadProgressOverlay({ visible, title, subtitle, progress }: Props) {
  const pct =
    progress != null ? Math.min(100, Math.max(0, Math.round(progress * 100))) : null;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          {pct != null ? (
            <>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${pct}%` }]} />
              </View>
              <Text style={styles.percent}>{pct}%</Text>
            </>
          ) : (
            <ActivityIndicator size="large" color={colors.accent} style={styles.spinner} />
          )}
          <Text style={styles.hint}>Keep the app open until upload finishes.</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: sp(24),
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: sp(24),
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.sans,
    fontSize: fs(17),
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: fs(14),
    color: colors.textSecondary,
    marginTop: sp(6),
    textAlign: 'center',
  },
  barTrack: {
    width: '100%',
    height: sp(8),
    backgroundColor: colors.bgMuted,
    borderRadius: sp(4),
    marginTop: sp(20),
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: sp(4),
  },
  percent: {
    fontFamily: fonts.sans,
    fontSize: fs(28),
    fontWeight: '700',
    color: colors.accent,
    marginTop: sp(12),
  },
  spinner: {
    marginTop: sp(20),
  },
  hint: {
    fontFamily: fonts.sans,
    fontSize: fs(12),
    color: colors.textMuted,
    marginTop: sp(16),
    textAlign: 'center',
  },
});
