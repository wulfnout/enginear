import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { FirstPost } from '@/components/FirstPost';
import { TopHeader, Button, LinkButton, Progress, Row, Screen, T } from '@/components/ui';
import { MECHANIC_STEPS } from '@/lib/constants';
import { friendlyError } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useColors } from '@/providers/SettingsProvider';

export default function Checklist() {
  const c = useColors();
  const { mechanic, updateMechanic, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const done = (k: string) => !!mechanic?.onboarding_steps?.[k];
  const n = MECHANIC_STEPS.filter((s) => done(s.key)).length;
  const all = n === MECHANIC_STEPS.length;
  const live = !!mechanic?.onboarding_complete;

  const submit = async () => {
    setBusy(true);
    try {
      await updateMechanic({ onboarding_complete: true, is_online: true });
      router.replace('/onboarding/approved');
    } catch (e) { Alert.alert('Not submitted', friendlyError(e)); } finally { setBusy(false); }
  };

  return (
    <Screen header={<TopHeader back={live} title={live ? 'Work preferences' : 'Your path to work'} showActions={false}
      right={live ? undefined : <LinkButton title="Save & exit" color="#fff" onPress={() => signOut()} />} />}>
      {!live ? <FirstPost audience="mechanic" showAction={false} /> : null}
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="h3">{n} of {MECHANIC_STEPS.length} steps done</T>
        <T v="small" muted>{all ? 'Ready' : `About ${Math.max(1, Math.round((MECHANIC_STEPS.length - n) * 1.5))} min left`}</T>
      </Row>
      <Progress value={n / MECHANIC_STEPS.length} height={10} />
      {MECHANIC_STEPS.map((s, i) => {
        const d = done(s.key);
        return (
          <Pressable key={s.key} accessibilityRole="button" accessibilityLabel={`${s.title}, ${d ? 'done' : 'not done'}`}
            onPress={() => router.push({ pathname: '/onboarding/[step]', params: { step: s.key } })}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: c.surface,
              borderRadius: 16, borderWidth: 1, borderColor: c.line, opacity: pressed ? 0.85 : 1 })}>
            <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: d ? c.ok : c.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
              {d ? <Ionicons name="checkmark" size={20} color="#fff" /> : <T v="label" color={c.brandInk}>{i + 1}</T>}
            </View>
            <View style={{ flex: 1 }}>
              <T v="h3">{s.title}</T>
              <T v="small" muted>{d ? 'Done. Tap to edit.' : s.desc}</T>
            </View>
            <Ionicons name="chevron-forward" size={20} color={c.muted} />
          </Pressable>
        );
      })}
      {!live ? <Button title="Submit and start working" disabled={!all} loading={busy} onPress={submit} /> : null}
    </Screen>
  );
}
