import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, KV, LinkButton, Loading, T } from '@/components/ui';
import { useData } from '@/hooks/useData';
import { getBooking, startConversation } from '@/lib/api';
import { firstName, longDate, money, timeOf } from '@/lib/format';
import { useColors } from '@/providers/SettingsProvider';

export default function Booked() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: b } = useData(() => getBooking(id), [id]);
  if (!b) return <Loading />;
  const who = b.mechanic?.full_name;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flex: 1, padding: 20, gap: 14, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: c.okSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="checkmark" size={48} color={c.ok} />
        </View>
        <T v="h1" center>{who ? 'Request sent!' : 'Request posted!'}</T>
        <T muted center>
          {who
            ? `We asked ${firstName(who)} to work on your ${b.vehicle_label} on ${longDate(b.scheduled_at)} at ${timeOf(b.scheduled_at)}. You’ll get a notification when they confirm.`
            : `Trusted mechanics near you can now accept your ${b.service.toLowerCase()} request. You’ll get a notification as soon as someone does.`}
        </T>
        <Card style={{ alignSelf: 'stretch' }}>
          <KV k="Service" v={b.service} />
          <KV k="When" v={`${longDate(b.scheduled_at)}, ${timeOf(b.scheduled_at)}`} />
          <KV k="Vehicle" v={b.vehicle_label} />
          <KV k="Where" v={b.location_type === 'shop' ? 'Drop off at the shop' : 'Mobile · they come to you'} />
          <KV k={b.pricing === 'flat' ? 'Total' : 'To start'} v={money(b.total_cents)} bold />
        </Card>
        <Card style={{ alignSelf: 'stretch' }}>
          <T v="small" muted>{b.pricing === 'flat' ? 'Flat price. Any extra parts or repairs come as a quote you approve first.'
            : b.pricing === 'hourly' ? `${b.hours} hours of labor. Parts come as a quote you approve first.`
            : 'This covers the diagnosis. You’ll get a parts and labor quote to approve before any repairs.'}</T>
        </Card>
        <Button style={{ alignSelf: 'stretch' }} title="See my bookings" onPress={() => router.replace('/bookings')} />
        {b.mechanic_id ? (
          <Button style={{ alignSelf: 'stretch' }} kind="ghost" title={`Message ${firstName(who)}`} onPress={async () => {
            const conv = await startConversation(b.mechanic_id!);
            router.replace({ pathname: '/chat/[id]', params: { id: conv } });
          }} />
        ) : null}
        <LinkButton title="Back to home" onPress={() => router.replace('/home')} />
      </View>
    </SafeAreaView>
  );
}
