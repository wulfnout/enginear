import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TopHeader, T } from '@/components/ui';
import { askAssistant } from '@/lib/api';
import { SUPPORT_EMAIL } from '@/lib/constants';
import { firstName } from '@/lib/format';
import { useAuth } from '@/providers/AuthProvider';
import { useColors, useSettings } from '@/providers/SettingsProvider';
import { BRAND } from '@/theme';

type Turn = { role: 'user' | 'assistant'; content: string };

/** Renders **bold** segments from the assistant. */
function Rich({ text, color }: { text: string; color: string }) {
  const { textScale } = useSettings();
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text style={{ color, fontSize: 16 * textScale, lineHeight: 23 * textScale }}>
      {parts.map((p, i) => (p.startsWith('**') && p.endsWith('**') ? <Text key={i} style={{ fontWeight: '700' }}>{p.slice(2, -2)}</Text> : p))}
    </Text>
  );
}

export default function Assistant() {
  const c = useColors();
  const { textScale } = useSettings();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef<FlatList<Turn>>(null);
  const client = profile?.role === 'client';

  const suggestions = client
    ? ['How do I book a mechanic?', 'How do quotes work?', 'When is my next appointment?', 'Find me a mechanic who comes to me']
    : ['How do I get paid faster?', 'How much did I earn this week?', 'What do I still need to finish setup?', 'How do I raise my rating?'];

  const ask = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    const next: Turn[] = [...turns, { role: 'user', content: question }];
    setTurns(next);
    setText('');
    setBusy(true);
    try {
      const { reply } = await askAssistant(next.slice(-12));
      setTurns([...next, { role: 'assistant', content: reply }]);
    } catch (e) {
      setTurns([...next, { role: 'assistant', content: `${(e as Error).message} You can also email a person at ${SUPPORT_EMAIL}.` }]);
    } finally {
      setBusy(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  };

  const greeting: Turn = { role: 'assistant', content: `Hi ${firstName(profile?.full_name)}! I’m the EngiNear Help Assistant. Ask me anything about ${client ? 'booking, quotes, your car or safety' : 'jobs, pay, your schedule or ratings'}.` };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <TopHeader back title="Help Assistant" showActions={false} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={listRef}
          data={[greeting, ...turns]}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => {
            const mine = item.role === 'user';
            return (
              <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '86%', flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
                {!mine ? <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c.brandSoft, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="construct" size={16} color={c.brand} /></View> : null}
                <View style={{ backgroundColor: mine ? BRAND : c.surface, borderWidth: mine ? 0 : 1, borderColor: c.line, paddingHorizontal: 15, paddingVertical: 11,
                  borderRadius: 18, borderBottomRightRadius: mine ? 5 : 18, borderBottomLeftRadius: mine ? 18 : 5, flexShrink: 1 }}>
                  <Rich text={item.content} color={mine ? '#fff' : c.text} />
                </View>
              </View>
            );
          }}
          ListFooterComponent={
            <View style={{ gap: 8, marginTop: 6 }}>
              {busy ? <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><ActivityIndicator color={c.brand} /><T v="small" muted>Thinking…</T></View> : null}
              {!turns.length ? (
                <>
                  <T v="small" bold muted>Try asking:</T>
                  {suggestions.map((s) => (
                    <Pressable key={s} accessibilityRole="button" onPress={() => ask(s)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: c.line, backgroundColor: c.surface }}>
                      <Ionicons name="chatbubble-ellipses-outline" size={20} color={c.brand} />
                      <T style={{ flex: 1 }}>{s}</T>
                    </Pressable>
                  ))}
                </>
              ) : null}
              <T v="tiny" muted center style={{ marginTop: 8 }}>AI answers can be wrong. In an emergency call 911. To reach a person, email {SUPPORT_EMAIL}.</T>
            </View>
          }
        />
        <View style={{ flexDirection: 'row', gap: 8, padding: 12, paddingBottom: 12 + insets.bottom, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.line }}>
          <TextInput value={text} onChangeText={setText} placeholder="Type your question" placeholderTextColor={c.muted} editable={!busy} accessibilityLabel="Your question"
            onSubmitEditing={() => ask(text)} returnKeyType="send"
            style={{ flex: 1, minHeight: 48, borderWidth: 1.5, borderColor: c.line, borderRadius: 24, paddingHorizontal: 16, color: c.text, fontSize: 16 * textScale, backgroundColor: c.bg }} />
          <Pressable accessibilityRole="button" accessibilityLabel="Send" onPress={() => ask(text)} disabled={busy || !text.trim()}
            style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center', opacity: busy || !text.trim() ? 0.5 : 1 }}>
            <Ionicons name="send" size={20} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
