import { router } from 'expo-router';
import React from 'react';
import { Linking, Platform, RefreshControl, ScrollView, View } from 'react-native';
import { TopHeader, Button, Card, EmptyState, Pill, Row, T } from '@/components/ui';
import { useData } from '@/hooks/useData';
import { MechanicJobSteps } from '@/components/JobSteps';
import { myBookings } from '@/lib/api';
import { dayLabel, firstName, money, timeOf } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { BookingWithPeople } from '@/lib/types';
import { useColors } from '@/providers/SettingsProvider';

export default function Schedule() {
  const c = useColors();
  const { data, refreshing, refresh } = useData(myBookings, [], ['bookings']);
  const jobs = (data ?? []).filter((b) => ['confirmed', 'in_progress'].includes(b.status)).sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));

  const message = async (b: BookingWithPeople) => {
    const { data: conv } = await supabase.from('conversations').select('id').eq('client_id', b.client_id).eq('mechanic_id', b.mechanic_id!).single();
    if (conv) router.push({ pathname: '/chat/[id]', params: { id: conv.id } });
  };
  const directions = (b: BookingWithPeople) => {
    const q = encodeURIComponent(b.address);
    Linking.openURL(Platform.OS === 'ios' ? `http://maps.apple.com/?daddr=${q}` : `https://www.google.com/maps/dir/?api=1&destination=${q}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <TopHeader title="Schedule" />
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}>
        {jobs.length ? jobs.map((b) => (
          <Card key={b.id}>
            <Row style={{ justifyContent: 'space-between' }}><T v="h3">{b.service}</T><T v="label">{money(b.mechanic_payout_cents)}{b.status === 'confirmed' && b.pricing !== 'flat' ? '+' : ''}</T></Row>
            <T v="small" bold>{b.vehicle_label}</T>
            <T v="small" muted>{dayLabel(b.scheduled_at)} at {timeOf(b.scheduled_at)} · {b.location_type === 'shop' ? 'drop-off at your shop' : 'mobile'}</T>
            <T v="small">{firstName(b.client?.full_name)}{b.location_type === 'mobile' ? ` · ${b.address}` : ''}</T>
            {b.notes ? <T v="small" muted>Note: {b.notes}</T> : null}
            <Row gap={6} wrap>
              {b.status === 'in_progress' ? <Pill tone="ok" label="In progress" /> : b.arrived_at ? <Pill tone="warn" label={b.location_type === 'shop' ? 'Car dropped off' : 'Checked in'} /> : <Pill label="Confirmed" />}
              <Pill label={b.pricing === 'quote' ? 'Diagnose + quote' : b.pricing === 'hourly' ? `${b.hours} hr + parts` : 'Flat price'} />
            </Row>
            <MechanicJobSteps b={b} onChange={refresh} />
            <Row gap={8}>
              <Button small kind="soft" icon="chatbubble-outline" title="Message" style={{ flex: 1 }} onPress={() => message(b)} />
              {b.location_type === 'mobile' ? <Button small kind="soft" icon="navigate-outline" title="Directions" style={{ flex: 1 }} onPress={() => directions(b)} /> : null}
            </Row>
          </Card>
        )) : data ? (
          <EmptyState icon="calendar-outline" title="Nothing scheduled" text="Jobs you accept show up here." action="Find jobs" onAction={() => router.push('/jobs')} />
        ) : null}
      </ScrollView>
    </View>
  );
}
