import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { TopHeader, Card, EmptyState, T } from '@/components/ui';
import { useData } from '@/hooks/useData';
import { dayLabel, timeOf } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { AppNotification } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';
import { useColors } from '@/providers/SettingsProvider';

export default function NotificationsScreen() {
  const c = useColors();
  const { profile, refresh: refreshAuth } = useAuth();
  const { data, refreshing, refresh } = useData(async () => {
    const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(100);
    return (data ?? []) as AppNotification[];
  });

  // Mark everything read once the person has seen the list.
  useFocusEffect(useCallback(() => {
    const t = setTimeout(async () => {
      await supabase.from('notifications').update({ read: true }).eq('read', false);
      refreshAuth();
    }, 1500);
    return () => clearTimeout(t);
  }, [refreshAuth]));

  const open = (n: AppNotification) => {
    if (n.data?.conversation_id) router.push({ pathname: '/chat/[id]', params: { id: n.data.conversation_id } });
    else if (n.data?.booking_id) router.push(profile?.role === 'mechanic' ? '/schedule' : '/bookings');
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <TopHeader back title="Alerts" showActions={false} />
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />} contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}>
        {data?.length ? data.map((n) => (
          <Card key={n.id} onPress={() => open(n)} style={{ flexDirection: 'row', gap: 12, borderColor: n.read ? c.line : c.brand }}>
            <Ionicons name={n.data?.conversation_id ? 'chatbubble-outline' : 'notifications-outline'} size={24} color={c.brand} />
            <View style={{ flex: 1, gap: 2 }}>
              <T v="label">{n.title}</T>
              {n.body ? <T v="small">{n.body}</T> : null}
              <T v="tiny" muted>{dayLabel(n.created_at)} · {timeOf(n.created_at)}</T>
            </View>
          </Card>
        )) : data ? <EmptyState icon="notifications-outline" title="You’re all caught up" /> : null}
      </ScrollView>
    </View>
  );
}
