import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import MapView, { Circle, Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import { Platform } from 'react-native';
import { MechanicCard } from '@/components/cards';
import { MapButtons, USA_REGION } from '@/components/MapButtons';
import { FirstPost } from '@/components/FirstPost';
import { usePlatformStats } from '@/hooks/usePlatformStats';
import { TopHeader, Chip, ChipScroll, EmptyState, LinkButton, Row, SearchBar, Segmented, T } from '@/components/ui';
import { setDraft, useDraft } from '@/hooks/draft';
import { useData } from '@/hooks/useData';
import { getSaved, searchMechanics, setSaved } from '@/lib/api';
import { dayLabel } from '@/lib/format';
import { applyFilters, FILTERS, sortMechanics, type Filter, type SortKey } from '@/lib/match';
import type { MechanicListing } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';
import { useColors } from '@/providers/SettingsProvider';
import { BRAND } from '@/theme';

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'match', label: 'Best match' }, { value: 'rating', label: 'Top rated' }, { value: 'price', label: 'Lowest price' }, { value: 'distance', label: 'Closest' },
];

export default function Find() {
  const c = useColors();
  const params = useLocalSearchParams<{ q?: string; service?: string; view?: string }>();
  const { client, session } = useAuth();
  const draft = useDraft();
  const [q, setQ] = useState(params.q ?? '');
  const [submittedQ, setSubmittedQ] = useState(params.q ?? '');
  const [service, setService] = useState<string | null>(params.service ?? null);
  const [view, setView] = useState<'list' | 'map'>(params.view === 'map' ? 'map' : 'list');
  const [filters, setFilters] = useState<Filter[]>([]);
  const [sort, setSort] = useState<SortKey>('match');
  const [selected, setSelected] = useState<MechanicListing | null>(null);
  const mapRef = useRef<MapView>(null);
  const { isEmpty } = usePlatformStats();

  useEffect(() => { if (params.q != null) { setQ(params.q); setSubmittedQ(params.q); } }, [params.q]);
  useEffect(() => { if (params.service) setService(params.service); }, [params.service]);
  useEffect(() => { if (params.view === 'map' || params.view === 'list') setView(params.view); }, [params.view]);

  const effectiveService = draft?.service ?? service;
  const { data, refreshing, refresh } = useData(async () => {
    const [list, saved] = await Promise.all([
      searchMechanics({ lat: client?.lat ?? null, lng: client?.lng ?? null, service: effectiveService, query: submittedQ, radius: view === 'map' ? 5000 : 30 }),
      getSaved(),
    ]);
    return { list, saved };
  }, [effectiveService, submittedQ, client?.lat, view]);

  // A booking request for "come to me" hides shop-only mechanics, and "take it to a shop" hides mobile-only ones.
  const place = draft?.place ?? 'either';
  const list = useMemo(() => sortMechanics(applyFilters((data?.list ?? []).filter((x) =>
    place === 'either' || (place === 'mobile' ? x.work_mode !== 'shop' : x.work_mode !== 'mobile')), filters), sort, client),
  [data, filters, sort, client, place]);
  const saved = data?.saved ?? [];
  const toggleSave = async (id: string) => {
    if (!session) return;
    const on = !saved.includes(id);
    await setSaved(session.user.id, id, on);
    refresh();
  };
  const open = (id: string) => router.push({ pathname: '/mechanic/[id]', params: { id } });

  const center = client?.lat != null && client?.lng != null ? { latitude: client.lat, longitude: client.lng }
    : list.find((x) => x.lat != null) ? { latitude: list.find((x) => x.lat != null)!.lat!, longitude: list.find((x) => x.lat != null)!.lng! }
    : { latitude: 39.5, longitude: -98.35 };
  const region = client?.lat != null ? { ...center, latitudeDelta: 0.18, longitudeDelta: 0.18 } : USA_REGION;

  // The map needs the room, so its header is just the List/Map switch and filters.
  const isMap = view === 'map';
  const header = (
    <View style={{ gap: 10, paddingTop: isMap ? 8 : 12, paddingBottom: isMap ? 8 : 0 }}>
      {!isMap ? <View style={{ paddingHorizontal: 16 }}><FirstPost audience="client" /></View> : null}
      {draft ? (
        <View style={{ marginHorizontal: 16, backgroundColor: c.brandSoft, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name="calendar" size={20} color={c.brandInk} />
          <T v="small" bold color={c.brandInk} style={{ flex: 1 }}>{draft.service} · {dayLabel(new Date(Date.now() + draft.day * 864e5))} · {draft.time}{draft.place === 'mobile' ? ' · comes to you' : draft.place === 'shop' ? ' · at a shop' : ''}</T>
          <LinkButton title="Change" onPress={() => router.push('/quick-book')} />
          <Pressable accessibilityLabel="Clear request" onPress={() => setDraft(null)} hitSlop={8}><Ionicons name="close" size={22} color={c.brandInk} /></Pressable>
        </View>
      ) : null}
      {draft && draft.place !== 'shop' && !isMap ? (
        <Pressable accessibilityRole="button" onPress={() => router.push('/book')}
          style={{ marginHorizontal: 16, backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.line, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Ionicons name="people-outline" size={26} color={c.brand} />
          <View style={{ flex: 1 }}>
            <T v="label">Any available mobile mechanic</T>
            <T v="small" muted>Trusted mechanics nearby see your request. The first to accept diagnoses it ($49) and sends you a quote.</T>
          </View>
          <Ionicons name="chevron-forward" size={20} color={c.muted} />
        </Pressable>
      ) : null}
      <View style={{ paddingHorizontal: 16 }}>
        <Segmented value={view} onChange={setView} options={[{ value: 'list', label: 'List', icon: 'list' }, { value: 'map', label: 'Map', icon: 'map' }]} />
      </View>
      <ChipScroll>
        {service && !draft ? <Chip label={`${service}  ✕`} on onPress={() => setService(null)} /> : null}
        {FILTERS.map((f) => (
          <Chip key={f} label={f} on={filters.includes(f)} onPress={() => setFilters(filters.includes(f) ? filters.filter((x) => x !== f) : [...filters, f])} />
        ))}
      </ChipScroll>
      {view === 'list' ? (
        <View style={{ paddingHorizontal: 16, gap: 8 }}>
          <ChipScrollInline>{SORTS.map((s) => <Chip key={s.value} icon={sort === s.value ? 'checkmark' : undefined} label={s.label} on={sort === s.value} onPress={() => setSort(s.value)} />)}</ChipScrollInline>
          <T v="small" bold>{list.length} mechanic{list.length === 1 ? '' : 's'}{submittedQ ? ` for “${submittedQ}”` : ''}</T>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <TopHeader title="Find a mechanic">
        <SearchBar value={q} onChangeText={(t) => { setQ(t); if (!t) setSubmittedQ(''); }} onSubmit={() => setSubmittedQ(q.trim())} placeholder="Name, shop, service or car make" />
      </TopHeader>
      {view === 'list' ? (
        <FlatList
          data={list}
          keyExtractor={(x) => x.id}
          ListHeaderComponent={header}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          contentContainerStyle={{ gap: 12, paddingBottom: 32 }}
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: 16 }}>
              <MechanicCard c={item} saved={saved.includes(item.id)} onToggleSave={() => toggleSave(item.id)} onPress={() => open(item.id)} />
            </View>
          )}
          ListEmptyComponent={data && !isEmpty ? (
            <EmptyState icon="search" title={filters.length || submittedQ ? 'No mechanics match' : 'No mechanics have joined yet'}
              text={filters.length || submittedQ ? 'Try removing a filter or searching something else.' : 'Post your request and mechanics will see it as soon as they join.'}
              action="Post a repair request" onAction={() => router.push('/quick-book')} />
          ) : null}
        />
      ) : (
        <View style={{ flex: 1 }}>
          {header}
          <View style={{ flex: 1 }}>
            <MapView
              ref={mapRef}
              style={{ flex: 1 }}
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
              initialRegion={region}
              showsUserLocation
              showsMyLocationButton
              scrollEnabled
              zoomEnabled
              rotateEnabled={false}
              onPress={() => setSelected(null)}
            >
              {client?.lat != null && client?.lng != null ? (
                <Circle center={{ latitude: client.lat, longitude: client.lng }} radius={8000} strokeColor={BRAND} fillColor="rgba(235,105,43,0.07)" />
              ) : null}
              {list.filter((x) => x.lat != null && x.lng != null).map((x) => (
                <Marker key={x.id} coordinate={{ latitude: x.lat!, longitude: x.lng! }} onPress={(e) => { e.stopPropagation(); setSelected(x); }}
                  accessibilityLabel={`${x.shop_name ?? x.full_name}, ${x.work_mode === 'shop' ? 'shop' : 'mobile'}, $${x.hourly_rate} per hour labor`} tracksViewChanges={false}>
                  <View style={{ backgroundColor: selected?.id === x.id ? BRAND : '#fff', borderColor: BRAND, borderWidth: 2, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name={x.work_mode === 'mobile' ? 'car-sport' : 'business'} size={13} color={selected?.id === x.id ? '#fff' : BRAND} />
                    <T v="small" bold color={selected?.id === x.id ? '#fff' : '#16191D'}>${x.hourly_rate}</T>
                  </View>
                </Marker>
              ))}
            </MapView>
            <MapButtons onUSA={() => mapRef.current?.animateToRegion(USA_REGION, 600)}
              onMe={client?.lat != null ? () => mapRef.current?.animateToRegion(region, 600) : undefined} />
            <View style={{ position: 'absolute', left: 12, right: 12, bottom: 12 }}>
              {selected ? (
                <MechanicCard c={selected} saved={saved.includes(selected.id)} onToggleSave={() => toggleSave(selected.id)} onPress={() => open(selected.id)} />
              ) : (
                <View style={{ backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.line, padding: 12 }}>
                  <Row gap={8}><Ionicons name="hand-left-outline" size={18} color={c.brand} /><T v="small" style={{ flex: 1 }}><T v="small" bold>{list.length} mechanic{list.length === 1 ? '' : 's'}</T> on the map (labor rate per hour). Drag anywhere in the USA, pinch to zoom, then tap one.</T></Row>
                </View>
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function ChipScrollInline({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>;
}
