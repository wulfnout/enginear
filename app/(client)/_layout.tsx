import { Redirect, Stack } from 'expo-router';
import React from 'react';
import { Loading } from '@/components/ui';
import { useAuth } from '@/providers/AuthProvider';
import { useColors } from '@/providers/SettingsProvider';

/** Only client accounts can see these screens. */
export default function ClientLayout() {
  const { ready, session, profile } = useAuth();
  const c = useColors();
  if (!ready) return <Loading />;
  if (!session) return <Redirect href="/welcome" />;
  if (!profile) return <Loading />;
  if (profile.role !== 'client') return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }} />;
}
