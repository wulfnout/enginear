import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { DayPicker, TimePicker } from '@/components/cards';
import { Button, Chip, Field, Footer, Notice, OptionCard, Row, Screen, T, TopHeader } from '@/components/ui';
import { setDraft, useDraft } from '@/hooks/draft';
import { useData } from '@/hooks/useData';
import { myVehicles, vehicleName } from '@/lib/api';
import { SERVICES } from '@/lib/constants';
import { useAuth } from '@/providers/AuthProvider';
import { useColors } from '@/providers/SettingsProvider';

const PLACES = [
  { value: 'mobile', label: 'Come to me', desc: 'A mobile mechanic works on it where it’s parked', icon: 'car-sport-outline' },
  { value: 'shop', label: 'I’ll take it to a shop', desc: 'Drop it off at a mechanic’s shop', icon: 'business-outline' },
  { value: 'either', label: 'Either is fine', desc: 'Show me both', icon: 'swap-horizontal-outline' },
] as const;

/** Guided booking: what, which car, where, the problem, and when. Then pick a mechanic. */
export default function QuickBook() {
  const c = useColors();
  const { vehicleId: fromCar, service: fromService, notes: fromNotes } = useLocalSearchParams<{ vehicleId?: string; service?: string; notes?: string }>();
  const { client } = useAuth();
  const existing = useDraft();
  const { data: vehicles } = useData(myVehicles);
  const [service, setService] = useState<string | null>(fromService ?? existing?.service ?? client?.needs?.[0] ?? null);
  const [vehicleId, setVehicleId] = useState<string | null>(fromCar ?? existing?.vehicleId ?? null);
  const [place, setPlace] = useState<'mobile' | 'shop' | 'either'>(existing?.place ?? (client?.prefers ?? 'either'));
  const [notes, setNotes] = useState(fromNotes ?? existing?.notes ?? '');
  const [day, setDay] = useState<number | null>(existing?.day ?? null);
  const [time, setTime] = useState<string | null>(existing?.time ?? null);
  const car = vehicleId ?? vehicles?.[0]?.id ?? null;
  const ready = !!service && !!car && day != null && !!time;

  return (
    <Screen
      header={<TopHeader back title="Book a mechanic" showActions={false} />}
      footer={<Footer><Button style={{ flex: 1 }} title="Show available mechanics" disabled={!ready}
        onPress={() => {
          setDraft({ service: service!, vehicleId: car!, place, notes: notes.trim(), day: day!, time: time! });
          router.replace({ pathname: '/find', params: { view: 'list' } });
        }} /></Footer>}
    >
      <T v="h3">1. What do you need?</T>
      <View style={{ gap: 10 }}>
        {SERVICES.map((s) => <OptionCard key={s.name} label={s.name} desc={s.desc} icon={s.icon} on={service === s.name} onPress={() => setService(s.name)} />)}
      </View>

      <T v="h3" style={{ marginTop: 8 }}>2. Which car?</T>
      {vehicles && !vehicles.length ? <Notice tone="brand" text="Add your car first so mechanics know what they’re working on." /> : null}
      <Row gap={8} wrap>
        {(vehicles ?? []).map((v) => <Chip key={v.id} icon="car-sport-outline" label={v.nickname || vehicleName(v)} on={car === v.id} onPress={() => setVehicleId(v.id)} />)}
        <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/vehicle', params: { then: 'book' } })}
          style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.brand, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="add" size={18} color={c.brand} /><T v="label" color={c.brand}>Add a car</T>
        </Pressable>
      </Row>

      <T v="h3" style={{ marginTop: 8 }}>3. Where?</T>
      <View style={{ gap: 10 }}>
        {PLACES.map((p) => <OptionCard key={p.value} label={p.label} desc={p.desc} icon={p.icon} on={place === p.value} onPress={() => setPlace(p.value)} />)}
      </View>
      {place !== 'shop' && !client?.address ? <Notice text="Add your address in Me › Address so a mobile mechanic can find your car." /> : null}

      <T v="h3" style={{ marginTop: 8 }}>4. What’s going on? (optional)</T>
      <Field label="Describe the problem" value={notes} onChangeText={setNotes} multiline
        placeholder="Grinding noise when braking, started last week. Check engine light is on." />

      <T v="h3" style={{ marginTop: 8 }}>5. What day?</T>
      <DayPicker value={day} onChange={(d) => { setDay(d); setTime(null); }} />
      <T v="h3" style={{ marginTop: 8 }}>6. What time?</T>
      <TimePicker value={time} onChange={setTime} day={day} />
    </Screen>
  );
}
