import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { JobPhotos, RunningBill } from '@/components/JobSteps';
import { TopHeader, Button, Card, Footer, Loading, Notice, Row, Screen, Segmented, T } from '@/components/ui';
import { useData } from '@/hooks/useData';
import { approveCompletion, getBooking, startConversation } from '@/lib/api';
import { firstName, money } from '@/lib/format';
import { friendlyError } from '@/lib/supabase';
import { useColors } from '@/providers/SettingsProvider';

const BASE_ITEMS = [
  'The work matches what I booked and approved',
  'The mechanic explained what they did',
  'The car starts and runs normally',
  'No new warning lights on the dash',
  'Old parts were shown to me or returned (if any were replaced)',
  'No new scratches, dents, grease or spills',
];
/** Extra checks for some services. */
const SERVICE_ITEMS: Record<string, string[]> = {
  'Oil change': ['Oil level looks right on the dipstick', 'Oil change reminder sticker or note added'],
  Brakes: ['Brakes feel firm and quiet on a short test drive'],
  Battery: ['Car starts on the first try'],
  'Tires & rotation': ['Tire pressure set; lug nuts tight'],
  'AC & heating': ['AC blows cold and the heat blows warm'],
  Diagnostics: ['I understand what’s wrong and my options'],
};

/** The client checks the finished work, in person with a checklist or from the mechanic's photos. */
export default function ApproveWork() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: b, loading } = useData(() => getBooking(id), [id], ['bookings']);
  const hasPhotos = !!b?.completion_requested_at && (b?.completion_photos.length ?? 0) > 0;
  const [method, setMethod] = useState<'in_person' | 'photos' | null>(null);
  const how = method ?? (hasPhotos && b?.photos_requested_at ? 'photos' : 'in_person');
  const items = useMemo(() => [...BASE_ITEMS, ...(SERVICE_ITEMS[b?.service ?? ''] ?? [])], [b?.service]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  if (loading && !b) return <Loading />;
  if (!b) return <Screen header={<TopHeader back title="Check the work" />}><T>We couldn’t find this job.</T></Screen>;
  const who = firstName(b.mechanic?.full_name) || 'your mechanic';
  if (b.status !== 'in_progress' || b.client_approved_at) {
    return (
      <Screen header={<TopHeader back title="Check the work" />}>
        <Notice tone="ok" text={b.client_approved_at ? 'You already approved this job.' : 'This job isn’t in progress.'} />
      </Screen>
    );
  }

  const allDone = items.every((i) => checked[i]);
  const toggle = (i: string) => setChecked((s) => ({ ...s, [i]: !s[i] }));

  const approve = () => Alert.alert('Is the work done?', `${who} can then finish the job, and your card is charged ${money(b.total_cents)}.`, [
    { text: 'Not yet', style: 'cancel' },
    { text: 'Yes, it’s complete', onPress: async () => {
      setBusy(true);
      try {
        await approveCompletion(b.id, Object.fromEntries(items.map((i) => [i, !!checked[i]])), how);
        Alert.alert('Thank you!', `We let ${who} know you approved the work.`);
        router.back();
      } catch (e) { Alert.alert('Not approved', friendlyError(e)); } finally { setBusy(false); }
    } },
  ]);

  const notDone = async () => {
    if (!b.mechanic_id) return;
    const conv = await startConversation(b.mechanic_id);
    router.push({ pathname: '/chat/[id]', params: { id: conv } });
  };

  return (
    <Screen header={<TopHeader back title="Check the work" showActions={false} />}
      footer={<Footer>
        <Button style={{ flex: 1 }} kind="ok" icon="checkmark-done" title="The work is done" loading={busy}
          disabled={!allDone || (how === 'photos' && !hasPhotos)} onPress={approve} />
      </Footer>}>
      <T muted>Check each item before you approve. {who} can only finish the job and get paid after you do.</T>
      <RunningBill b={b} />
      {hasPhotos ? (
        <Segmented value={how} onChange={setMethod} options={[{ value: 'in_person', label: 'I’m with the car', icon: 'car-sport-outline' }, { value: 'photos', label: 'From photos', icon: 'images-outline' }]} />
      ) : null}
      {how === 'photos' && hasPhotos ? (
        <Card>
          <T v="h3">Photos from {who}</T>
          <JobPhotos paths={b.completion_photos} />
        </Card>
      ) : null}
      <Card>
        <T v="h3">Checklist</T>
        {items.map((i) => {
          const on = !!checked[i];
          return (
            <Pressable key={i} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => toggle(i)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, borderTopWidth: 1, borderTopColor: c.line, paddingTop: 8 }}>
              <Ionicons name={on ? 'checkbox' : 'square-outline'} size={26} color={on ? c.ok : c.muted} />
              <T style={{ flex: 1 }}>{i}</T>
            </Pressable>
          );
        })}
      </Card>
      {!allDone ? <T v="small" muted center>Tick every item to approve.</T> : null}
      <Row style={{ justifyContent: 'center' }}>
        <Button small kind="ghost" icon="chatbubble-ellipses-outline" title={`Something’s not done? Message ${who}`} onPress={notDone} />
      </Row>
      <Row style={{ justifyContent: 'center' }}>
        <Button small kind="ghost" icon="alert-circle-outline" title="Report a problem" onPress={() => router.push({ pathname: '/problem/[id]', params: { id: b.id } })} />
      </Row>
      <T v="tiny" muted center>If you don’t respond, the job is approved automatically 24 hours after the estimated end.</T>
    </Screen>
  );
}
