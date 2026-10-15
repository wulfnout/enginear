import { Redirect } from 'expo-router';
import React from 'react';
import { Loading } from '@/components/ui';
import { useAuth } from '@/providers/AuthProvider';

/** Sends each person to the right place: welcome, setup, or their own app. */
export default function Index() {
  const { ready, session, profile, client, mechanic } = useAuth();
  if (!ready || (session && !profile)) return <Loading />;
  if (!session || !profile) return <Redirect href="/welcome" />;
  if (profile.role === 'client') {
    if (!client) return <Loading />;
    return <Redirect href={client.onboarded ? '/home' : '/quiz'} />;
  }
  if (!mechanic) return <Loading />;
  if (mechanic.onboarding_complete) return <Redirect href="/earnings" />;
  return <Redirect href={Object.keys(mechanic.onboarding_steps ?? {}).length ? '/onboarding/checklist' : '/onboarding'} />;
}
