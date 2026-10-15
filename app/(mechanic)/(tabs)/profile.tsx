import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import { Alert, Share } from 'react-native';
import { DisplaySettings, HelpMenu, MeHeader } from '@/components/MeHeader';
import { RatingCard } from '@/components/RatingCard';
import { TopHeader, Card, Chip, MenuGroup, MenuItem, Row, Screen, T } from '@/components/ui';
import { useData } from '@/hooks/useData';
import { connect, getMechanicReviews, payoutsReturnLink } from '@/lib/api';
import { friendlyError } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { SITE_URL } from '@/lib/constants';

const VERIFY_LABEL = { not_started: 'Not started', pending: 'In progress', approved: 'Verified', needs_review: 'Under review', rejected: 'Not approved' } as const;

export default function MechanicMe() {
  const { mechanic, session, updateMechanic, refresh } = useAuth();
  const myId = session?.user.id;
  const { data: reviews } = useData(() => (myId ? getMechanicReviews(myId) : Promise.resolve([])), [myId], ['reviews']);
  const [opening, setOpening] = useState(false);
  // Opens Stripe so the mechanic can add or change their bank account or debit card.
  const payouts = async () => {
    if (opening) return;
    setOpening(true);
    try {
      const r = await connect<{ url: string; onboarding?: boolean }>(mechanic?.stripe_account_id ? 'dashboard' : 'onboard');
      if (mechanic?.stripe_account_id && !r.onboarding) {
        // Stripe's payout dashboard: they close it with "Done" when finished.
        await WebBrowser.openBrowserAsync(r.url);
      } else {
        await WebBrowser.openAuthSessionAsync(r.url, payoutsReturnLink());
      }
      await connect('status').catch(() => null);
      await refresh();
    } catch (e) { Alert.alert('Couldn’t open payout settings', friendlyError(e)); } finally { setOpening(false); }
  };
  return (
    <Screen header={<TopHeader title="Me" />}>
      <MeHeader roleLabel={mechanic?.verification_status === 'approved' ? 'Mechanic · Verified' : 'Mechanic'} />
      <RatingCard rating={Number(mechanic?.rating ?? 0)} count={mechanic?.rating_count ?? 0} reviews={reviews ?? []} />
      <MenuGroup title="Work">
        <MenuItem icon="pricetag-outline" label="My prices" sub={`$${mechanic?.hourly_rate}/hr labor · $${mechanic?.diag_fee} diagnosis`} onPress={() => router.push({ pathname: '/onboarding/[step]', params: { step: 'pricing' } })} />
        <MenuItem icon="location-outline" label="Where I work" sub={mechanic?.work_mode === 'shop' ? (mechanic.shop_name || 'At my shop') : mechanic?.work_mode === 'both' ? `Mobile + ${mechanic.shop_name || 'my shop'}` : `Mobile · ${mechanic?.radius_miles} mi`} onPress={() => router.push({ pathname: '/onboarding/[step]', params: { step: 'where' } })} />
        <MenuItem icon="construct-outline" label="Work preferences" sub={mechanic?.services.slice(0, 3).join(', ') || 'Not set'} onPress={() => router.push('/onboarding/checklist')} />
        <MenuItem icon="wallet-outline" label="Payout settings" sub={opening ? 'Opening Stripe…' : mechanic?.payouts_enabled ? 'Change your bank account or debit card' : mechanic?.stripe_account_id ? 'Finish setup with Stripe' : 'Set up with Stripe'} onPress={payouts} />
        <MenuItem icon="shield-checkmark-outline" label="Background check" sub={VERIFY_LABEL[mechanic?.verification_status ?? 'not_started']} onPress={() => router.push({ pathname: '/onboarding/[step]', params: { step: 'verify' } })} />
        <MenuItem icon="gift-outline" label="Refer a mechanic" onPress={() =>
          Share.share({ message: `I find mechanic jobs with no lead fees and get paid fast with EngiNear Pro. Join here: ${SITE_URL}` })} />
      </MenuGroup>
      <Card>
        <T v="h3">Weekly earnings goal</T>
        <T v="small" muted>Shown on your Earnings tab</T>
        <Row gap={8} wrap>
          {[600, 1000, 1500, 2000, 3000].map((v) => <Chip key={v} label={`$${v}`} on={mechanic?.weekly_goal === v} onPress={() => updateMechanic({ weekly_goal: v })} />)}
        </Row>
      </Card>
      <DisplaySettings />
      <HelpMenu />
    </Screen>
  );
}
