import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert } from 'react-native';
import { TopHeader, Button, Field, Screen } from '@/components/ui';
import { friendlyError } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

export default function EditProfile() {
  const { profile, updateProfile } = useAuth();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) return Alert.alert('Name needed', 'Please enter your name.');
    setBusy(true);
    try {
      await updateProfile({ full_name: name.trim(), phone: phone.trim() || null });
      router.back();
    } catch (e) { Alert.alert('Not saved', friendlyError(e)); } finally { setBusy(false); }
  };

  return (
    <Screen header={<TopHeader back title="Edit profile" showActions={false} />}>
      <Field label="Full name" value={name} onChangeText={setName} autoComplete="name" autoCapitalize="words" />
      <Field label="Mobile number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" />
      <Button title="Save" onPress={save} loading={busy} />
    </Screen>
  );
}
