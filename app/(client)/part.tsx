import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, View } from 'react-native';
import { Button, Card, Notice, Pill, Row, Screen, Segmented, T, TopHeader } from '@/components/ui';
import { useData } from '@/hooks/useData';
import { myVehicles, searchParts, vehicleName, type PartListing } from '@/lib/api';
import { findPart, partQuery, STORES } from '@/lib/parts';
import { friendlyError } from '@/lib/supabase';
import { useColors } from '@/providers/SettingsProvider';
import { BAND, BRAND } from '@/theme';

const usd = (n: number) => `$${n.toFixed(2)}`;

/** One part (from the catalog, or a typed search): tips, live new/used listings, stores, or a mechanic. */
export default function PartScreen() {
  const c = useColors();
  const { id, q, vehicleId } = useLocalSearchParams<{ id?: string; q?: string; vehicleId?: string }>();
  const part = id ? findPart(id) : undefined;
  const { data: vehicles } = useData(myVehicles);
  const car = (vehicles ?? []).find((v) => v.id === vehicleId) ?? vehicles?.[0] ?? null;
  const query = part ? partQuery(part, car) : partQuery({ name: q ?? '' }, car);
  const title = part?.name ?? (q ? `“${q}”` : 'Parts');

  const [condition, setCondition] = useState<'any' | 'new' | 'used'>('any');
  const [items, setItems] = useState<PartListing[] | null>(null);
  const [configured, setConfigured] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (vehicles === null) return;
    let alive = true;
    setItems(null); setErr('');
    searchParts(part?.search ?? part?.name ?? q ?? '', condition, car ? { year: car.year, make: car.make, model: car.model } : null)
      .then((r) => { if (alive) { setConfigured(r.configured); setItems(r.items); } })
      .catch((e) => { if (alive) { setErr(friendlyError(e)); setItems([]); } });
    return () => { alive = false; };
  }, [id, q, condition, car?.id, vehicles === null]); // eslint-disable-line react-hooks/exhaustive-deps

  const openUrl = (url: string) => WebBrowser.openBrowserAsync(url).catch(() => {});
  const mechanicNotes = `Please get and install: ${part?.name ?? q}${car ? ` for my ${vehicleName(car)}` : ''}.`;

  return (
    <Screen header={<TopHeader back title={title} showActions={false} />}>
      <Row style={{ backgroundColor: BAND, borderRadius: 14, padding: 12 }}>
        <Ionicons name="car-sport" size={22} color={BRAND} />
        <T v="label" style={{ flex: 1 }}>{car ? `For your ${vehicleName(car)}` : 'Add your car to see parts that fit'}</T>
        {!car ? <Button small kind="soft" title="Add car" onPress={() => router.push('/vehicle')} /> : null}
      </Row>

      {part ? (
        <Card>
          <T v="h3">What to know before you buy</T>
          {part.tips.map((t) => (
            <Row key={t} gap={10} style={{ alignItems: 'flex-start' }}>
              <Ionicons name="checkmark-circle" size={20} color={c.ok} />
              <T v="small" style={{ flex: 1 }}>{t}</T>
            </Row>
          ))}
          <T v="tiny" muted>{car?.vin ? `Give the store your VIN (${car.vin}) to be sure it fits.` : 'Tip: add your VIN in My garage so stores can match the exact part.'}</T>
        </Card>
      ) : null}

      {/* Order through EngiNear: a mechanic gets it and installs it, billed in the app */}
      <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/quick-book', params: { service: part?.service ?? 'Diagnostics', notes: mechanicNotes, vehicleId: car?.id ?? '' } })}
        style={{ borderRadius: 18, backgroundColor: BRAND, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Ionicons name="construct" size={30} color="#fff" />
        <View style={{ flex: 1, gap: 2 }}>
          <T v="h3" color="#fff">Have a mechanic get & install it</T>
          <T v="small" color="#fff" style={{ opacity: 0.92 }}>They buy the right part and add it to a quote you approve. Pay for everything in EngiNear.</T>
        </View>
        <Ionicons name="chevron-forward" size={22} color="#fff" />
      </Pressable>

      <T v="h2">Buy it here · new and used</T>
      <Segmented value={condition} onChange={setCondition} options={[
        { value: 'any', label: 'All' }, { value: 'new', label: 'New' }, { value: 'used', label: 'Used' },
      ]} />
      {items === null ? (
        <View style={{ padding: 24, alignItems: 'center' }}><ActivityIndicator color={BRAND} /></View>
      ) : !configured ? (
        <Notice tone="brand" text="Live new and used listings are coming soon. For now, compare prices at the stores below." />
      ) : err ? (
        <Notice text={err} />
      ) : !items.length ? (
        <Notice tone="brand" text="No listings found for that. Try the stores below." />
      ) : (
        <View style={{ gap: 10 }}>
          {items.map((it) => (
            <Pressable key={it.id} accessibilityRole="button" accessibilityLabel={`${it.title}, ${it.price != null ? usd(it.price) : ''}`} onPress={() => openUrl(it.url)}
              style={({ pressed }) => ({ flexDirection: 'row', gap: 12, backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.line, padding: 12, opacity: pressed ? 0.9 : 1 })}>
              {it.image ? <Image source={{ uri: it.image }} style={{ width: 88, height: 88, borderRadius: 12, backgroundColor: BAND }} accessibilityIgnoresInvertColors />
                : <View style={{ width: 88, height: 88, borderRadius: 12, backgroundColor: BAND }} />}
              <View style={{ flex: 1, gap: 4 }}>
                <T v="small" numberOfLines={2}>{it.title}</T>
                {it.price != null ? <T v="price">{usd(it.price)}</T> : null}
                <T v="tiny" muted>{it.shipping == null ? 'See shipping' : it.shipping === 0 ? 'Free shipping' : `+ ${usd(it.shipping)} shipping`}</T>
                <Row gap={6} wrap>
                  {it.condition ? <Pill tone={/new/i.test(it.condition) ? 'brand' : 'warn'} label={it.condition} /> : null}
                  {it.fits === 'yes' ? <Pill tone="ok" icon="checkmark" label="Fits your car" /> : it.fits === 'maybe' ? <Pill label="Check fit" /> : null}
                </Row>
              </View>
            </Pressable>
          ))}
          <T v="tiny" muted center>Listings from eBay Motors. You check out on eBay; EngiNear may earn a small commission.</T>
        </View>
      )}

      <T v="h2" style={{ marginTop: 6 }}>Or shop at a store</T>
      <T v="small" muted style={{ marginTop: -6 }}>Opens a search for “{query}”.</T>
      <View style={{ gap: 8 }}>
        {STORES.map((s) => (
          <Pressable key={s.name} accessibilityRole="link" accessibilityLabel={`Shop on ${s.name}`}
            onPress={() => openUrl(s.url(query, car ? { year: car.year, make: car.make, model: car.model } : undefined))}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 14,
              backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.line, opacity: pressed ? 0.9 : 1 })}>
            <View style={{ flex: 1 }}>
              <T v="label">{s.name}</T>
              <T v="tiny" muted>{s.note}</T>
            </View>
            <Ionicons name="open-outline" size={20} color={c.muted} />
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
