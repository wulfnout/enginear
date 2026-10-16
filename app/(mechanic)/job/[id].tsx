import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { TopHeader, Button, Card, Footer, Loading, Pill, Row, Screen, T } from '@/components/ui';
import { useData } from '@/hooks/useData';
import { acceptJob, declineJob, jobFeed } from '@/lib/api';
import type { IconName } from '@/lib/constants';
import { longDate, miles, money, money0, timeOf } from '@/lib/format';
import { friendlyError } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useColors } from '@/providers/SettingsProvider';

export default function JobDetail() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { mechanic } = useAuth();
  const { data, loading } = useData(async () => (await jobFeed()).find((r) => r.booking.id === id) ?? null, [id]);
  const [busy, setBusy] = useState(false);
  if (loading) return <Loading />;
  const r = data;
  if (!r) return <Screen header={<TopHeader back title="Job" />}><T>This job was taken by another mechanic or cancelled.</T></Screen>;
  const b = r.booking;

  const accept = async () => {
    setBusy(true);
    try {
      await acceptJob(b.id);
      Alert.alert('Job accepted', `It’s on your schedule for ${longDate(b.scheduled_at)} at ${timeOf(b.scheduled_at)}.`);
      router.replace('/schedule');
    } catch (e) { Alert.alert('Couldn’t accept', friendlyError(e)); } finally { setBusy(false); }
  };
  const decline = async () => {
    if (b.status === 'requested') { try { await declineJob(b.id); } catch { /* ignore */ } }
    router.back();
  };

  const rows: [IconName, string, string][] = [
    ['calendar-outline', 'When', `${longDate(b.scheduled_at)} at ${timeOf(b.scheduled_at)}`],
    ['car-sport-outline', 'Vehicle', b.vehicle_label],
    b.location_type === 'shop'
      ? ['business-outline', 'Where', 'The client drops the car off at your shop']
      : ['location-outline', 'Where', `${b.area?.trim() || 'Nearby'}${r.distance_miles != null ? `, ${miles(r.distance_miles)} away` : ''}. Exact address after you accept.`],
    ['pricetag-outline', 'Pricing', b.pricing === 'flat' ? `Flat price ${money(b.base_cents)}`
      : b.pricing === 'hourly' ? `${b.hours} hr at $${b.hourly_rate}/hr, plus parts you quote`
      : `Diagnostic fee ${money(b.base_cents)}, then you send a parts and labor quote`],
  ];

  return (
    <Screen header={<TopHeader back title={b.service} />}
      footer={<Footer>
        <Button kind="soft" title={b.status === 'requested' ? 'Decline' : 'Not for me'} onPress={decline} />
        <Button style={{ flex: 1 }} title={`Accept${b.pricing === 'flat' ? ` for ${money0(b.mechanic_payout_cents)}` : ''}`} loading={busy} disabled={!mechanic?.onboarding_complete} onPress={accept} />
      </Footer>}>
      <Card>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <T v="h1">{money(b.mechanic_payout_cents)}</T>
            <T v="small" muted>{b.pricing === 'flat' ? 'Your pay for the job, plus tips' : 'Your pay to start. Approved quotes add to it (100% of parts, 90% of labor).'}</T>
          </View>
          {b.status === 'requested' ? <View style={{ flexShrink: 0, paddingTop: 6 }}><Pill tone="warn" icon="person" label="Requested you" /></View> : null}
        </Row>
      </Card>
      <Card>
        {rows.map(([icon, label, value]) => (
          <Row key={label} gap={12} style={{ alignItems: 'flex-start' }}>
            <Ionicons name={icon} size={22} color={c.brand} />
            <View style={{ flex: 1 }}><T v="tiny" bold muted>{label}</T><T>{value}</T></View>
          </Row>
        ))}
        {b.notes ? <View style={{ backgroundColor: c.brandSoft, borderRadius: 10, padding: 12 }}><T v="small" color={c.brandInk}>What the client says: {b.notes}</T></View> : null}
      </Card>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Ionicons name="person-circle-outline" size={40} color={c.brand} />
        <View style={{ flex: 1 }}>
          <T v="label">{r.client_first_name}</T>
          <T v="small" muted>{r.client_rating > 0 ? `★ ${Number(r.client_rating).toFixed(1)} client rating` : 'New client'}</T>
        </View>
        <Pill tone="ok" icon="card" label="Card on file" />
      </Card>
      <T v="tiny" muted>Cancelling within 24 hours of the start time lowers your reliability score.</T>
    </Screen>
  );
}
