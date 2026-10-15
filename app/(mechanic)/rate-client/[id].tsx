import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Chip, LinkButton, Row, T } from '@/components/ui';
import { submitReview } from '@/lib/api';
import { CLIENT_REVIEW_TAGS } from '@/lib/constants';
import { money } from '@/lib/format';
import { useColors } from '@/providers/SettingsProvider';

export default function RateClient() {
  const c = useColors();
  const { id, earned } = useLocalSearchParams<{ id: string; earned?: string }>();
  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const done = async () => {
    if (stars) {
      setBusy(true);
      try { await submitReview(id, stars, tags, ''); } catch { /* rating is optional */ }
      setBusy(false);
    }
    router.replace('/earnings');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flex: 1, padding: 20, gap: 14, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: c.okSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="cash" size={42} color={c.ok} />
        </View>
        <T v="h1" center>{earned ? `+${money(Number(earned))} earned` : 'Job finished'}</T>
        <T muted center>Great work! Your pay is on its way to your payout account.</T>
        <Card style={{ alignSelf: 'stretch', alignItems: 'center' }}>
          <T v="h3">How was your client?</T>
          <Row gap={4}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} accessibilityRole="radio" accessibilityLabel={`${n} stars`} accessibilityState={{ selected: stars === n }} onPress={() => setStars(n)}>
                <Ionicons name={n <= stars ? 'star' : 'star-outline'} size={40} color={n <= stars ? c.star : c.line} />
              </Pressable>
            ))}
          </Row>
          <Row gap={8} wrap style={{ justifyContent: 'center' }}>
            {CLIENT_REVIEW_TAGS.map((t) => <Chip key={t} label={t} on={tags.includes(t)} onPress={() => setTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t])} />)}
          </Row>
          <T v="tiny" muted center>Client ratings help other mechanics choose safe, respectful jobs.</T>
        </Card>
        <Button style={{ alignSelf: 'stretch' }} title="Done" loading={busy} onPress={done} />
        <LinkButton title="Skip" onPress={() => router.replace('/earnings')} />
      </View>
    </SafeAreaView>
  );
}
