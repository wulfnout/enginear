import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { TopHeader, Button, Card, Row, Screen, T } from '@/components/ui';
import { usePaymentCard } from '@/hooks/usePaymentCard';
import { useAuth } from '@/providers/AuthProvider';
import { useColors } from '@/providers/SettingsProvider';

export default function Payment() {
  const c = useColors();
  const { client } = useAuth();
  const { addCard, busy } = usePaymentCard();
  return (
    <Screen header={<TopHeader back title="Payment card" showActions={false} />}>
      {client?.card_last4 ? (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Ionicons name="card" size={28} color={c.brand} />
          <T v="h3" style={{ flex: 1 }}>{client.card_brand} ending {client.card_last4}</T>
        </Card>
      ) : <T muted>No card saved yet.</T>}
      <Button icon="card-outline" title={client?.card_last4 ? 'Replace card' : 'Add a card'} onPress={addCard} loading={busy} />
      <Card style={{ gap: 8 }}>
        <Row><Ionicons name="lock-closed-outline" size={20} color={c.ok} /><T v="label">How payment works</T></Row>
        <T v="small" muted>Your card details go straight to Stripe, our payment processor. EngiNear never sees your full card number.</T>
        <T v="small" muted>You’re charged after you approve the finished work. Tips are optional and go 100% to your mechanic.</T>
      </Card>
    </Screen>
  );
}
