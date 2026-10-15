import { useStripe } from '@stripe/stripe-react-native';
import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { usePaymentCard } from '@/hooks/usePaymentCard';
import { retryPayment } from '@/lib/api';
import { firstName, money } from '@/lib/format';
import { friendlyError } from '@/lib/supabase';
import type { BookingWithPeople } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';
import { useColors } from '@/providers/SettingsProvider';
import { Button, Row, T } from './ui';

/** Shown on a finished job whose payment was declined: retry, or switch cards and retry. */
export function PaymentRetry({ b, onChange }: { b: BookingWithPeople; onChange: () => void }) {
  const c = useColors();
  const { client } = useAuth();
  const { handleNextAction } = useStripe();
  const { addCard, busy: cardBusy } = usePaymentCard();
  const [busy, setBusy] = useState(false);
  const who = firstName(b.mechanic?.full_name) || 'your mechanic';

  const retry = async () => {
    setBusy(true);
    try {
      let r = await retryPayment(b.id);
      if (r.needsAction && r.clientSecret) {
        // The bank wants to verify it's you (for example a code by text).
        const { error } = await handleNextAction(r.clientSecret);
        if (error) throw new Error(error.message);
        r = await retryPayment(b.id);
      }
      if (r.ok) {
        onChange();
        Alert.alert('Payment complete ✓', `Thank you! ${who} has been paid.`);
      } else {
        throw new Error('The payment still didn’t go through. Try a different card.');
      }
    } catch (e) {
      Alert.alert('Payment didn’t go through', friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const newCard = async () => {
    const saved = await addCard();
    if (saved) await retry();
  };

  return (
    <View style={{ gap: 8, backgroundColor: c.badSoft, borderRadius: 14, padding: 12 }}>
      <T v="label" color={c.bad}>Payment didn’t go through</T>
      <T v="small">Your card was declined for {money(b.total_cents)}. {who} doesn’t get paid until this is settled.</T>
      {client?.card_last4 ? <T v="tiny" muted>Card on file: {client.card_brand} ending {client.card_last4}</T> : null}
      <Row gap={8}>
        <Button small style={{ flex: 1 }} icon="refresh" title="Retry payment" loading={busy} disabled={cardBusy} onPress={retry} />
        <Button small kind="soft" style={{ flex: 1 }} icon="card-outline" title="Use a different card" loading={cardBusy} disabled={busy} onPress={newCard} />
      </Row>
    </View>
  );
}
