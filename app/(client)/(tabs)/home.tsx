import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { MechanicTile } from '@/components/cards';
import { FirstPost } from '@/components/FirstPost';
import { Avatar, TopHeader, Button, Card, Row, SearchBar, SectionTitle, T } from '@/components/ui';
import { setDraft } from '@/hooks/draft';
import { useData } from '@/hooks/useData';
import { getSaved, myBookings, myVehicles, searchMechanics, vehicleName } from '@/lib/api';
import { serviceIcon } from '@/lib/constants';
import { firstName, longDate, timeOf } from '@/lib/format';
import { sortMechanics } from '@/lib/match';
import { useAuth } from '@/providers/AuthProvider';
import { useColors } from '@/providers/SettingsProvider';
import { ACCENT, HEADER } from '@/theme';

const CATEGORIES = ['Oil change', 'Diagnostics', 'Brakes', 'Battery', 'Tires & rotation', 'AC & heating', 'Electrical', 'Pre-purchase inspection'];

export default function Home() {
  const c = useColors();
  const { profile, client } = useAuth();
  const [q, setQ] = useState('');
  const { data, refreshing, refresh } = useData(async () => {
    const [mechanics, bookings, saved, vehicles] = await Promise.all([
      searchMechanics({ lat: client?.lat ?? null, lng: client?.lng ?? null }),
      myBookings(),
      getSaved(),
      myVehicles(),
    ]);
    return { mechanics, bookings, saved, vehicles };
  }, [client?.lat], ['bookings']);

  const picks = sortMechanics(data?.mechanics ?? [], 'match', client).slice(0, 8);
  const next = (data?.bookings ?? []).filter((b) => ['open', 'requested', 'confirmed', 'in_progress'].includes(b.status))
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))[0];
  const toReview = (data?.bookings ?? []).find((b) => b.status === 'completed' && !b.client_reviewed);
  const favs = (data?.mechanics ?? []).filter((x) => data?.saved.includes(x.id));

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <TopHeader title="EngiNear">
        <SearchBar value={q} onChangeText={setQ} placeholder="Search mechanics or services"
          onSubmit={() => router.push({ pathname: '/find', params: { q } })} />
      </TopHeader>
      <Pressable accessibilityRole="button" onPress={() => router.push('/address')}
        style={{ backgroundColor: '#2B323B', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name="location-outline" size={18} color={ACCENT} />
        <T v="small" color="#fff" numberOfLines={1} style={{ flex: 1 }}>Mobile service at <T v="small" bold color="#fff">{client?.address ?? 'Add your address'}</T></T>
        <T v="tiny" bold color="#fff" style={{ textDecorationLine: 'underline' }}>Change</T>
      </Pressable>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />} contentContainerStyle={{ paddingBottom: 32, gap: 12 }}>
        <View style={{ padding: 16, paddingBottom: 0, gap: 12 }}>
          <FirstPost audience="client" />
          <Card style={{ gap: 14, padding: 20 }}>
            <View>
              <T v="small" bold muted>Hi {firstName(profile?.full_name)}</T>
              <T v="h2" style={{ fontSize: 23 }}>What’s your car need?</T>
              <T v="small" muted>Pick a service and a time. We’ll show mechanics who come to you and shops nearby.</T>
            </View>
            <Button icon="construct" title="Book a mechanic" onPress={() => router.push('/quick-book')} />
            <Row gap={10}>
              <Button small kind="soft" icon="list" title="Browse" style={{ flex: 1 }} onPress={() => { setDraft(null); router.push({ pathname: '/find', params: { view: 'list' } }); }} />
              <Button small kind="soft" icon="map" title="Map" style={{ flex: 1 }} onPress={() => { setDraft(null); router.push({ pathname: '/find', params: { view: 'map' } }); }} />
            </Row>
          </Card>

          <SectionTitle title="My garage" action={data?.vehicles.length ? 'Manage' : undefined} onAction={() => router.push('/vehicles')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }} style={{ marginHorizontal: -16 }}>
            <View style={{ width: 6 }} />
            {(data?.vehicles ?? []).map((v) => (
              <Pressable key={v.id} accessibilityRole="button" accessibilityLabel={vehicleName(v)} onPress={() => router.push({ pathname: '/vehicle', params: { id: v.id } })}
                style={{ width: 190, backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.line, padding: 14, gap: 4 }}>
                <Ionicons name="car-sport" size={26} color={c.brand} />
                <T v="h3" numberOfLines={1}>{v.nickname || `${v.make} ${v.model}`}</T>
                <T v="tiny" muted numberOfLines={1}>{vehicleName(v)}</T>
                {v.mileage != null ? <T v="tiny" muted>{v.mileage.toLocaleString()} miles</T> : null}
              </Pressable>
            ))}
            <Pressable accessibilityRole="button" accessibilityLabel="Add a vehicle" onPress={() => router.push('/vehicle')}
              style={{ width: 150, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.brand, padding: 14, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Ionicons name="add-circle-outline" size={28} color={c.brand} />
              <T v="label" color={c.brand}>Add a vehicle</T>
            </Pressable>
            <View style={{ width: 6 }} />
          </ScrollView>

          {next ? (
            <>
              <SectionTitle title="Your next appointment" />
              <Card onPress={() => router.push('/bookings')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {next.mechanic ? <Avatar name={next.mechanic.full_name} url={next.mechanic.avatar_url} id={next.mechanic_id ?? ''} size={52} /> : (
                  <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: c.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={serviceIcon(next.service)} size={24} color={c.brand} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <T v="h3">{next.service}</T>
                  <T v="small" muted numberOfLines={1}>{next.vehicle_label}</T>
                  <T v="small" muted>{longDate(next.scheduled_at)} at {timeOf(next.scheduled_at)} · {next.location_type === 'shop' ? 'at the shop' : 'mobile'}</T>
                  <T v="small" muted>{next.mechanic ? `with ${firstName(next.mechanic.full_name)}` : next.status === 'open' ? 'Finding a mechanic for you' : 'Waiting for your mechanic to confirm'}</T>
                </View>
                <Ionicons name="chevron-forward" size={22} color={c.muted} />
              </Card>
            </>
          ) : null}

          {toReview ? (
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: c.star }}>
              <Ionicons name="star" size={28} color={c.star} />
              <View style={{ flex: 1 }}>
                <T v="h3">How did the repair go?</T>
                <T v="small" muted>Rate {firstName(toReview.mechanic?.full_name)} to help others</T>
              </View>
              <Button small title="Rate" onPress={() => router.push({ pathname: '/review/[id]', params: { id: toReview.id } })} />
            </Card>
          ) : null}

          <SectionTitle title="Shop by service" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 }}>
            {CATEGORIES.map((s) => (
              <Pressable key={s} accessibilityRole="button" accessibilityLabel={s} onPress={() => { setDraft(null); router.push({ pathname: '/find', params: { service: s } }); }}
                style={{ width: '25%', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={serviceIcon(s)} size={28} color={c.brand} />
                </View>
                <T v="tiny" bold center>{s}</T>
              </Pressable>
            ))}
          </View>

          <SectionTitle title="Picked for you" action="See all" onAction={() => router.push('/find')} />
          <T v="small" muted style={{ marginTop: -8 }}>Matched to your answers and location</T>
        </View>

        {picks.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
            {picks.map((x) => <MechanicTile key={x.id} c={x} onPress={() => router.push({ pathname: '/mechanic/[id]', params: { id: x.id } })} />)}
          </ScrollView>
        ) : (
          <View style={{ paddingHorizontal: 16 }}>
            <Card><T v="small" muted>{data ? 'No mechanics have joined near you yet. Post a request with Book a mechanic and mechanics will see it as soon as they join.' : 'Loading mechanics near you…'}</T></Card>
          </View>
        )}

        {favs.length ? (
          <>
            <View style={{ paddingHorizontal: 16 }}><SectionTitle title="Book again" /></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
              {favs.map((x) => <MechanicTile key={x.id} c={x} onPress={() => router.push({ pathname: '/book', params: { mechanicId: x.id } })} />)}
            </ScrollView>
          </>
        ) : null}

        <View style={{ paddingHorizontal: 16, gap: 12, marginTop: 8 }}>
          <View style={{ borderRadius: 16, backgroundColor: HEADER, borderLeftWidth: 5, borderLeftColor: ACCENT, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <T v="h3" color="#fff">You approve every dollar</T>
              <T v="small" color="#fff" style={{ opacity: 0.92 }}>Found something else wrong? Your mechanic sends a parts and labor quote in the app. Nothing is added unless you tap Approve.</T>
            </View>
            <Ionicons name="checkmark-done-circle" size={40} color={ACCENT} />
          </View>
          <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: c.okSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="shield-checkmark" size={24} color={c.ok} />
            </View>
            <View style={{ flex: 1 }}>
              <T v="h3">EngiNear Guarantee</T>
              <T v="small" muted>Something not right after a repair? Tell us within 48 hours and we’ll work with your mechanic to make it right.</T>
            </View>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}
