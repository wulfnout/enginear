import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, RefreshControl, ScrollView, View } from 'react-native';
import { ClientJobSteps } from '@/components/JobSteps';
import { PaymentRetry } from '@/components/PaymentRetry';
import { Avatar, TopHeader, Button, Card, EmptyState, Pill, Row, Segmented, T } from '@/components/ui';
import { useData } from '@/hooks/useData';
import { addTip, cancelBooking, myBookings, startConversation } from '@/lib/api';
import { LATE_CANCEL_FEE_CENTS, serviceIcon } from '@/lib/constants';
import { firstName, money, shortDate, timeOf } from '@/lib/format';
import type { BookingWithPeople } from '@/lib/types';
import { useColors } from '@/providers/SettingsProvider';

const STATUS: Record<string, { label: string; tone: 'brand' | 'ok' | 'warn' | 'bad' }> = {
  open: { label: 'Finding a mechanic', tone: 'warn' },
  requested: { label: 'Waiting for mechanic', tone: 'warn' },
  confirmed: { label: 'Confirmed', tone: 'brand' },
  in_progress: { label: 'Work in progress', tone: 'ok' },
  completed: { label: 'Completed', tone: 'ok' },
  cancelled: { label: 'Cancelled', tone: 'bad' },
  declined: { label: 'Declined', tone: 'bad' },
};

