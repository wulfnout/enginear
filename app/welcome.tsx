import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FirstPost } from '@/components/FirstPost';
import { MascotMark } from '@/components/Mascot';
import { Card, Row, T } from '@/components/ui';
import { useColors } from '@/providers/SettingsProvider';
import { BRAND } from '@/theme';

export default function Welcome() {
  const c = useColors();
  const role = (title: string, sub: string, icon: 'car-sport' | 'construct', href: '/auth/client' | '/auth/mechanic', filled: boolean) => (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={() => router.push(href)}
      style={({ pressed }) => ({ backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.line, padding: 20,
        flexDirection: 'row', alignItems: 'center', gap: 14, opacity: pressed ? 0.9 : 1,
        shadowColor: '#C4521C', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 })}>
      <View style={{ width: 58, height: 58, borderRadius: 14, backgroundColor: filled ? BRAND : c.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={30} color={filled ? '#fff' : BRAND} />
      </View>
      <View style={{ flex: 1 }}>
        <T v="h3">{title}</T>
        <T v="small" muted>{sub}</T>
      </View>
      <Ionicons name="chevron-forward" size={22} color={c.muted} />
    </Pressable>
  );
  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ paddingBottom: 32 }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: BRAND, overflow: 'hidden' }}>
        <View style={{ padding: 20, paddingBottom: 72, gap: 10 }}>
          <Row>
            <MascotMark size={54} />
            <T v="h2" color="#fff">EngiNear</T>
          </Row>
          <T v="h1" color="#fff" style={{ fontSize: 33, lineHeight: 39, marginTop: 18 }}>A mechanic near you.{'\n'}<T v="h1" color="#FFF1E8" style={{ fontSize: 33, lineHeight: 39 }}>No surprises.</T></T>
          <T color="#fff" style={{ opacity: 0.94, fontSize: 17 }}>Book a background-checked mechanic who comes to you or works from a shop. You approve every dollar before it’s added.</T>
        </View>
      </SafeAreaView>
      <View style={{ marginTop: -48, paddingHorizontal: 16, gap: 12 }}>
        {role('I need a mechanic', 'Repairs and maintenance in your driveway or at a shop', 'car-sport', '/auth/client', false)}
        {role('I’m a mechanic', 'Find jobs, set your own prices, get paid fast', 'construct', '/auth/mechanic', true)}
        <FirstPost audience="everyone" showAction={false} />
        <Card style={{ marginTop: 12 }}>
          <T v="h3">Why people use EngiNear</T>
          {([
            ['shield-checkmark-outline', 'Every mechanic is ID verified and background checked'],
            ['document-text-outline', 'Parts and labor are quoted in the app. Nothing is added unless you approve it'],
            ['car-sport-outline', 'Mobile mechanics come to your driveway; shops are on the map too'],
            ['star-outline', 'Reviews come only from real, completed jobs'],
            ['cash-outline', 'Mechanics are paid directly, with no lead fees or subscriptions'],
          ] as const).map(([i, t]) => (
            <Row key={t} gap={12}><Ionicons name={i} size={22} color={BRAND} /><T v="small" style={{ flex: 1 }}>{t}</T></Row>
          ))}
        </Card>
        <T v="tiny" muted center>Client and mechanic accounts are separate. Each has its own sign in.</T>
      </View>
    </ScrollView>
  );
}
