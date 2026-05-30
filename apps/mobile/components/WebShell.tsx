import { Platform, View, type ViewProps } from 'react-native';
import { colors, layout } from '@/constants/theme';

type Props = ViewProps & {
  wide?: boolean;
};

/** Centers and constrains content width on web */
export function WebShell({ children, wide, style, ...rest }: Props) {
  if (Platform.OS !== 'web') {
    return (
      <View style={[{ flex: 1 }, style]} {...rest}>
        {children}
      </View>
    );
  }

  const maxWidth = wide ? layout.maxWidthWide : layout.maxWidth;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center' }}>
      <View style={[{ flex: 1, width: '100%', maxWidth }, style]} {...rest}>
        {children}
      </View>
    </View>
  );
}
