import { router } from 'expo-router';
import React from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useData } from '@/hooks/useData';
import { dayLabel, timeOf } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useColors } from '@/providers/SettingsProvider';
import { Avatar, TopHeader, Card, EmptyState, T } from './ui';

type Row = {
  id: string; client_id: string; mechanic_id: string; last_message: string | null; last_message_at: string;
  client: { full_name: string; avatar_url: string | null } | null;
  mechanic: { full_name: string; avatar_url: string | null } | null;
};

export function ConversationList({ asTab }: { asTab?: boolean }) {
  const c = useColors();
  const { profile } = useAuth();
  const { data, refreshing, refresh } = useData(async () => {
    const { data, error } = await supabase.from('conversations')
      .select('*, client:profiles!conversations_client_id_fkey(full_name, avatar_url), mechanic:profiles!conversations_mechanic_id_fkey(full_name, avatar_url)')
      .order('last_message_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Row[];
  }, [], ['conversations']);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <TopHeader title="Messages" back={!asTab} />
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />} contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}>
        {data?.length ? data.map((r) => {
          const other = profile?.role === 'client' ? r.mechanic : r.client;
          const otherId = profile?.role === 'client' ? r.mechanic_id : r.client_id;
          return (
            <Card key={r.id} onPress={() => router.push({ pathname: '/chat/[id]', params: { id: r.id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Avatar name={other?.full_name} url={other?.avatar_url} id={otherId} size={52} />
              <View style={{ flex: 1 }}>
                <T v="h3" numberOfLines={1}>{other?.full_name ?? 'Conversation'}</T>
                <T v="small" muted numberOfLines={1}>{r.last_message ?? 'Say hello'}</T>
              </View>
              <T v="tiny" muted>{dayLabel(r.last_message_at) === 'Today' ? timeOf(r.last_message_at) : dayLabel(r.last_message_at)}</T>
            </Card>
          );
        }) : data ? (
          <EmptyState icon="chatbubbles-outline" title="No messages yet"
            text={profile?.role === 'client' ? 'You can message a mechanic from their page.' : 'When you accept a job you can message the client here.'} />
        ) : null}
      </ScrollView>
    </View>
  );
}
