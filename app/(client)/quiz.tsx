import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Chip, Field, LinkButton, OptionCard, Progress, Row, T } from '@/components/ui';
import { useData } from '@/hooks/useData';
import { geocode, myVehicles, saveVehicle } from '@/lib/api';
import { MAKES, PRIORITIES, SERVICES } from '@/lib/constants';
import { friendlyError } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useColors } from '@/providers/SettingsProvider';

type Answers = {
  needs: string[]; prefers: 'mobile' | 'shop' | 'either'; priorities: string[]; address: string; entry_notes: string;
  year: string; make: string; model: string;
};

const STEPS = ['car', 'needs', 'where', 'priorities', 'address'] as const;

/** Quick setup so we can match the client with the right mechanics. */
export default function Quiz() {
  const c = useColors();
  const { client, session, updateClient, signOut } = useAuth();
  const editing = !!client?.onboarded;
  const { data: vehicles } = useData(myVehicles);
  const hasCar = (vehicles?.length ?? 0) > 0;
  const steps = STEPS.filter((s) => s !== 'car' || !editing);
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const [a, setA] = useState<Answers>({
    needs: client?.needs ?? [], prefers: client?.prefers ?? 'either', priorities: client?.priorities ?? [],
    address: client?.address ?? '', entry_notes: client?.entry_notes ?? '', year: '', make: '', model: '',
  });
  const step = steps[i];
  const toggle = (k: 'needs' | 'priorities', v: string) =>
    setA((x) => ({ ...x, [k]: x[k].includes(v) ? x[k].filter((y) => y !== v) : [...x[k], v] }));
  const thisYear = new Date().getFullYear();
  const carOk = hasCar || (Number(a.year) >= 1950 && Number(a.year) <= thisYear + 1 && !!a.make.trim() && !!a.model.trim());

  const can = {
    car: carOk, needs: a.needs.length > 0, where: true, priorities: true,
    address: a.prefers === 'shop' ? true : a.address.trim().length > 4,
  }[step];

  const finish = async () => {
    setBusy(true);
    try {
      if (!hasCar && a.make.trim() && session) {
        await saveVehicle(session.user.id, { year: Number(a.year), make: a.make.trim(), model: a.model.trim(), trim: null, mileage: null, vin: null, plate: null, color: null, nickname: null });
      }
      const pos = a.address.trim() ? await geocode(a.address) : null;
      await updateClient({
        needs: a.needs, prefers: a.prefers, priorities: a.priorities, address: a.address.trim() || null,
        entry_notes: a.entry_notes.trim() || null, lat: pos?.lat ?? null, lng: pos?.lng ?? null, onboarded: true,
      });
      if (a.address.trim() && !pos) Alert.alert('Address saved', 'We couldn’t place that address on the map, so distances may not show. You can fix it any time in Me › Address.');
      router.replace(editing ? '/account' : '/home');
    } catch (e) {
      Alert.alert('Not saved', friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const next = () => (i < steps.length - 1 ? setI(i + 1) : finish());
  const back = () => {
    if (i > 0) return setI(i - 1);
    if (editing) return router.back();
    Alert.alert('Leave setup?', 'You can finish later by signing in again.', [
      { text: 'Stay', style: 'cancel' }, { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const Q: Record<(typeof STEPS)[number], { q: string; sub: string; body: React.ReactNode }> = {
    car: { q: 'What do you drive?', sub: hasCar ? 'You already added a car. You can add more any time in My garage.' : 'You can add more cars later', body: hasCar ? null : (
      <View style={{ gap: 12 }}>
        <Field label="Year" value={a.year} onChangeText={(t) => setA({ ...a, year: t.replace(/\D/g, '').slice(0, 4) })} keyboardType="number-pad" placeholder={String(thisYear - 6)} />
        <Field label="Make" value={a.make} onChangeText={(t) => setA({ ...a, make: t })} placeholder="Honda" autoCapitalize="words" />
        <Row gap={8} wrap>{MAKES.filter((m) => !a.make || m.toLowerCase().startsWith(a.make.toLowerCase())).slice(0, 8).map((m) => (
          <Chip key={m} label={m} on={a.make === m} onPress={() => setA({ ...a, make: m })} />
        ))}</Row>
        <Field label="Model" value={a.model} onChangeText={(t) => setA({ ...a, model: t })} placeholder="Civic" autoCapitalize="words" />
      </View>) },
    needs: { q: 'What does it usually need?', sub: 'Choose all that apply', body: SERVICES.map((s) => <OptionCard key={s.name} label={s.name} desc={s.desc} icon={s.icon} on={a.needs.includes(s.name)} onPress={() => toggle('needs', s.name)} />) },
    where: { q: 'Where do you like the work done?', sub: 'You can choose each time you book', body: ([
      ['mobile', 'Come to me', 'A mobile mechanic works on it where it’s parked', 'car-sport-outline'],
      ['shop', 'At a shop', 'I’ll drop it off', 'business-outline'],
      ['either', 'Either is fine', 'Show me both', 'swap-horizontal-outline'],
    ] as const).map(([v, l, d, icon]) => <OptionCard key={v} label={l} desc={d} icon={icon} on={a.prefers === v} onPress={() => setA({ ...a, prefers: v })} />) },
    priorities: { q: 'What matters most to you?', sub: 'Choose any that apply, or skip', body: PRIORITIES.map((p) => <OptionCard key={p.name} label={p.name} icon={p.icon} on={a.priorities.includes(p.name)} onPress={() => toggle('priorities', p.name)} />) },
    address: { q: 'Where’s the car usually parked?', sub: a.prefers === 'shop' ? 'Optional for shop visits. Used to find shops near you.' : 'Only shared with the mechanic you book', body: (
      <View style={{ gap: 14 }}>
        <Field label="Street address" value={a.address} onChangeText={(t) => setA({ ...a, address: t })} placeholder="123 Main St, Springfield, IL" autoComplete="street-address" textContentType="fullStreetAddress" />
        <Field label="Parking notes (optional)" value={a.entry_notes} onChangeText={(t) => setA({ ...a, entry_notes: t })} placeholder="Driveway, lot space 14, gate code 2580" />
      </View>) },
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ padding: 16, gap: 12 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Pressable accessibilityRole="button" onPress={back} hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="chevron-back" size={24} color={c.brand} /><T v="label" color={c.brand}>Back</T>
          </Pressable>
          <T v="small" bold muted>Question {i + 1} of {steps.length}</T>
          {step === 'priorities' ? <LinkButton title="Skip" onPress={next} /> : <View style={{ width: 40 }} />}
        </Row>
        <Progress value={(i + 1) / steps.length} />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingTop: 0, gap: 12, paddingBottom: 24 }}>
          <T v="h1">{Q[step].q}</T>
          <T muted>{Q[step].sub}</T>
          {Q[step].body}
        </ScrollView>
        <View style={{ padding: 16 }}>
          <Button title={i === steps.length - 1 ? (editing ? 'Save' : 'See my matches') : 'Next'} onPress={next} disabled={!can} loading={busy} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
