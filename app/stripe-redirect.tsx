import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { Loading } from '@/components/ui';

/**
 * Stripe sends people back here after a bank or card check outside the app.
 * Stripe's SDK finishes the payment step on its own; we just return to where they were.
 */
export default function StripeRedirect() {
  useEffect(() => {
    const t = setTimeout(() => (router.canGoBack() ? router.back() : router.replace('/')), 50);
    return () => clearTimeout(t);
  }, []);
  return <Loading />;
}
