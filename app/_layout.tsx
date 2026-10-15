import { StripeProvider, useStripe } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { SettingsProvider, useColors } from '@/providers/SettingsProvider';
import { STRIPE_DEFAULT_KEY } from '@/lib/stripeKeys';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Shell() {
  const { ready, profile } = useAuth();
  const c = useColors();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Open the right screen when someone taps a push notification.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((res) => {
      const data = res.notification.request.content.data as Record<string, string>;
      if (data?.conversation_id) router.push({ pathname: '/chat/[id]', params: { id: data.conversation_id } });
      else if (data?.booking_id) router.push(profile?.role === 'mechanic' ? '/schedule' : '/bookings');
      else router.push('/notifications');
    });
    return () => sub.remove();
  }, [profile?.role]);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }} />
    </>
  );
}

// Where Stripe sends people back after a bank or card check. In Expo Go the app's link looks different.
const STRIPE_URL_SCHEME = Constants.appOwnership === 'expo' ? Linking.createURL('/--/') : Linking.createURL('');

/** Hands links coming back from Stripe (e.g. after a bank verification page) to Stripe's SDK. */
function StripeLinkHandler() {
  const { handleURLCallback } = useStripe();
  useEffect(() => {
    const handle = (url: string | null) => { if (url) handleURLCallback(url).catch(() => {}); };
    Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener('url', (e) => handle(e.url));
    return () => sub.remove();
  }, [handleURLCallback]);
  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <StripeProvider
          publishableKey={STRIPE_DEFAULT_KEY}
          merchantIdentifier="merchant.app.enginear"
          urlScheme={STRIPE_URL_SCHEME}
        >
          <StripeLinkHandler />
          <AuthProvider>
            <Shell />
          </AuthProvider>
        </StripeProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
