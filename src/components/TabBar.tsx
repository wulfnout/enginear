import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import type { IconName } from '@/lib/constants';
import { useColors, useSettings } from '@/providers/SettingsProvider';
import { FONT } from '@/theme';

/** Bottom tabs with large icons and always-visible labels. */
export function AppTabs({ tabs }: { tabs: { name: string; title: string; icon: IconName; iconOn: IconName; hidden?: boolean }[] }) {
  const c = useColors();
  const { textScale } = useSettings();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.brand,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.line, minHeight: 68 },
        tabBarLabelStyle: { fontFamily: FONT, fontSize: 13 * Math.min(textScale, 1.15), fontWeight: '600' },
        tabBarItemStyle: { paddingVertical: 4 },
      }}
    >
      {tabs.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            href: t.hidden ? null : undefined,
            tabBarAccessibilityLabel: t.title,
            tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? t.iconOn : t.icon} size={28} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
