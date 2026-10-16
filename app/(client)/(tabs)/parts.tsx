import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Chip, SearchBar, T, TopHeader } from '@/components/ui';
import { useData } from '@/hooks/useData';
import { myVehicles, vehicleName } from '@/lib/api';
import { PART_GROUPS } from '@/lib/parts';
import { useColors } from '@/providers/SettingsProvider';
import { BAND, BRAND, HEADER } from '@/theme';

/** Parts market: pick a car, browse the catalog or search, then buy in the app, at a store, or through a mechanic. */
export default function Parts() {
  const c = useColors();
  const { data: vehicles, refreshing, refresh } = useData(myVehicles);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [group, setGroup] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const car = (vehicles ?? []).find((v) => v.id === vehicleId) ?? vehicles?.[0] ?? null;
  const groups = group ? PART_GROUPS.filter((g) => g.name === group) : PART_GROUPS;

  const open = (params: { id?: string; q?: string }) =>
    router.push({ pathname: '/part', params: { ...params, vehicleId: car?.id ?? '' } });

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <TopHeader title="Parts">
        <SearchBar value={q} onChangeText={setQ} placeholder="Search new and used parts"
          onSubmit={() => { if (q.trim().length > 1) open({ q: q.trim() }); }} />
      </TopHeader>

      {/* Which car we're shopping for */}
      <View style={{ backgroundColor: BAND, paddingVertical: 10, gap: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
          {(vehicles ?? []).map((v) => {
            const on = car?.id === v.id;
            return (
              <Pressable key={v.id} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setVehicleId(v.id)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 16, minHeight: 44,
                  borderWidth: on ? 2 : 0, borderColor: BRAND }}>
                <Ionicons name="car-sport" size={20} color={on ? BRAND : '#1F2328'} />
                <T v="label" style={{ fontWeight: on ? '800' : '600' }}>{v.nickname || vehicleName(v)}</T>
              </Pressable>
            );
          })}
          <Pressable accessibilityRole="button" onPress={() => router.push('/vehicle')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 16, minHeight: 44 }}>
            <Ionicons name="add" size={20} color="#1F2328" />
            <T v="label">{vehicles?.length ? 'Add a car' : 'Add your car for exact fit'}</T>
          </Pressable>
        </ScrollView>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />} contentContainerStyle={{ paddingBottom: 32, gap: 14 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingTop: 14 }}>
          <Chip label="All parts" on={!group} onPress={() => setGroup(null)} />
          {PART_GROUPS.map((g) => <Chip key={g.name} icon={g.icon} label={g.name} on={group === g.name} onPress={() => setGroup(g.name)} />)}
        </ScrollView>

        <View style={{ paddingHorizontal: 16, gap: 18 }}>
          <View style={{ borderRadius: 18, backgroundColor: HEADER, padding: 20, gap: 8 }}>
            <T v="h2" color="#fff">{car ? `Parts for your ${car.make} ${car.model}` : 'Find the right part'}</T>
            <T v="small" color="#fff" style={{ opacity: 0.9 }}>
              See what to get, compare new and used, then buy it here, at the store you like, or have a mechanic get it and install it.
            </T>
          </View>

          {groups.map((g) => (
            <View key={g.name} style={{ gap: 10 }}>
              <T v="h2">{g.name}</T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {g.parts.map((p) => (
                  <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={p.name} onPress={() => open({ id: p.id })}
                    style={({ pressed }) => ({ width: '48.3%', backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.line,
                      padding: 14, gap: 8, minHeight: 104, opacity: pressed ? 0.9 : 1 })}>
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name={p.icon} size={22} color={BRAND} />
                    </View>
                    <T v="label">{p.name}</T>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}

          <Pressable accessibilityRole="button" onPress={() => router.push('/quick-book')}
            style={{ borderRadius: 18, backgroundColor: BAND, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Ionicons name="pulse-outline" size={34} color={BRAND} />
            <View style={{ flex: 1, gap: 2 }}>
              <T v="h3">Not sure what you need?</T>
              <T v="small" muted>Book a diagnosis. Your mechanic tells you exactly which parts to get.</T>
            </View>
            <Ionicons name="chevron-forward" size={22} color={c.muted} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
