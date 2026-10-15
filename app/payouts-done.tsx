import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Loading } from '@/components/ui';
import { connect } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';

/** Stripe sends mechanics back here after payout setup. */
export default function PayoutsDone() {
  const { refresh, mechanic } = useAuth();
  const [done, setDone] = useState(false);
  useEffect(() => {
    connect('status').catch(() => null).finally(async () => { await refresh(); setDone(true); });
  }, [refresh]);
  if (!done) return <Loading />;
  return <Redirect href={mechanic?.onboarding_complete ? '/earnings' : { pathname: '/onboarding/[step]', params: { step: 'payouts' } }} />;
}
