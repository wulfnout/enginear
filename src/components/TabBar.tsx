import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import type { IconName } from '@/lib/constants';
import { useColors, useSettings } from '@/providers/SettingsProvider';

/** Bottom tabs with large icons and always-visible labels. */
export function AppTabs({ tabs }: { tabs: { name: string; title: string; icon: IconName; iconOn: IconName }[] }) {
  const c = useColors();
  const { textScale } = useSettings();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.brand,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.line, minHeight: 64 },
        tabBarLabelStyle: { fontSize: 12.5 * Math.min(textScale, 1.15), fontWeight: '700' },
        tabBarItemStyle: { paddingVertical: 4 },
      }}
    >
      {tabs.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarAccessibilityLabel: t.title,
            tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? t.iconOn : t.icon} size={26} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
