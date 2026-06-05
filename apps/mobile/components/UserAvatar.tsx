import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, fs } from '@/constants/theme';

type Props = {
  uri?: string | null;
  name?: string | null;
  username?: string | null;
  size?: number;
  borderRadius?: number;
};

export function UserAvatar({ uri, name, username, size = 32, borderRadius }: Props) {
  const radius = borderRadius ?? (size >= 48 ? size / 2 : size * 0.25);
  const initial = ((name || username || '?')[0] ?? '?').toUpperCase();

  if (uri?.trim()) {
    return (
      <Image
        source={{ uri: uri.trim() }}
        style={{ width: size, height: size, borderRadius: radius }}
        contentFit="cover"
        accessibilityLabel={name || username || 'User avatar'}
      />
    );
  }

  return (
    <View
      style={[
        styles.placeholder,
        { width: size, height: size, borderRadius: radius },
      ]}
    >
      <Text style={[styles.initial, { fontSize: fs(Math.max(12, size * 0.42)) }]}>
        {initial}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontFamily: fonts.sans,
    fontWeight: '600',
    color: colors.accent,
  },
});
