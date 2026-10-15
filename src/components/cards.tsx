import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { ARRIVAL_TIMES } from '@/lib/constants';
import { addDays, dayLabel, miles, money0, startOfDay, timeOf } from '@/lib/format';
import type { MechanicListing, JobFeedRow } from '@/lib/types';
import { useColors } from '@/providers/SettingsProvider';
import { radius } from '@/theme';
import { Avatar, Card, Pill, Row, Stars, T } from './ui';

/** "Mobile", "Shop" or "Mobile + shop" */
export const modeLabel = (m: MechanicListing['work_mode']) => (m === 'both' ? 'Mobile + shop' : m === 'shop' ? 'Shop' : 'Mobile');
const modeIcon = (m: MechanicListing['work_mode']): 'business-outline' | 'car-sport-outline' => (m === 'shop' ? 'business-outline' : 'car-sport-outline');

export function MechanicCard({ c, saved, onToggleSave, onPress }: {
  c: MechanicListing; saved?: boolean; onToggleSave?: () => void; onPress: () => void;
}) {
  const col = useColors();
  return (
    <Card onPress={onPress} accessibilityLabel={`${c.full_name}${c.shop_name ? `, ${c.shop_name}` : ''}, ${c.rating_count ? `${c.rating} stars` : 'new mechanic'}, $${c.hourly_rate} per hour labor`} style={{ flexDirection: 'row', gap: 12 }}>
      <Avatar name={c.full_name} url={c.avatar_url} id={c.id} size={62} />
      <View style={{ flex: 1, gap: 5 }}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <T v="h3" numberOfLines={1}>{c.full_name}</T>
            {c.shop_name ? <T v="small" muted numberOfLines={1}>{c.shop_name}</T> : null}
          </View>
          {onToggleSave ? (
            <Pressable accessibilityRole="button" accessibilityLabel={saved ? 'Remove from saved' : 'Save mechanic'} hitSlop={10} onPress={onToggleSave}>
              <Ionicons name={saved ? 'heart' : 'heart-outline'} size={24} color={saved ? col.bad : col.muted} />
            </Pressable>
          ) : null}
        </Row>
        <Row gap={6} wrap>
          <Stars rating={c.rating} count={c.rating_count} />
          {c.distance_miles != null ? <T v="small" muted>· {miles(c.distance_miles)} away</T> : null}
        </Row>
        <Row gap={6} wrap>
          {c.verified ? <Pill tone="ok" icon="shield-checkmark" label="Background checked" /> : <Pill label="ID verified" icon="id-card-outline" />}
          <Pill icon={modeIcon(c.work_mode)} label={modeLabel(c.work_mode)} />
          {c.certifications.some((x) => x.startsWith('ASE')) ? <Pill tone="brand" icon="ribbon-outline" label="ASE" /> : null}
          {c.warranty_days > 0 ? <Pill tone="ok" label="Warranty" /> : null}
          {c.same_day ? <Pill tone="warn" label="Same day" /> : null}
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="price">${c.hourly_rate}<T v="small" muted>/hr labor</T></T>
          <T v="label" color={col.brand}>View & book ›</T>
        </Row>
      </View>
    </Card>
  );
}

export function MechanicTile({ c, onPress }: { c: MechanicListing; onPress: () => void }) {
  const col = useColors();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={c.full_name} onPress={onPress}
      style={{ width: 172, backgroundColor: col.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: col.line, padding: 14, gap: 6 }}>
      <Avatar name={c.full_name} url={c.avatar_url} id={c.id} size={58} />
      <T v="h3" numberOfLines={1}>{c.full_name}</T>
      {c.shop_name ? <T v="tiny" muted numberOfLines={1}>{c.shop_name}</T> : null}
      <Stars rating={c.rating} count={c.rating_count} />
      {c.distance_miles != null ? <T v="small" muted>{miles(c.distance_miles)} away</T> : null}
      <T v="price">${c.hourly_rate}<T v="small" muted>/hr labor</T></T>
      <Pill icon={modeIcon(c.work_mode)} label={modeLabel(c.work_mode)} />
    </Pressable>
  );
}

