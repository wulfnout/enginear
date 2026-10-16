import { router } from 'expo-router';
import React from 'react';
import { Share } from 'react-native';
import { DisplaySettings, HelpMenu, MeHeader } from '@/components/MeHeader';
import { TopHeader, MenuGroup, MenuItem, Screen } from '@/components/ui';
import { useAuth } from '@/providers/AuthProvider';
import { SITE_URL } from '@/lib/constants';

export default function Account() {
  const { client } = useAuth();
  const prefs = [client?.prefers === 'mobile' ? 'Prefers mobile' : client?.prefers === 'shop' ? 'Prefers a shop' : null, ...(client?.needs ?? []).slice(0, 2)].filter(Boolean).join(' · ');
  return (
    <Screen header={<TopHeader title="Me" />}>
      <MeHeader roleLabel="Client account" />
      <MenuGroup title="Your account">
        <MenuItem icon="car-sport-outline" label="My garage" sub="Your cars and their service history" onPress={() => router.push('/vehicles')} />
        <MenuItem icon="options-outline" label="Preferences" sub={prefs || 'Not set yet'} onPress={() => router.push('/quiz')} />
        <MenuItem icon="location-outline" label="Address" sub={client?.address ?? 'Add your address'} onPress={() => router.push('/address')} />
        <MenuItem icon="wallet-outline" label="Spending" sub="Monthly totals, budget and receipts" onPress={() => router.push('/spending')} />
        <MenuItem icon="card-outline" label="Payment card" sub={client?.card_last4 ? `${client.card_brand} ending ${client.card_last4}` : 'No card yet'} onPress={() => router.push('/payment')} />
        <MenuItem icon="heart-outline" label="Saved mechanics" onPress={() => router.push('/saved')} />
        <MenuItem icon="gift-outline" label="Invite a friend" sub="They get $10 off their first repair" onPress={() =>
          Share.share({ message: `I use EngiNear to book trusted, background-checked mechanics who come to you or work from a shop. Use code FIRSTFIX10 for $10 off your first booking: ${SITE_URL}` })} />
      </MenuGroup>
      <DisplaySettings />
      <HelpMenu />
    </Screen>
  );
}
