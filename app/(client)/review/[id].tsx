import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Avatar, TopHeader, Button, Chip, Field, Loading, Row, Screen, T } from '@/components/ui';
import { useData } from '@/hooks/useData';
import { getBooking, submitReview } from '@/lib/api';
import { REVIEW_TAGS } from '@/lib/constants';
import { firstName, shortDate } from '@/lib/format';
import { friendlyError } from '@/lib/supabase';
import { useColors } from '@/providers/SettingsProvider';

const WORDS = ['Tap a star', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

export default function Review() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: b } = useData(() => getBooking(id), [id]);
  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  if (!b) return <Loading />;

  const submit = async () => {
    setBusy(true);
    try {
      await submitReview(b.id, stars, tags, body);
      Alert.alert('Thank you!', 'Your review is posted.');
      router.back();
    } catch (e) { Alert.alert('Review not posted', friendlyError(e)); } finally { setBusy(false); }
  };

  return (
    <Screen header={<TopHeader back title="Rate your mechanic" showActions={false} />}>
      <View style={{ alignItems: 'center', gap: 8 }}>
        <Avatar name={b.mechanic?.full_name} url={b.mechanic?.avatar_url} id={b.mechanic_id ?? ''} size={80} />
        <T v="h2" center>How did {firstName(b.mechanic?.full_name)} do?</T>
        <T v="small" muted>{b.service} · {shortDate(b.scheduled_at)}</T>
        <Row gap={4} style={{ marginTop: 6 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} accessibilityRole="radio" accessibilityState={{ selected: stars === n }} accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`} onPress={() => setStars(n)} hitSlop={4}>
              <Ionicons name={n <= stars ? 'star' : 'star-outline'} size={44} color={n <= stars ? c.star : c.line} />
            </Pressable>
          ))}
        </Row>
        <T v="label">{WORDS[stars]}</T>
      </View>
      <Row gap={8} wrap style={{ justifyContent: 'center' }}>
        {REVIEW_TAGS.map((t) => <Chip key={t} label={t} on={tags.includes(t)} onPress={() => setTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t])} />)}
      </Row>
      <Field label="Tell others about the repair (optional)" value={body} onChangeText={setBody} multiline />
      <Button title="Post review" disabled={!stars} loading={busy} onPress={submit} />
    </Screen>
  );
}
