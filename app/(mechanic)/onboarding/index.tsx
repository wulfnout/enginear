import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MascotMark } from '@/components/Mascot';
import { Button, Card, Row, T } from '@/components/ui';
import { firstName } from '@/lib/format';
import { useAuth } from '@/providers/AuthProvider';
import { useColors } from '@/providers/SettingsProvider';
import { BRAND } from '@/theme';

/** Wonolo-style welcome: explain how it works in three steps, then start setup. */
export default function MechanicIntro() {
  const c = useColors();
  const { profile } = useAuth();
  const points = [
    ['search', 'Pick the jobs you want', 'See the car, the problem, the pay and the distance before you accept. No bidding, no lead fees.'],
    ['construct', 'Your prices, your way', 'Flat prices, hourly, or diagnose-then-quote. Mobile, at your shop, or both.'],
    ['flash', 'Get paid fast', 'Clients approve quotes in the app, so parts are covered. Pay is sent when you finish; cash out instantly.'],
  ] as const;
  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ paddingBottom: 32 }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: BRAND, overflow: 'hidden' }}>
        <View style={{ padding: 20, paddingBottom: 56, gap: 10 }}>
          <Row>
            <MascotMark size={54} />
            <T v="h2" color="#fff">EngiNear Pro</T>
          </Row>
          <T v="h1" color="#fff" style={{ marginTop: 16 }}>Hi {firstName(profile?.full_name)}, let’s get you working.</T>
          <T color="#fff" style={{ opacity: 0.94 }}>Here’s how EngiNear works for mechanics:</T>
        </View>
      </SafeAreaView>
      <View style={{ marginTop: -32, paddingHorizontal: 16, gap: 12 }}>
        {points.map(([icon, title, text], i) => (
          <Card key={title} style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
              <T v="h3" color={c.brandInk}>{i + 1}</T>
            </View>
            <View style={{ flex: 1 }}>
              <Row gap={6}><Ionicons name={icon} size={18} color={c.brand} /><T v="h3">{title}</T></Row>
              <T v="small" muted>{text}</T>
            </View>
          </Card>
        ))}
        <Card>
          <T v="h3">What you’ll need</T>
          {['A driver’s license or state ID', 'A phone camera for a quick selfie', 'A bank account or debit card for payouts', 'Your shop address, if you have one', 'About 10 minutes'].map((t) => (
            <Row key={t} gap={10}><Ionicons name="checkmark-circle" size={20} color={c.ok} /><T v="small">{t}</T></Row>
          ))}
        </Card>
        <Button title="Get started" onPress={() => router.replace('/onboarding/checklist')} />
        <T v="tiny" muted center>Your progress saves automatically.</T>
      </View>
    </ScrollView>
  );
}
