import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { FlatList, Platform, RefreshControl, View } from 'react-native';
import MapView, { Circle, Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import { JobCard } from '@/components/cards';
import { MapButtons, USA_REGION } from '@/components/MapButtons';
import { FirstPost } from '@/components/FirstPost';
import { TopHeader, Chip, ChipScroll, EmptyState, Notice, Row, SearchBar, Segmented, T } from '@/components/ui';
import { useData } from '@/hooks/useData';
import { jobFeed } from '@/lib/api';
import { dayLabel, money0 } from '@/lib/format';
import type { JobFeedRow } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';
import { useColors } from '@/providers/SettingsProvider';
import { BRAND } from '@/theme';

const FILTERS = ['Today', 'Requested me', 'Under 5 mi', 'Flat price', 'Diagnose + quote', 'At my shop'] as const;

export default function Jobs() {
  const c = useColors();
  const { mechanic } = useAuth();
  const [q, setQ] = useState('');
  const [view, setView] = useState<'list' | 'map'>('list');
  const [filters, setFilters] = useState<string[]>([]);
  const [selected, setSelected] = useState<JobFeedRow | null>(null);
  const mapRef = useRef<MapView>(null);
  const { data, refreshing, refresh } = useData(() => jobFeed(), [], ['bookings']);

  const list = useMemo(() => (data ?? []).filter((r) => {
    const b = r.booking;
    if (q && !`${b.service} ${b.area ?? ''} ${b.vehicle_label}`.toLowerCase().includes(q.toLowerCase())) return false;
    return filters.every((f) => (f === 'Today' ? dayLabel(b.scheduled_at) === 'Today'
      : f === 'Under 5 mi' ? (r.distance_miles ?? 99) < 5
      : f === 'Requested me' ? b.status === 'requested'
      : f === 'Flat price' ? b.pricing === 'flat'
      : f === 'Diagnose + quote' ? b.pricing === 'quote'
      : f === 'At my shop' ? b.location_type === 'shop' : true));
  }), [data, q, filters]);

  const open = (id: string) => router.push({ pathname: '/job/[id]', params: { id } });
  const center = mechanic?.lat != null && mechanic?.lng != null ? { latitude: mechanic.lat, longitude: mechanic.lng } : { latitude: 39.5, longitude: -98.35 };
  const zoom = Math.max(0.1, (mechanic?.radius_miles ?? 10) / 25);
  const homeRegion = mechanic?.lat != null ? { ...center, latitudeDelta: zoom, longitudeDelta: zoom } : USA_REGION;

  const header = (
    <View style={{ gap: 10, paddingTop: view === 'map' ? 8 : 12, paddingBottom: view === 'map' ? 8 : 0 }}>
      {mechanic && !mechanic.onboarding_complete && view === 'list' ? <View style={{ paddingHorizontal: 16, gap: 10 }}><FirstPost audience="mechanic" /><Notice text="Finish your setup in Me › Work preferences to accept jobs." /></View> : null}
      <View style={{ paddingHorizontal: 16 }}>
        <Segmented value={view} onChange={(v) => { setView(v); setSelected(null); }} options={[{ value: 'list', label: 'List', icon: 'list' }, { value: 'map', label: 'Map', icon: 'map' }]} />
      </View>
      <ChipScroll>{FILTERS.map((f) => <Chip key={f} label={f} on={filters.includes(f)} onPress={() => setFilters(filters.includes(f) ? filters.filter((x) => x !== f) : [...filters, f])} />)}</ChipScroll>
      {view === 'list' ? <T v="small" bold style={{ paddingHorizontal: 16 }}>{list.length} job{list.length === 1 ? '' : 's'} near you</T> : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <TopHeader title="Find jobs">
        <SearchBar value={q} onChangeText={setQ} placeholder="Search by service, car or area" />
      </TopHeader>
      {view === 'list' ? (
        <FlatList
          data={list}
          keyExtractor={(r) => r.booking.id}
          ListHeaderComponent={header}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          contentContainerStyle={{ gap: 12, paddingBottom: 32 }}
          renderItem={({ item }) => <View style={{ paddingHorizontal: 16 }}><JobCard row={item} onPress={() => open(item.booking.id)} /></View>}
          ListEmptyComponent={data ? (
            <EmptyState icon="briefcase-outline" title={filters.length || q ? 'No jobs match right now' : 'No repair requests yet'}
              text={filters.length || q ? 'Try clearing a filter or search.' : mechanic?.is_online ? 'Your profile is posted, so clients can find and book you directly. We’ll alert you the moment a request is posted near you.' : 'Go online on the Earnings tab to get alerts for new requests.'} />
          ) : null}
        />
      ) : (
        <View style={{ flex: 1 }}>
          {header}
          <View style={{ flex: 1 }}>
            <MapView ref={mapRef} style={{ flex: 1 }} provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
              initialRegion={homeRegion} showsUserLocation scrollEnabled zoomEnabled rotateEnabled={false}
              onPress={() => setSelected(null)}>
              {mechanic?.lat != null && mechanic?.lng != null ? (
                <Circle center={center} radius={(mechanic.radius_miles ?? 10) * 1609} strokeColor={BRAND} fillColor="rgba(194,65,12,0.07)" />
              ) : null}
              {list.filter((r) => r.booking.lat != null).map((r) => (
                <Marker key={r.booking.id} coordinate={{ latitude: r.booking.lat!, longitude: r.booking.lng! }} tracksViewChanges={false}
                  onPress={(e) => { e.stopPropagation(); setSelected(r); }} accessibilityLabel={`${r.booking.service}, ${money0(r.booking.mechanic_payout_cents)}`}>
                  <View style={{ backgroundColor: selected?.booking.id === r.booking.id ? BRAND : '#fff', borderColor: BRAND, borderWidth: 2, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
                    <T v="small" bold color={selected?.booking.id === r.booking.id ? '#fff' : '#0E1A2C'}>{money0(r.booking.mechanic_payout_cents)}</T>
                  </View>
                </Marker>
              ))}
            </MapView>
            <MapButtons onUSA={() => mapRef.current?.animateToRegion(USA_REGION, 600)}
              onMe={mechanic?.lat != null ? () => mapRef.current?.animateToRegion(homeRegion, 600) : undefined} />
            <View style={{ position: 'absolute', left: 12, right: 12, bottom: 12 }}>
              {selected ? <JobCard row={selected} onPress={() => open(selected.booking.id)} /> : (
                <View style={{ backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.line, padding: 12 }}>
                  <Row gap={8}><Ionicons name="hand-left-outline" size={18} color={c.brand} /><T v="small" style={{ flex: 1 }}><T v="small" bold>{list.length} jobs</T> in your area. Drag and pinch the map, then tap a pin.</T></Row>
                </View>
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
