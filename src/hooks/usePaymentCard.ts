import { initStripe, useStripe } from '@stripe/stripe-react-native';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Alert } from 'react-native';
import { paymentSheetParams } from '@/lib/api';
import { STRIPE_LIVE_KEY, STRIPE_TEST_KEY } from '@/lib/stripeKeys';
import { useAuth } from '@/providers/AuthProvider';

/** Opens Stripe's secure card form to save (not charge) a card. Charging happens after each job. */
export function usePaymentCard() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { refresh } = useAuth();
  const [busy, setBusy] = useState(false);

  const addCard = async (): Promise<boolean> => {
    setBusy(true);
    try {
      const p = await paymentSheetParams();
      // Use the key that matches the server's Stripe mode, so the card form always lines up.
      if (typeof p.livemode === 'boolean') {
        await initStripe({
          publishableKey: p.livemode ? STRIPE_LIVE_KEY : STRIPE_TEST_KEY,
          merchantIdentifier: 'merchant.app.enginear',
          urlScheme: 'enginear',
        });
      }
      const init = await initPaymentSheet({
        merchantDisplayName: 'EngiNear',
        customerId: p.customer,
        customerEphemeralKeySecret: p.ephemeralKey,
        setupIntentClientSecret: p.setupIntent,
        allowsDelayedPaymentMethods: false,
        returnURL: Linking.createURL('stripe-redirect'),
        applePay: { merchantCountryCode: 'US' },
        googlePay: { merchantCountryCode: 'US', testEnv: __DEV__ },
      });
      if (init.error) throw new Error(init.error.message);
      const res = await presentPaymentSheet();
      if (res.error) {
        if (res.error.code !== 'Canceled') Alert.alert('Card not saved', res.error.message);
        return false;
      }
      // The server saves the card details from Stripe's confirmation. Give it a moment.
      for (let i = 0; i < 4; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        await refresh();
      }
      Alert.alert('Card saved ✓', 'You’re all set. Your card is only charged after you approve the finished work.');
      return true;
    } catch (e) {
      Alert.alert('Card not saved', (e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { addCard, busy };
}
