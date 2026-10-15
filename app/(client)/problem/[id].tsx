import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert } from 'react-native';
import { TopHeader, Button, Chip, Field, Row, Screen, T } from '@/components/ui';
import { reportProblem } from '@/lib/api';
import { friendlyError } from '@/lib/supabase';

const TYPES = ['Missed areas', 'Late or no-show', 'Something was damaged', 'Other'];

export default function Problem() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [type, setType] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    try {
      await reportProblem(id, `${type}: ${text.trim()}`);
      Alert.alert('Thanks for telling us', 'Our team will contact you within 24 hours to make it right.');
      router.back();
    } catch (e) { Alert.alert('Not sent', friendlyError(e)); } finally { setBusy(false); }
  };

  return (
    <Screen header={<TopHeader back title="Report a problem" showActions={false} />}>
      <T muted>Not happy with the work? Tell us what happened and we’ll make it right. While a problem is open, the job isn’t approved automatically.</T>
      <T v="h3">What went wrong?</T>
      <Row gap={8} wrap>{TYPES.map((t) => <Chip key={t} label={t} on={type === t} onPress={() => setType(t)} />)}</Row>
      <Field label="Details" value={text} onChangeText={setText} multiline placeholder="Which rooms or items, and what you expected" />
      <Button title="Send" disabled={!type || text.trim().length < 5} loading={busy} onPress={send} />
    </Screen>
  );
}