export function JobCard({ row, onPress }: { row: JobFeedRow; onPress: () => void }) {
  const col = useColors();
  const b = row.booking;
  const today = dayLabel(b.scheduled_at) === 'Today';
  return (
    <Card onPress={onPress} accessibilityLabel={`${b.service} on a ${b.vehicle_label}, earn ${money0(b.mechanic_payout_cents)}${b.pricing === 'flat' ? '' : ' to start'}`}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="h3">{b.service}</T>
        <T v="price">{b.pricing === 'flat' ? '' : 'from '}{money0(b.mechanic_payout_cents)}</T>
      </Row>
      <T v="small" muted>
        <T v="small" bold color={today ? col.warn : col.muted}>{dayLabel(b.scheduled_at)}</T> · {timeOf(b.scheduled_at)} · {b.vehicle_label}
      </T>
      {b.notes ? <T v="small" numberOfLines={2}>“{b.notes}”</T> : null}
      <Row gap={6} wrap>
        {b.status === 'requested' ? <Pill tone="warn" icon="person" label="Requested you" /> : null}
        <Pill icon="location-outline" label={`${b.area?.trim() || 'Nearby'}${row.distance_miles != null ? ` · ${miles(row.distance_miles)}` : ''}`} />
        <Pill icon={b.location_type === 'shop' ? 'business-outline' : 'car-sport-outline'} label={b.location_type === 'shop' ? 'At your shop' : 'Mobile'} />
        {b.pricing === 'quote' ? <Pill tone="brand" label="Diagnose + quote" /> : b.pricing === 'hourly' ? <Pill label={`${b.hours} hr + parts`} /> : <Pill label="Flat price" />}
        {row.client_rating > 0 ? <Pill icon="star" label={`Client ${Number(row.client_rating).toFixed(1)}`} /> : null}
      </Row>
    </Card>
  );
}

export function DayPicker({ value, onChange, days = 14, startOffset = 0 }: { value: number | null; onChange: (n: number) => void; days?: number; startOffset?: number }) {
  const col = useColors();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {Array.from({ length: days }, (_, i) => i + startOffset).map((n) => {
        const d = addDays(n);
        const on = value === n;
        return (
          <Pressable key={n} accessibilityRole="button" accessibilityState={{ selected: on }}
            accessibilityLabel={d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            onPress={() => onChange(n)}
            style={{ width: 66, height: 76, borderRadius: 12, borderWidth: 1.5, borderColor: on ? col.brand : col.line,
              backgroundColor: on ? col.brand : col.surface, alignItems: 'center', justifyContent: 'center' }}>
            <T v="tiny" bold color={on ? '#fff' : col.muted}>{n === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' })}</T>
            <T v="h2" color={on ? '#fff' : col.text}>{d.getDate()}</T>
            <T v="tiny" color={on ? '#fff' : col.muted}>{d.toLocaleDateString('en-US', { month: 'short' })}</T>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function TimePicker({ value, onChange, day }: { value: string | null; onChange: (t: string) => void; day: number | null }) {
  const col = useColors();
  const now = new Date();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {ARRIVAL_TIMES.map((t) => {
        const on = value === t;
        let past = false;
        if (day === 0) {
          const m = t.match(/(\d+):\d+\s*(AM|PM)/)!;
          const h = (Number(m[1]) % 12) + (m[2] === 'PM' ? 12 : 0);
          const slot = startOfDay();
          slot.setHours(h);
          past = slot.getTime() < now.getTime() + 2 * 36e5;
        }
        return (
          <Pressable key={t} disabled={past} accessibilityRole="button" accessibilityState={{ selected: on, disabled: past }} onPress={() => onChange(t)}
            style={{ width: '31.5%', minHeight: 48, borderRadius: 12, borderWidth: 1.5, borderColor: on ? col.brand : col.line,
              backgroundColor: on ? col.brandSoft : col.surface, alignItems: 'center', justifyContent: 'center', opacity: past ? 0.35 : 1 }}>
            <T v="label" color={on ? col.brandInk : col.text}>{t}</T>
          </Pressable>
        );
      })}
    </View>
  );
}
