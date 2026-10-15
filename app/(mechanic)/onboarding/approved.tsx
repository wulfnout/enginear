import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, LinkButton, T } from '@/components/ui';
import { useAuth } from '@/providers/AuthProvider';
import { useColors } from '@/providers/SettingsProvider';

export default function Approved() {
  const c = useColors();
  const { mechanic } = useAuth();
  const verified = mechanic?.verification_status === 'approved';
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <View style={{ width: 92, height: 92, borderRadius: 46, backgroundColor: c.okSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="shield-checkmark" size={48} color={c.ok} />
        </View>
        <T v="h1" center>You’re all set!</T>
        <T muted center>
          Your profile is live and you can start accepting jobs.
          {verified ? '' : ' Your background check is being processed. Your Verified badge appears as soon as it clears.'}
        </T>
        <Button style={{ alignSelf: 'stretch' }} title="Find my first job" onPress={() => router.replace('/jobs')} />
        <LinkButton title="Go to my earnings" onPress={() => router.replace('/earnings')} />
      </View>
    </SafeAreaView>
  );
}
