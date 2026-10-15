import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { TopHeader, Button, Field, Notice, Screen, T } from '@/components/ui';
import { friendlyError, supabase } from '@/lib/supabase';

/** Opened from the password reset email (enginear://reset-password#access_token=...). */
export default function ResetPassword() {
  const url = Linking.useURL();
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!url) return;
    const hash = url.split('#')[1] ?? '';
    const p = new URLSearchParams(hash);
    const access_token = p.get('access_token');
    const refresh_token = p.get('refresh_token');
    if (access_token && refresh_token) supabase.auth.setSession({ access_token, refresh_token });
  }, [url]);

  const save = async () => {
    if (pw.length < 8) return setErr('Your password needs at least 8 characters.');
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setErr(friendlyError(error));
    router.replace('/');
  };

  return (
    <Screen header={<TopHeader title="New password" showActions={false} />}>
      <T v="h2">Choose a new password</T>
      {err ? <Notice text={err} /> : null}
      <Field label="New password" value={pw} onChangeText={setPw} secureTextEntry autoComplete="new-password" textContentType="newPassword" hint="At least 8 characters" />
      <Button title="Save password" onPress={save} loading={busy} />
    </Screen>
  );
}