export default function Bookings() {
  const c = useColors();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const { data, refreshing, refresh } = useData(myBookings, [], ['bookings']);
  const all = data ?? [];
  const upcoming = all.filter((b) => ['open', 'requested', 'confirmed', 'in_progress'].includes(b.status)).sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  const past = all.filter((b) => !['open', 'requested', 'confirmed', 'in_progress'].includes(b.status));
  const list = tab === 'upcoming' ? upcoming : past;

  const cancel = (b: BookingWithPeople) => {
    const hours = (new Date(b.scheduled_at).getTime() - Date.now()) / 36e5;
    const late = hours < 24 && b.status === 'confirmed';
    Alert.alert('Cancel this booking?', late
      ? `It’s less than 24 hours away, so a ${money(LATE_CANCEL_FEE_CENTS)} fee goes to your mechanic for their lost time.`
      : 'There’s no fee for cancelling now.', [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Yes, cancel', style: 'destructive', onPress: async () => {
        try { const r = await cancelBooking(b.id); refresh(); Alert.alert('Cancelled', r.feeCents ? `A ${money(r.feeCents)} late fee was charged.` : 'No fee was charged.'); }
        catch (e) { Alert.alert('Not cancelled', (e as Error).message); }
      } },
    ]);
  };

  const tip = (b: BookingWithPeople) => {
    const opts = [500, 1000, 2000];
    Alert.alert(`Tip ${firstName(b.mechanic?.full_name)}`, '100% of your tip goes to your mechanic.', [
      ...opts.map((cents) => ({ text: money(cents), onPress: async () => {
        try { await addTip(b.id, cents); refresh(); Alert.alert('Thank you!', `${money(cents)} tip sent.`); }
        catch (e) { Alert.alert('Tip not sent', (e as Error).message); }
      } })),
      { text: 'Not now', style: 'cancel' as const },
    ]);
  };

  const message = async (b: BookingWithPeople) => {
    if (!b.mechanic_id) return;
    const conv = await startConversation(b.mechanic_id);
    router.push({ pathname: '/chat/[id]', params: { id: conv } });
  };

  const card = (b: BookingWithPeople) => {
    const s = STATUS[b.status];
    return (
      <Card key={b.id}>
        <Row gap={12}>
          {b.mechanic ? <Avatar name={b.mechanic.full_name} url={b.mechanic.avatar_url} id={b.mechanic_id ?? ''} size={50} /> : (
            <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: c.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={serviceIcon(b.service)} size={24} color={c.brand} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <T v="h3">{b.service}</T>
            <T v="small" muted numberOfLines={1}>{b.vehicle_label}</T>
            <T v="small" muted>{b.mechanic?.full_name ?? 'Mechanic not assigned yet'} · {b.location_type === 'shop' ? 'at the shop' : 'mobile'}</T>
            <T v="small" muted>{shortDate(b.scheduled_at)} at {timeOf(b.scheduled_at)}</T>
          </View>
          <T v="label">{money(b.status === 'cancelled' ? b.cancel_fee_cents : b.total_cents + b.tip_cents)}</T>
        </Row>
        <Row gap={6} wrap>
          <Pill tone={b.status === 'confirmed' && b.arrived_at && !b.arrival_confirmed_at ? 'warn' : s.tone}
            label={b.status === 'confirmed' && b.arrived_at && !b.arrival_confirmed_at ? (b.location_type === 'shop' ? 'Car dropped off' : 'Mechanic has arrived') : s.label} />
          {['open', 'requested', 'confirmed', 'in_progress'].includes(b.status) && b.pricing !== 'flat' ? <Pill label={b.pricing === 'quote' ? 'Quote after diagnosis' : 'Plus approved parts'} /> : null}
          {b.payment_status === 'failed' ? <Pill tone="bad" label="Payment failed" /> : null}
          {b.tip_cents ? <Pill tone="ok" label={`Tipped ${money(b.tip_cents)}`} /> : null}
        </Row>
        {tab === 'upcoming' ? <ClientJobSteps b={b} onChange={refresh} /> : null}
        {b.status === 'completed' && b.payment_status === 'failed' ? <PaymentRetry b={b} onChange={refresh} /> : null}
        {tab === 'upcoming' ? (
          <View style={{ gap: 8 }}>
            <Row gap={8}>
              {b.mechanic_id ? <Button small kind="soft" icon="chatbubble-outline" title="Message" style={{ flex: 1 }} onPress={() => message(b)} /> : null}
              <Button small kind="soft" icon="calendar-outline" title="Change time" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/reschedule/[id]', params: { id: b.id } })} />
            </Row>
            {b.status !== 'in_progress' ? <Button small kind="ghost" title="Cancel booking" onPress={() => cancel(b)} /> : null}
          </View>
        ) : b.status === 'completed' ? (
          <View style={{ gap: 8 }}>
            <Row gap={8}>
              {!b.client_reviewed ? <Button small icon="star" title="Rate" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/review/[id]', params: { id: b.id } })} /> : null}
              {!b.tip_cents ? <Button small kind="soft" icon="cash-outline" title="Add a tip" style={{ flex: 1 }} onPress={() => tip(b)} /> : null}
            </Row>
            <Row gap={8}>
              {b.mechanic_id ? <Button small kind="soft" icon="repeat" title="Book again" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/book', params: { mechanicId: b.mechanic_id! } })} /> : null}
              {!b.problem_report && Date.now() - new Date(b.completed_at ?? b.scheduled_at).getTime() < 48 * 36e5 ? (
                <Button small kind="ghost" title="Report a problem" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/problem/[id]', params: { id: b.id } })} />
              ) : null}
            </Row>
          </View>
        ) : null}
      </Card>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <TopHeader title="My bookings" />
      <View style={{ padding: 16, paddingBottom: 4 }}>
        <Segmented value={tab} onChange={setTab} options={[{ value: 'upcoming', label: `Upcoming (${upcoming.length})` }, { value: 'past', label: `Past (${past.length})` }]} />
      </View>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}>
        {list.length ? list.map(card) : data ? (
          <EmptyState icon="calendar-outline" title={tab === 'upcoming' ? 'No upcoming appointments' : 'No past repairs yet'}
            text="Book a mechanic in about a minute." action="Book a mechanic" onAction={() => router.push('/quick-book')} />
        ) : null}
      </ScrollView>
    </View>
  );
}
