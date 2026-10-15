import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { BarChart } from '@/components/BarChart';
import { LiveDot } from '@/components/Motion';
import { TopHeader, Button, Card, KV, Notice, Progress, Row, Stat, T, Toggle } from '@/components/ui';
import { useData } from '@/hooks/useData';
import { connect, myBookings } from '@/lib/api';
import { dayLabel, money, money0, shortDate, timeOf } from '@/lib/format';
import { friendlyError } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useColors } from '@/providers/SettingsProvider';
import { BRAND } from '@/theme';

const startOfWeek = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // Monday
  return x;
};

export default function Earnings() {
  const c = useColors();
  const { mechanic, updateMechanic } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const { data, refreshing, refresh } = useData(async () => {
    const [bookings, balance] = await Promise.all([
      myBookings(),
      mechanic?.stripe_account_id ? connect<{ availableCents: number; pendingCents: number; instantAvailableCents: number }>('balance').catch(() => null) : Promise.resolve(null),
    ]);
    return { bookings, balance };
  }, [], ['bookings']);

  const done = (data?.bookings ?? []).filter((b) => b.status === 'completed' || (b.status === 'cancelled' && b.cancel_fee_cents > 0));
  const earned = (b: (typeof done)[number]) => (b.status === 'cancelled' ? b.cancel_fee_cents : b.mechanic_payout_cents + b.tip_cents);
  const when = (b: (typeof done)[number]) => new Date(b.completed_at ?? b.cancelled_at ?? b.scheduled_at);
  const wk0 = startOfWeek();
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const from = new Date(wk0); from.setDate(from.getDate() - (7 - i) * 7);
    const to = new Date(from); to.setDate(to.getDate() + 7);
    return { label: i === 7 ? 'This' : i === 6 ? 'Last' : `${from.getMonth() + 1}/${from.getDate()}`,
      cents: done.filter((b) => when(b) >= from && when(b) < to).reduce((s, b) => s + earned(b), 0) };
  });
  const thisW = weeks[7].cents, lastW = weeks[6].cents;
  const fourW = weeks.slice(4).reduce((s, w) => s + w.cents, 0);
  const tips = done.reduce((s, b) => s + b.tip_cents, 0);
  const lifetime = done.reduce((s, b) => s + earned(b), 0);
  const goal = (mechanic?.weekly_goal ?? 600) * 100;
  const upcoming = (data?.bookings ?? []).filter((b) => ['confirmed', 'in_progress'].includes(b.status)).sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  const bal = data?.balance;

  const instant = async () => {
    setBusy('instant');
    try {
      const r = await connect<{ amountCents: number }>('instant_payout');
      Alert.alert('On its way', `${money(r.amountCents)} is being sent to your debit card. It usually arrives within 30 minutes.`);
      refresh();
    } catch (e) { Alert.alert('Cash-out not sent', friendlyError(e)); } finally { setBusy(null); }
  };
  const dashboard = async () => {
    setBusy('dash');
    try { const { url } = await connect('dashboard'); await WebBrowser.openBrowserAsync(url); }
    catch (e) { Alert.alert('Couldn’t open payouts', friendlyError(e)); } finally { setBusy(null); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <TopHeader title="EngiNear Pro">
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 12, padding: 12, gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Row gap={0}>{mechanic?.is_online ? <LiveDot /> : null}<T v="label" color="#fff">{mechanic?.is_online ? 'You’re online' : 'You’re offline'}</T></Row>
            <T v="tiny" color="#fff" style={{ opacity: 0.9 }}>{mechanic?.is_online ? `Getting new job alerts within ${mechanic.radius_miles} miles` : 'Turn on to get new job alerts'}</T>
          </View>
          <Toggle label="Online" value={!!mechanic?.is_online} onChange={(v) => updateMechanic({ is_online: v })} />
        </View>
      </TopHeader>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}>
        {mechanic && !mechanic.payouts_enabled ? <Notice text="Finish your Stripe payout setup so earnings can be sent to you. Me › Payouts." /> : null}
        <View style={{ backgroundColor: BRAND, borderRadius: 20, padding: 20, gap: 4 }}>
          <T v="small" color="#fff" style={{ opacity: 0.88 }}>Ready to cash out</T>
          <T v="h1" color="#fff" style={{ fontSize: 40, lineHeight: 46 }}>{money(Math.max(bal?.availableCents ?? 0, bal?.instantAvailableCents ?? 0))}</T>
          {bal?.pendingCents ? <T v="small" color="#fff" style={{ opacity: 0.9 }}>{money(bal.pendingCents)} on the way from recent jobs</T> : null}
          <Row gap={10} style={{ marginTop: 12 }}>
            <Button small kind="white" icon="flash" title="Cash out now" style={{ flex: 1 }} loading={busy === 'instant'} disabled={!mechanic?.payouts_enabled} onPress={instant} />
            <Button small icon="settings-outline" title="Payouts" style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} loading={busy === 'dash'} disabled={!mechanic?.stripe_account_id} onPress={dashboard} />
          </Row>
          <T v="tiny" color="#fff" style={{ opacity: 0.85 }}>Instant cash-out has a small Stripe fee. Standard payouts are free and arrive in about 2 business days.</T>
        </View>

        <Row gap={10}>
          {([['search', 'Find jobs', '/jobs'], ['calendar', 'Schedule', '/schedule'], ['help-buoy', 'Get help', '/assistant']] as const).map(([i, l, h]) => (
            <Pressable key={l} accessibilityRole="button" onPress={() => router.push(h)}
              style={{ flex: 1, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 16, paddingVertical: 14, alignItems: 'center', gap: 6 }}>
              <Ionicons name={i} size={26} color={c.brand} /><T v="small" bold>{l}</T>
            </Pressable>
          ))}
        </Row>

        <Row gap={10}><Stat value={money0(thisW)} label="This week" /><Stat value={money0(fourW)} label="Last 4 weeks" /></Row>
        <Row gap={10}><Stat value={money0(tips)} label="Tips" /><Stat value={money0(lifetime)} label="All-time earnings" /></Row>

        <Card>
          <Row style={{ justifyContent: 'space-between' }}><T v="h3">Weekly goal</T><T v="small" bold>{money0(thisW)} of {money0(goal)}</T></Row>
          <Progress value={thisW / goal} color={c.ok} height={12} />
          <T v="small" muted>{thisW >= goal ? 'Goal reached. Great work!' : `${money0(goal - thisW)} to go.`}</T>
        </Card>

        <Card>
          <Row style={{ justifyContent: 'space-between' }}><T v="h3">Earnings by week</T>{thisW || lastW ? <T v="small" muted>{thisW >= lastW ? 'Up' : 'Down'} from last week</T> : null}</Row>
          {done.length ? <BarChart data={weeks} /> : <T v="small" muted>Finish your first job and your weekly chart starts here.</T>}
        </Card>

        <Card>
          <Row style={{ justifyContent: 'space-between' }}><T v="h3">Up next</T><Button small kind="ghost" title="Schedule" onPress={() => router.push('/schedule')} /></Row>
          {upcoming.length ? upcoming.slice(0, 3).map((b) => (
            <Row key={b.id} gap={10}>
              <Ionicons name="calendar-outline" size={22} color={c.brand} />
              <View style={{ flex: 1 }}><T v="label">{b.service}</T><T v="small" muted>{dayLabel(b.scheduled_at)} · {timeOf(b.scheduled_at)}</T></View>
              <T v="label">{money0(b.mechanic_payout_cents)}</T>
            </Row>
          )) : <><T v="small" muted>Nothing scheduled yet.</T><Button small kind="soft" title="Find jobs near you" onPress={() => router.push('/jobs')} /></>}
        </Card>

        <Card>
          <T v="h3">Your performance</T>
          <Row gap={10}>
            <View style={{ flex: 1 }}><T v="h3">{mechanic?.rating_count ? `★ ${Number(mechanic.rating).toFixed(1)}` : 'New'}</T><T v="tiny" muted>{mechanic?.rating_count ?? 0} ratings</T></View>
            <View style={{ flex: 1 }}><T v="h3">{mechanic?.jobs_completed ?? 0}</T><T v="tiny" muted>Jobs done</T></View>
            <View style={{ flex: 1 }}><T v="h3">{mechanic?.jobs_completed ? `${Math.round(((mechanic.on_time_count ?? 0) / mechanic.jobs_completed) * 100)}%` : '—'}</T><T v="tiny" muted>On time</T></View>
          </Row>
          <T v="tiny" muted>Keep 4.7+ stars and 90% on time to unlock Top Pro jobs with higher pay.</T>
        </Card>

        {done.length ? (
          <Card>
            <T v="h3">Recent jobs</T>
            {done.slice(0, 8).map((b) => <KV key={b.id} k={`${shortDate(when(b))} · ${b.status === 'cancelled' ? 'Late cancel fee' : b.service}`} v={money(earned(b))} />)}
          </Card>
        ) : null}
        <T v="small" muted center>Tip: set aside about 15 to 25% of your earnings for taxes.</T>
      </ScrollView>
    </View>
  );
}
