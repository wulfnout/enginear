import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TopHeader, T } from '@/components/ui';
import { timeOf } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Message } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';
import { useColors, useSettings } from '@/providers/SettingsProvider';
import { BRAND } from '@/theme';

/** Real-time chat between a client and a mechanic. */
export default function Chat() {
  const c = useColors();
  const { textScale } = useSettings();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, profile } = useAuth();
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [name, setName] = useState('Messages');
  const [text, setText] = useState('');
  const listRef = useRef<FlatList<Message>>(null);
  const me = session?.user.id;

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: conv } = await supabase.from('conversations')
        .select('client_id, mechanic_id, client:profiles!conversations_client_id_fkey(full_name), mechanic:profiles!conversations_mechanic_id_fkey(full_name)')
        .eq('id', id).single();
      if (conv && alive) {
        const other = (profile?.role === 'client' ? conv.mechanic : conv.client) as unknown as { full_name: string } | null;
        setName(other?.full_name ?? 'Messages');
      }
      const { data } = await supabase.from('messages').select('*').eq('conversation_id', id).order('created_at');
      if (alive) setMsgs((data ?? []) as Message[]);
    })();
    const ch = supabase.channel(`chat-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` }, (p) => {
        const m = p.new as Message;
        setMsgs((cur) => (cur.some((x) => x.id === m.id) ? cur : [...cur, m]));
      })
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [id, profile?.role]);

  useEffect(() => { setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50); }, [msgs.length]);

  const send = async () => {
    const body = text.trim();
    if (!body || !me) return;
    setText('');
    const { data } = await supabase.from('messages').insert({ conversation_id: id, sender_id: me, body }).select().single();
    if (data) setMsgs((cur) => (cur.some((x) => x.id === data.id) ? cur : [...cur, data as Message]));
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <TopHeader back title={name} showActions={false} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={listRef}
          data={msgs}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          ListHeaderComponent={<T v="tiny" muted center style={{ marginBottom: 8 }}>Keep conversations and payments in the app. Never share card or bank details in chat.</T>}
          ListEmptyComponent={<T v="small" muted center>Say hello to start the conversation.</T>}
          renderItem={({ item }) => {
            const mine = item.sender_id === me;
            return (
              <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '84%' }}>
                <View style={{ backgroundColor: mine ? BRAND : c.surface, borderWidth: mine ? 0 : 1, borderColor: c.line,
                  paddingHorizontal: 15, paddingVertical: 11, borderRadius: 18, borderBottomRightRadius: mine ? 5 : 18, borderBottomLeftRadius: mine ? 18 : 5 }}>
                  <T color={mine ? '#fff' : c.text}>{item.body}</T>
                </View>
                <T v="tiny" muted style={{ alignSelf: mine ? 'flex-end' : 'flex-start', marginTop: 2 }}>{timeOf(item.created_at)}</T>
              </View>
            );
          }}
        />
        <View style={{ flexDirection: 'row', gap: 8, padding: 12, paddingBottom: 12 + insets.bottom, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.line }}>
          <TextInput value={text} onChangeText={setText} placeholder="Write a message" placeholderTextColor={c.muted} multiline accessibilityLabel="Message"
            style={{ flex: 1, minHeight: 48, maxHeight: 120, borderWidth: 1.5, borderColor: c.line, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 12, color: c.text, fontSize: 16 * textScale, backgroundColor: c.bg }} />
          <Pressable accessibilityRole="button" accessibilityLabel="Send" onPress={send} disabled={!text.trim()}
            style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center', opacity: text.trim() ? 1 : 0.5, alignSelf: 'flex-end' }}>
            <Ionicons name="send" size={20} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
