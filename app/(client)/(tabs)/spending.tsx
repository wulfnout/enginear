import { router } from 'expo-router';
import React from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { BarChart } from '@/components/BarChart';
import { Avatar, TopHeader, Card, Chip, EmptyState, KV, Progress, Row, Stat, T } from '@/components/ui';
import { useData } from '@/hooks/useData';
import { myBookings } from '@/lib/api';
import { money, money0, shortDate } from '@/lib/format';
import { useAuth } from '@/providers/AuthProvider';
import { useColors } from '@/providers/SettingsProvider';
import { BRAND } from '@/theme';

const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;

export default function Spending() {
  const c = useColors();
  const { client, updateClient } = useAuth();
  const { data, refreshing, refresh } = useData(myBookings, [], ['bookings']);
  const all = data ?? [];
  const paid = all.filter((b) => b.status === 'completed' || (b.status === 'cancelled' && b.cancel_fee_cents > 0));
  const amount = (b: (typeof all)[number]) => (b.status === 'cancelled' ? b.cancel_fee_cents : b.total_cents + b.tip_cents);
  const when = (b: (typeof all)[number]) => new Date(b.completed_at ?? b.scheduled_at);

  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - 5 + i, 1));
  const byMonth = months.map((m) => ({
    label: m.toLocaleDateString('en-US', { month: 'short' }),
    cents: paid.filter((b) => monthKey(when(b)) === monthKey(m)).reduce((s, b) => s + amount(b), 0),
  }));
  const thisM = byMonth[5].cents, lastM = byMonth[4].cents;
  const year = paid.filter((b) => when(b).getFullYear() === now.getFullYear()).reduce((s, b) => s + amount(b), 0);
  const completed = all.filter((b) => b.status === 'completed');
  const avg = completed.length ? completed.reduce((s, b) => s + b.total_cents, 0) / completed.length : 0;
  const upcoming = all.filter((b) => ['open', 'requested', 'confirmed'].includes(b.status)).reduce((s, b) => s + b.total_cents, 0);
  const saved = completed.reduce((s, b) => s + b.discount_cents, 0);
  const budget = (client?.monthly_budget ?? 300) * 100;

  const byType = new Map<string, number>();
  completed.forEach((b) => byType.set(b.service, (byType.get(b.service) ?? 0) + b.total_cents));
  const typeTotal = [...byType.values()].reduce((s, v) => s + v, 0) || 1;
  const byMechanic = new Map<string, { name: string; url: string | null; cents: number }>();
  completed.forEach((b) => {
    if (!b.mechanic_id) return;
    const cur = byMechanic.get(b.mechanic_id) ?? { name: b.mechanic?.full_name ?? 'Mechanic', url: b.mechanic?.avatar_url ?? null, cents: 0 };
    cur.cents += b.total_cents + b.tip_cents;
    byMechanic.set(b.mechanic_id, cur);
  });

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <TopHeader title="Spending" />
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}>
        <View style={{ backgroundColor: BRAND, borderRadius: 20, padding: 20, gap: 4 }}>
          <T v="small" color="#fff" style={{ opacity: 0.88 }}>Spent in {byMonth[5].label}</T>
          <T v="h1" color="#fff" style={{ fontSize: 40, lineHeight: 46 }}>{money(thisM)}</T>
          <T v="small" color="#fff" style={{ opacity: 0.92 }}>{lastM ? `${thisM >= lastM ? 'Up' : 'Down'} ${money0(Math.abs(thisM - lastM))} from ${byMonth[4].label}` : 'Nothing spent last month'}</T>
          <Row style={{ justifyContent: 'space-between', marginTop: 12 }}>
            <T v="tiny" color="#fff">Monthly budget</T>
            <T v="tiny" bold color="#fff">{money0(thisM)} of {money0(budget)}</T>
          </Row>
          <View style={{ height: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' }}>
            <View style={{ width: `${Math.min(100, (thisM / budget) * 100)}%`, height: '100%', backgroundColor: '#fff' }} />
          </View>
        </View>
        <Row gap={10}><Stat value={money0(year)} label="Spent this year" /><Stat value={money0(avg)} label="Average job" /></Row>
        <Row gap={10}><Stat value={money0(upcoming)} label="Coming up" /><Stat value={money0(saved)} label="Saved with discounts" color={c.ok} /></Row>

        {completed.length ? (
          <>
            <Card><T v="h3">Last 6 months</T><BarChart data={byMonth} /></Card>
            <Card>
              <T v="h3">By type of service</T>
              {[...byType.entries()].sort((a, b) => b[1] - a[1]).map(([t, v]) => (
                <View key={t} style={{ gap: 4 }}><KV k={t} v={money0(v)} /><Progress value={v / typeTotal} /></View>
              ))}
            </Card>
            <Card>
              <T v="h3">By mechanic</T>
              {[...byMechanic.entries()].sort((a, b) => b[1].cents - a[1].cents).map(([id, x]) => (
                <Row key={id} gap={10}><Avatar name={x.name} url={x.url} id={id} size={38} /><T style={{ flex: 1 }}>{x.name}</T><T v="label">{money0(x.cents)}</T></Row>
              ))}
            </Card>
            <Card>
              <T v="h3">Receipts</T>
              {paid.slice(0, 30).map((b) => (
                <KV key={b.id} k={`${shortDate(when(b))} · ${b.status === 'cancelled' ? 'Late cancellation' : b.service}`} v={money(amount(b))} />
              ))}
            </Card>
          </>
        ) : data ? (
          <Card><EmptyState icon="wallet-outline" title="Your spending shows up here" text="After your first repair you’ll see monthly totals, receipts and what you saved."
            action="Book a mechanic" onAction={() => router.push('/quick-book')} /></Card>
        ) : null}

        <Card>
          <T v="h3">Monthly budget</T>
          <T v="small" muted>See how close you are each month.</T>
          <Row gap={8} wrap>
            {[150, 200, 300, 400, 600].map((v) => (
              <Chip key={v} label={`$${v}`} on={client?.monthly_budget === v} onPress={() => updateClient({ monthly_budget: v })} />
            ))}
          </Row>
        </Card>
      </ScrollView>
    </View>
  );
}
