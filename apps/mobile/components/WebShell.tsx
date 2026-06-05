import { Platform, useWindowDimensions, View, type ViewProps } from 'react-native';
import { colors, layout } from '@/constants/theme';

type Props = ViewProps & {
  wide?: boolean;
};

/** On web: full-width shell for desktop layout; narrow column for mobile browsers. */
export function WebShell({ children, wide, style, ...rest }: Props) {
  if (Platform.OS !== 'web') {
    return (
      <View style={[{ flex: 1 }, style]} {...rest}>
        {children}
      </View>
    );
  }

  const { width } = useWindowDimensions();
  const isDesktop = width >= layout.webBreakpoint;

  if (isDesktop) {
    return (
      <View style={[{ flex: 1, backgroundColor: colors.bg, minHeight: '100%' }, style]} {...rest}>
        {children}
      </View>
    );
  }

  const maxWidth = wide ? layout.maxWidthWide : layout.maxWidth;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center' }}>
      <View style={[{ flex: 1, width: '100%', maxWidth, alignSelf: 'stretch' }, style]} {...rest}>
        {children}
      </View>
    </View>
  );
}
