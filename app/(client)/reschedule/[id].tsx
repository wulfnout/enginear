import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert } from 'react-native';
import { DayPicker, TimePicker } from '@/components/cards';
import { TopHeader, Button, Footer, Loading, Screen, T } from '@/components/ui';
import { useData } from '@/hooks/useData';
import { getBooking, rescheduleBooking } from '@/lib/api';
import { addDays, atTime, shortDate, timeOf } from '@/lib/format';
import { friendlyError } from '@/lib/supabase';

export default function Reschedule() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: b } = useData(() => getBooking(id), [id]);
  const [day, setDay] = useState<number | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!b) return <Loading />;

  const save = async () => {
    setBusy(true);
    try {
      await rescheduleBooking(b.id, atTime(addDays(day!), time!));
      Alert.alert('New time saved', b.mechanic_id ? 'We let your mechanic know.' : 'Your request was updated.');
      router.back();
    } catch (e) { Alert.alert('Not changed', friendlyError(e)); } finally { setBusy(false); }
  };

  return (
    <Screen header={<TopHeader back title="Change time" showActions={false} />}
      footer={<Footer><Button style={{ flex: 1 }} title="Save new time" disabled={day == null || !time} loading={busy} onPress={save} /></Footer>}>
      <T muted>{b.service}. Currently {shortDate(b.scheduled_at)} at {timeOf(b.scheduled_at)}.</T>
      <T v="h3">New day</T>
      <DayPicker value={day} onChange={(d) => { setDay(d); setTime(null); }} />
      <T v="h3">New time</T>
      <TimePicker value={time} onChange={setTime} day={day} />
    </Screen>
  );
}
