import type { ComponentProps } from 'react';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderLogIn } from '@/components/HeaderLogIn';
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
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, sp(8));

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: TAB_BAR_HEIGHT + bottomPad,
          paddingTop: sp(6),
          paddingBottom: bottomPad,
        },
        tabBarLabelStyle: styles.tabLabel,
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
          title: 'InBidz',
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
}

const styles = StyleSheet.create({
  tabLabel: {
    fontFamily: fonts.sans,
    fontSize: fs(10),
    fontWeight: '500',
    marginTop: Platform.OS === 'ios' ? -2 : 0,
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
