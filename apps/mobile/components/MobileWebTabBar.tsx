import { BottomTabBar, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, sp } from '@/constants/theme';
import {
  MOBILE_WEB_TAB_CONTENT_HEIGHT,
  useTabBarBottomInset,
} from '@/lib/tab-bar-insets';

type Props = BottomTabBarProps & {
  style?: StyleProp<ViewStyle>;
};

export function MobileWebTabBar({ style, ...rest }: Props) {
  const bottomInset = useTabBarBottomInset();

  return (
    <View style={styles.shell}>
      <View style={[styles.content, { height: MOBILE_WEB_TAB_CONTENT_HEIGHT }]}>
        <BottomTabBar
          {...rest}
          style={[
            style,
            styles.bar,
            {
              height: MOBILE_WEB_TAB_CONTENT_HEIGHT,
              paddingBottom: 0,
              paddingTop: sp(4),
            },
          ]}
        />
      </View>
      {bottomInset > 0 ? (
        <View style={[styles.safeFill, { height: bottomInset }]} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: colors.tabBar,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.tabBarBorder,
    width: '100%',
  },
  content: {
    overflow: 'visible',
    backgroundColor: colors.tabBar,
    zIndex: 1,
  },
  bar: {
    backgroundColor: colors.tabBar,
    borderTopWidth: 0,
    width: '100%',
  },
  safeFill: {
    backgroundColor: colors.tabBar,
    width: '100%',
  },
});
