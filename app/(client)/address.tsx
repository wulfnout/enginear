import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert } from 'react-native';
import { TopHeader, Button, Field, Screen, T } from '@/components/ui';
import { geocode } from '@/lib/api';
import { friendlyError } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

export default function Address() {
  const { client, updateClient } = useAuth();
  const [addr, setAddr] = useState(client?.address ?? '');
  const [notes, setNotes] = useState(client?.entry_notes ?? '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (addr.trim().length < 5) return Alert.alert('Address needed', 'Please enter your street address, city and state.');
    setBusy(true);
    try {
      const pos = await geocode(addr);
      await updateClient({ address: addr.trim(), entry_notes: notes.trim() || null, lat: pos?.lat ?? null, lng: pos?.lng ?? null });
      if (!pos) Alert.alert('Saved', 'We couldn’t find that address on the map. Check the spelling so distances show correctly.');
      router.back();
    } catch (e) { Alert.alert('Not saved', friendlyError(e)); } finally { setBusy(false); }
  };

  return (
    <Screen header={<TopHeader back title="Your address" showActions={false} />}>
      <T muted>Mobile mechanics come here. Only shared with the mechanic you book.</T>
      <Field label="Street address" value={addr} onChangeText={setAddr} placeholder="123 Main St, Springfield, IL" autoComplete="street-address" textContentType="fullStreetAddress" />
      <Field label="Where the car is parked (optional)" value={notes} onChangeText={setNotes} placeholder="Driveway, lot space 14, gate code 2580" />
      <Button title="Save address" onPress={save} loading={busy} />
    </Screen>
  );
}
