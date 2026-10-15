import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { Button, Chip, ChipScroll, Field, LinkButton, Loading, Notice, Row, Screen, T, TopHeader } from '@/components/ui';
import { deleteVehicle, getVehicle, saveVehicle } from '@/lib/api';
import { MAKES } from '@/lib/constants';
import { friendlyError } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

const thisYear = new Date().getFullYear();

/** Add or edit one of the client's cars. Opened with ?id= to edit, or ?then=book to go back to booking. */
export default function VehicleForm() {
  const { id, then } = useLocalSearchParams<{ id?: string; then?: string }>();
  const { session } = useAuth();
  const [loaded, setLoaded] = useState(!id);
  const [year, setYear] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [trim, setTrim] = useState('');
  const [mileage, setMileage] = useState('');
  const [vin, setVin] = useState('');
  const [plate, setPlate] = useState('');
  const [color, setColor] = useState('');
  const [nickname, setNickname] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    getVehicle(id).then((v) => {
      if (v) {
        setYear(String(v.year)); setMake(v.make); setModel(v.model); setTrim(v.trim ?? '');
        setMileage(v.mileage != null ? String(v.mileage) : ''); setVin(v.vin ?? ''); setPlate(v.plate ?? '');
        setColor(v.color ?? ''); setNickname(v.nickname ?? '');
      }
      setLoaded(true);
    });
  }, [id]);

  if (!loaded) return <Loading />;

  const save = async () => {
    const y = Number(year);
    const cleanVin = vin.trim().toUpperCase();
    if (!(y >= 1950 && y <= thisYear + 1) || !make.trim() || !model.trim()) { setErr('Add the year, make and model.'); return; }
    if (cleanVin && !/^[A-HJ-NPR-Z0-9]{17}$/.test(cleanVin)) { setErr('A VIN is 17 letters and numbers (no I, O or Q). You can leave it blank.'); return; }
    const miles = mileage.replace(/\D/g, '');
    setBusy(true);
    try {
      await saveVehicle(session!.user.id, {
        year: y, make: make.trim(), model: model.trim(), trim: trim.trim() || null, mileage: miles ? Number(miles) : null,
        vin: cleanVin || null, plate: plate.trim().toUpperCase() || null, color: color.trim() || null, nickname: nickname.trim() || null,
      }, id);
      router.back();
      if (then === 'book') Alert.alert('Vehicle added', 'Pick it on the booking screen.');
    } catch (e) { setErr(friendlyError(e)); } finally { setBusy(false); }
  };

  const remove = () => Alert.alert('Remove this vehicle?', 'Past bookings for it stay in your history.', [
    { text: 'Keep', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: async () => {
      try { await deleteVehicle(id!); router.back(); } catch (e) { Alert.alert('Not removed', friendlyError(e)); }
    } },
  ]);

  return (
    <Screen header={<TopHeader back title={id ? 'Edit vehicle' : 'Add a vehicle'} showActions={false} />}
      footer={<View style={{ padding: 16 }}><Button title={id ? 'Save changes' : 'Add to my garage'} icon="car-sport" onPress={save} loading={busy} /></View>}>
      <T muted>Mechanics see this before they accept your job, so they bring the right parts and tools.</T>
      {err ? <Notice text={err} /> : null}
      <Field label="Year" value={year} onChangeText={(t) => { setYear(t.replace(/\D/g, '').slice(0, 4)); setErr(''); }} keyboardType="number-pad" placeholder={String(thisYear - 6)} />
      <Field label="Make" value={make} onChangeText={(t) => { setMake(t); setErr(''); }} placeholder="Toyota" autoCapitalize="words" />
      <ChipScroll>{MAKES.filter((m) => !make || m.toLowerCase().startsWith(make.toLowerCase())).slice(0, 12).map((m) => (
        <Chip key={m} label={m} on={make === m} onPress={() => setMake(m)} />
      ))}</ChipScroll>
      <Field label="Model" value={model} onChangeText={(t) => { setModel(t); setErr(''); }} placeholder="Camry" autoCapitalize="words" />
      <Field label="Trim or engine (optional)" value={trim} onChangeText={setTrim} placeholder="SE 2.5L" />
      <Field label="Mileage (optional)" value={mileage} onChangeText={(t) => setMileage(t.replace(/[^\d,]/g, ''))} keyboardType="number-pad" placeholder="84,000" />
      <Field label="VIN (optional)" value={vin} onChangeText={(t) => setVin(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 17))} autoCapitalize="characters"
        hint="On the driver’s side of the dashboard or the door jamb. Helps your mechanic get the exact parts." />
      <Row gap={10}>
        <View style={{ flex: 1 }}><Field label="Plate (optional)" value={plate} onChangeText={setPlate} autoCapitalize="characters" /></View>
        <View style={{ flex: 1 }}><Field label="Color (optional)" value={color} onChangeText={setColor} placeholder="Silver" /></View>
      </Row>
      <Field label="Nickname (optional)" value={nickname} onChangeText={setNickname} placeholder="Mom’s car" />
      {id ? <View style={{ alignItems: 'center' }}><LinkButton title="Remove this vehicle" onPress={remove} /></View> : null}
    </Screen>
  );
}
