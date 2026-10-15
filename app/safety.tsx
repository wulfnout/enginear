import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Linking } from 'react-native';
import { TopHeader, Button, Card, Chip, Field, Row, Screen, T } from '@/components/ui';
import { friendlyError, supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useColors } from '@/providers/SettingsProvider';

const CATS = ['I felt unsafe', 'Harassment', 'Property damage', 'Injury', 'Something else'];

export default function Safety() {
  const c = useColors();
  const { session } = useAuth();
  const [cat, setCat] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [contact, setContact] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!session || !cat) return;
    setBusy(true);
    const { error } = await supabase.from('safety_reports').insert({ reporter_id: session.user.id, category: cat, details: details.trim(), trusted_contact: contact.trim() || null });
    setBusy(false);
    if (error) return Alert.alert('Report not sent', friendlyError(error));
    setCat(null); setDetails('');
    Alert.alert('Report sent', 'Our safety team will contact you as soon as possible.');
  };

  return (
    <Screen header={<TopHeader back title="Safety center" showActions={false} />}>
      <Card style={{ borderColor: c.bad }}>
        <Row><Ionicons name="alert-circle" size={24} color={c.bad} /><T v="h3" color={c.bad}>In an emergency, call 911</T></Row>
        <T v="small">Then tell us what happened below so our safety team can follow up.</T>
        <Button kind="danger" icon="call" title="Call 911" onPress={() => Linking.openURL('tel:911')} />
      </Card>
      <Card>
        <T v="h3">How we keep everyone safe</T>
        {([
          ['shield-checkmark-outline', 'Every mechanic verifies their ID and agrees to a background check'],
          ['chatbubbles-outline', 'Keep messages and payments inside the app'],
          ['star-outline', 'Clients and mechanics rate each other after every job'],
          ['location-outline', 'Exact addresses are only shared after a mechanic accepts'],
        ] as const).map(([i, t]) => (
          <Row key={t} gap={12} style={{ alignItems: 'flex-start' }}><Ionicons name={i} size={22} color={c.brand} /><T v="small" style={{ flex: 1 }}>{t}</T></Row>
        ))}
      </Card>
      <Card>
        <T v="h3">Report a safety issue</T>
        <Row gap={8} wrap>{CATS.map((x) => <Chip key={x} label={x} on={cat === x} onPress={() => setCat(x)} />)}</Row>
        <Field label="What happened?" value={details} onChangeText={setDetails} multiline />
        <Field label="Best phone number to reach you (optional)" value={contact} onChangeText={setContact} keyboardType="phone-pad" />
        <Button kind="danger" title="Send report" disabled={!cat || details.trim().length < 5} loading={busy} onPress={send} />
      </Card>
    </Screen>
  );
}
