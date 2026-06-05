import type { ComponentProps } from 'react';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { HeaderLogIn } from '@/components/HeaderLogIn';
import { MobileWebTabBar } from '@/components/MobileWebTabBar';
import { WebDesktopLayout } from '@/components/WebDesktopLayout';
import { mobileWebTabBarHeight, useTabBarBottomInset } from '@/lib/tab-bar-insets';
import { useWebLayout } from '@/lib/use-web-layout';
import { colors, fonts, fs, sp } from '@/constants/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const TAB_BAR_HEIGHT = 49;

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return (
    <Ionicons
      name={name}
      size={24}
      color={focused ? colors.accent : colors.textMuted}
    />
  );
}

export default function TabLayout() {
  const bottomPad = useTabBarBottomInset();
  const { isDesktop } = useWebLayout();
  const isMobileWeb = Platform.OS === 'web' && !isDesktop;
  const tabBarTotalHeight = isMobileWeb
    ? mobileWebTabBarHeight(bottomPad)
    : TAB_BAR_HEIGHT + bottomPad;

  const tabs = (
    <Tabs
      tabBar={
        isMobileWeb
          ? (props: BottomTabBarProps) => <MobileWebTabBar {...props} />
          : undefined
      }
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarShowLabel: !isDesktop,
        tabBarHideOnKeyboard: false,
        tabBarStyle: isDesktop
          ? { display: 'none', height: 0 }
          : isMobileWeb
            ? {
                backgroundColor: 'transparent',
                borderTopWidth: 0,
                height: tabBarTotalHeight,
                paddingTop: 0,
                paddingBottom: 0,
              }
            : {
                backgroundColor: colors.tabBar,
                borderTopColor: colors.tabBarBorder,
                borderTopWidth: StyleSheet.hairlineWidth,
                height: tabBarTotalHeight,
                paddingTop: sp(6),
                paddingBottom: bottomPad,
              },
        tabBarLabelStyle: isMobileWeb ? styles.tabLabelMobileWeb : styles.tabLabel,
        headerShown: !isDesktop,
        headerStyle: styles.header,
        headerTintColor: colors.text,
        headerTitleStyle: styles.headerTitle,
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'INBIDZ',
          headerRight: () => <HeaderLogIn />,
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Shop',
          tabBarLabel: 'Shop',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'bag' : 'bag-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarLabel: 'Create',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'add-circle' : 'add-circle-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );

  if (isDesktop) {
    return <WebDesktopLayout>{tabs}</WebDesktopLayout>;
  }

  return tabs;
}

const styles = StyleSheet.create({
  tabLabel: {
    fontFamily: fonts.sans,
    fontSize: fs(10),
    fontWeight: '500',
    marginTop: Platform.OS === 'ios' ? -2 : 0,
  },
  tabLabelMobileWeb: {
    fontFamily: fonts.sans,
    fontSize: fs(11),
    fontWeight: '500',
    marginTop: sp(2),
    lineHeight: fs(14),
  },
  header: {
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontFamily: fonts.sans,
    fontWeight: '700',
    fontSize: fs(17),
    color: colors.text,
  },
});
