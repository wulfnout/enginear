import { router } from 'expo-router';
import React from 'react';
import { MechanicCard } from '@/components/cards';
import { TopHeader, EmptyState, Screen } from '@/components/ui';
import { useData } from '@/hooks/useData';
import { getSaved, searchMechanics, setSaved } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';

export default function Saved() {
  const { client, session } = useAuth();
  const { data, reload } = useData(async () => {
    const [ids, all] = await Promise.all([getSaved(), searchMechanics({ lat: client?.lat ?? null, lng: client?.lng ?? null, radius: 10000 })]);
    return all.filter((c) => ids.includes(c.id));
  });
  return (
    <Screen header={<TopHeader back title="Saved mechanics" showActions={false} />}>
      {data?.length ? data.map((c) => (
        <MechanicCard key={c.id} c={c} saved onToggleSave={async () => { if (session) { await setSaved(session.user.id, c.id, false); reload(); } }}
          onPress={() => router.push({ pathname: '/mechanic/[id]', params: { id: c.id } })} />
      )) : data ? <EmptyState icon="heart-outline" title="No saved mechanics yet" text="Tap the heart on any mechanic to save them here." /> : null}
    </Screen>
  );
}
