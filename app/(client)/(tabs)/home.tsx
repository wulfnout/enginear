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
import { BAND, BRAND, HEADER } from '@/theme';

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
        <SearchBar value={q} onChangeText={setQ} placeholder="Search EngiNear"
          onSubmit={() => router.push({ pathname: '/find', params: { q } })}
          right={
            <Pressable accessibilityRole="button" accessibilityLabel="My garage" onPress={() => router.push('/vehicles')} hitSlop={8}>
              <Ionicons name="car-sport-outline" size={26} color="#1F2328" />
            </Pressable>
          } />
        {/* "Pickup or delivery?" style row: where the car is */}
        <Pressable accessibilityRole="button" onPress={() => router.push('/address')} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40 }}>
          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="location" size={18} color={BRAND} />
          </View>
          <T v="small" color="#fff" style={{ fontSize: 16 }}>Come to me or shop?</T>
          <T v="small" bold color="#fff" numberOfLines={1} style={{ flex: 1, textAlign: 'right', fontSize: 16 }}>{client?.address ?? 'Add your address'}</T>
          <Ionicons name="chevron-down" size={22} color="#fff" />
        </Pressable>
      </TopHeader>
      {/* Gray strip of quick links, like store departments */}
      <View style={{ backgroundColor: BAND, paddingVertical: 10 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
          {([
            ['grid-outline', 'All services', () => { setDraft(null); router.push({ pathname: '/find', params: { view: 'list' } }); }],
            ['map-outline', 'Map', () => { setDraft(null); router.push({ pathname: '/find', params: { view: 'map' } }); }],
            ['car-sport-outline', 'Comes to me', () => { setDraft(null); router.push({ pathname: '/find', params: { view: 'list' } }); }],
            ['business-outline', 'Shops', () => { setDraft(null); router.push({ pathname: '/find', params: { view: 'map' } }); }],
            ['car-outline', 'My garage', () => router.push('/vehicles')],
          ] as const).map(([icon, label, go], i) => (
            <Pressable key={label} accessibilityRole="button" onPress={go}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 18, minHeight: 44 }}>
              <Ionicons name={icon} size={20} color="#1F2328" />
              <T v="label" style={{ fontWeight: i === 0 ? '800' : '600' }}>{label}</T>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />} contentContainerStyle={{ paddingBottom: 32, gap: 12 }}>
        <View style={{ padding: 16, paddingBottom: 0, gap: 12 }}>
          <FirstPost audience="client" />
          <Pressable accessibilityRole="button" accessibilityLabel="Book a mechanic" onPress={() => router.push('/quick-book')}
            style={{ borderRadius: 18, backgroundColor: HEADER, padding: 22, minHeight: 190, overflow: 'hidden', justifyContent: 'space-between' }}>
            <View style={{ position: 'absolute', right: -30, bottom: -30, opacity: 0.18 }}>
              <Ionicons name="construct" size={190} color="#fff" />
            </View>
            <View style={{ gap: 4 }}>
              <T v="label" color="#fff">Hi {firstName(profile?.full_name)}</T>
              <T v="h1" color="#fff" style={{ fontSize: 30, lineHeight: 36 }}>What’s your{'\n'}car need?</T>
            </View>
            <View style={{ gap: 12 }}>
              <T color="#fff" style={{ opacity: 0.9 }}>Mechanics who come to you, and shops nearby.</T>
              <View style={{ alignSelf: 'flex-start', backgroundColor: BRAND, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 11 }}>
                <T v="label" color="#fff">Book a mechanic</T>
              </View>
            </View>
          </Pressable>

          <SectionTitle title="My garage" action={data?.vehicles.length ? 'View all' : undefined} onAction={() => router.push('/vehicles')} />
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

          <SectionTitle title="Top picks for you" action="View all" onAction={() => router.push('/find')} />
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
          <View style={{ borderRadius: 18, backgroundColor: BAND, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <T v="h2">You approve every dollar</T>
              <T v="small" muted>Found something else wrong? Your mechanic sends a parts and labor quote in the app. Nothing is added unless you tap Approve.</T>
            </View>
            <Ionicons name="checkmark-done-circle" size={44} color={BRAND} />
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
