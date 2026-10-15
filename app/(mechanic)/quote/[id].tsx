import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';
import { Button, Card, Field, Footer, KV, Loading, Notice, Row, Screen, Segmented, T, TopHeader } from '@/components/ui';
import { useData } from '@/hooks/useData';
import { getBooking, sendQuote } from '@/lib/api';
import { firstName, money } from '@/lib/format';
import { friendlyError } from '@/lib/supabase';
import type { QuoteItem } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';
import { useColors } from '@/providers/SettingsProvider';

type Line = { kind: 'part' | 'labor'; desc: string; price: string };
const toCents = (p: string) => Math.round(Number(p.replace(/[^\d.]/g, '')) * 100) || 0;

/** Mechanic builds a parts + labor quote. The client approves or declines it in their app. */
export default function QuoteBuilder() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { mechanic } = useAuth();
  const { data: b, loading } = useData(() => getBooking(id), [id]);
  const rate = mechanic?.hourly_rate ?? 90;
  const [lines, setLines] = useState<Line[]>([{ kind: 'part', desc: '', price: '' }]);
  const [laborHours, setLaborHours] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading && !b) return <Loading />;
  if (!b) return <Screen header={<TopHeader back title="Send a quote" />}><T>We couldn’t find this job.</T></Screen>;
  const who = firstName(b.client?.full_name) || 'your client';

  const hrs = Number(laborHours) || 0;
  const items: QuoteItem[] = [
    ...lines.filter((l) => l.desc.trim() && toCents(l.price) > 0).map((l) => ({ kind: l.kind, desc: l.desc.trim(), cents: toCents(l.price) })),
    ...(hrs > 0 ? [{ kind: 'labor' as const, desc: `Labor, ${hrs} hr at $${rate}/hr`, cents: Math.round(hrs * rate * 100) }] : []),
  ];
  const parts = items.filter((i) => i.kind === 'part').reduce((s, i) => s + i.cents, 0);
  const labor = items.filter((i) => i.kind === 'labor').reduce((s, i) => s + i.cents, 0);
  const youGet = Math.round(labor * 0.9) + parts;

  const set = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const send = () => Alert.alert(`Send ${money(parts + labor)} quote?`, `${who} approves or declines it in the app. Nothing is billed unless they approve.`, [
    { text: 'Not yet', style: 'cancel' },
    { text: 'Send quote', onPress: async () => {
      setBusy(true);
      try {
        await sendQuote(b.id, items, note.trim() || undefined);
        Alert.alert('Quote sent', `We let ${who} know. You’ll get a notification when they decide.`);
        router.back();
      } catch (e) { Alert.alert('Quote not sent', friendlyError(e)); } finally { setBusy(false); }
    } },
  ]);

  return (
    <Screen header={<TopHeader back title="Send a quote" showActions={false} />}
      footer={<Footer>
        <View style={{ flex: 1 }}>
          <T v="price">{money(parts + labor)}</T>
          <T v="tiny" muted>You get {money(youGet)}</T>
        </View>
        <Button icon="send" title="Send to client" disabled={!items.length} loading={busy} onPress={send} />
      </Footer>}>
      <Card>
        <T v="h3">{b.service} · {b.vehicle_label}</T>
        {b.notes ? <T v="small" muted>Client said: “{b.notes}”</T> : null}
      </Card>
      <Notice tone="brand" text="List the parts and labor this needs. Your client sees every line and approves or declines it in the app before anything is added to their bill." />

      <T v="h3">Parts & other lines</T>
      {lines.map((l, i) => (
        <Card key={i}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Segmented value={l.kind} onChange={(k) => set(i, { kind: k })} options={[
                { value: 'part', label: 'Part', icon: 'cube-outline' }, { value: 'labor', label: 'Labor', icon: 'construct-outline' },
              ]} />
            </View>
            {lines.length > 1 ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Remove line" hitSlop={10} onPress={() => setLines(lines.filter((_, j) => j !== i))} style={{ paddingLeft: 10 }}>
                <Ionicons name="trash-outline" size={22} color={c.bad} />
              </Pressable>
            ) : null}
          </Row>
          <Field label="Description" value={l.desc} onChangeText={(t) => set(i, { desc: t.slice(0, 120) })}
            placeholder={l.kind === 'part' ? 'Front brake pads (ceramic)' : 'Replace front rotors'} />
          <Row>
            <T v="h3">$</T>
            <TextInput value={l.price} onChangeText={(t) => set(i, { price: t.replace(/[^\d.]/g, '') })} keyboardType="decimal-pad" placeholder="0.00"
              placeholderTextColor={c.muted} accessibilityLabel="Price"
              style={{ flex: 1, minHeight: 48, borderWidth: 1.5, borderColor: c.line, borderRadius: 12, paddingHorizontal: 12, color: c.text, fontSize: 17, backgroundColor: c.surface }} />
          </Row>
        </Card>
      ))}
      <Button kind="ghost" icon="add" title="Add a line" onPress={() => setLines([...lines, { kind: 'part', desc: '', price: '' }])} />

      <Card>
        <T v="h3">Labor time</T>
        <Row>
          <TextInput value={laborHours} onChangeText={(t) => setLaborHours(t.replace(/[^\d.]/g, '').slice(0, 4))} keyboardType="decimal-pad" placeholder="0"
            placeholderTextColor={c.muted} accessibilityLabel="Labor hours"
            style={{ width: 90, minHeight: 48, borderWidth: 1.5, borderColor: c.line, borderRadius: 12, paddingHorizontal: 12, color: c.text, fontSize: 17, backgroundColor: c.surface }} />
          <T style={{ flex: 1 }}>hours × ${rate}/hr</T>
          <T v="label">{money(Math.round(hrs * rate * 100))}</T>
        </Row>
        <T v="tiny" muted>Leave at 0 if the price is in the lines above.</T>
      </Card>

      <Field label="Note for your client (optional)" value={note} onChangeText={setNote} multiline
        placeholder="Pads are down to 2 mm and the rotors are scored. I can do both today." />

      <Card>
        <KV k="Parts" v={money(parts)} />
        <KV k="Labor" v={money(labor)} />
        <KV k="Quote total" v={money(parts + labor)} bold />
        <T v="tiny" muted>You keep 90% of labor and 100% of parts.</T>
      </Card>
    </Screen>
  );
}
