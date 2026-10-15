import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { TopHeader, Button, Card, Screen, T } from '@/components/ui';
import { SUPPORT_EMAIL } from '@/lib/constants';
import { useAuth } from '@/providers/AuthProvider';
import { useColors } from '@/providers/SettingsProvider';

const CLIENT_FAQ: readonly (readonly [string, string])[] = [
  ['How do I book a mechanic?', 'On Home, tap Book a mechanic. Pick the service, your car, mobile or shop, and a time. Then choose a mechanic or tap Any available mobile mechanic.'],
  ['When am I charged?', 'Your card is saved when you book and charged only after you approve the finished work.'],
  ['How do quotes work?', 'If your mechanic finds parts or repairs you need, they send a quote in the app with every part and labor line. Nothing is added to your bill unless you tap Approve.'],
  ['How does cancelling work?', 'Cancel free up to 24 hours before. Inside 24 hours, a $15 fee goes to the mechanic for their lost time.'],
  ['What if I’m not happy?', 'Tap Report a problem while the job is in progress, or within 48 hours after in Bookings › Past. Our team works with your mechanic to make it right.'],
  ['Are mechanics checked?', 'Every mechanic verifies their ID with a photo and selfie and agrees to a background check. Mechanics with a Background checked badge have passed.'],
  ['How do I make the text bigger?', 'Go to Me › Display › Text size and choose Large or Largest.'],
] as const;
const MECHANIC_FAQ: readonly (readonly [string, string])[] = [
  ['How do I get paid?', 'When you tap Finish job & get paid, the client is charged and your pay goes to your Stripe payout account.'],
  ['Can I get paid instantly?', 'Yes. On Earnings, tap Cash out now. Stripe charges a small fee and the money usually arrives within 30 minutes.'],
  ['How do quotes work?', 'In Schedule, tap Quote extra parts or work. List each part and labor line. Your client approves or declines in their app, and approved quotes are added to the bill automatically.'],
  ['How much does EngiNear keep?', 'EngiNear keeps 10% of labor and diagnostic fees. Parts and tips are 100% yours.'],
  ['What if a client cancels late?', 'If a client cancels within 24 hours of a confirmed job, you receive a $15 fee.'],
  ['How do I get more jobs?', 'Stay online, keep a 4.7+ rating, arrive on time and widen your travel distance in Me › Where I work.'],
  ['How do I make the text bigger?', 'Go to Me › Display › Text size and choose Large or Largest.'],
] as const;

export default function Help() {
  const c = useColors();
  const { profile } = useAuth();
  const [open, setOpen] = useState<number | null>(null);
  const faq = profile?.role === 'mechanic' ? MECHANIC_FAQ : CLIENT_FAQ;
  return (
    <Screen header={<TopHeader back title="Common questions" showActions={false} />}>
      {faq.map(([q, a], i) => (
        <Card key={q} onPress={() => setOpen(open === i ? null : i)} accessibilityLabel={q}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <T v="label" style={{ flex: 1 }}>{q}</T>
            <Ionicons name={open === i ? 'remove' : 'add'} size={22} color={c.brand} />
          </View>
          {open === i ? <T v="small" muted>{a}</T> : null}
        </Card>
      ))}
      <Card>
        <T v="h3">Still need help?</T>
        <Button icon="help-buoy-outline" title="Ask the Help Assistant" onPress={() => router.push('/assistant')} />
        <Pressable accessibilityRole="text"><T v="small" muted selectable>Or email a person: {SUPPORT_EMAIL}</T></Pressable>
      </Card>
    </Screen>
  );
}
