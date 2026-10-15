import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Avatar, TopHeader, Button, Card, Footer, Loading, Pill, Progress, Row, Screen, Stat, T } from '@/components/ui';
import { useData } from '@/hooks/useData';
import { getMechanic, getMechanicReviews, getSaved, setSaved, startConversation } from '@/lib/api';
import { defaultServicePrice, serviceIcon, warrantyLabel } from '@/lib/constants';
import { firstName, miles, priceHint, shortDate } from '@/lib/format';
import { modeLabel } from '@/components/cards';
import { friendlyError } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useColors } from '@/providers/SettingsProvider';

export default function MechanicProfileScreen() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { client, session } = useAuth();
  const { data, reload } = useData(async () => {
    const [mechanic, reviews, saved] = await Promise.all([getMechanic(id, { lat: client?.lat ?? null, lng: client?.lng ?? null }), getMechanicReviews(id), getSaved()]);
    return { mechanic, reviews, saved: saved.includes(id) };
  }, [id]);

  if (!data) return <Loading />;
  const x = data.mechanic;
  if (!x) {
    return <Screen header={<TopHeader back title="Mechanic" />}><T>This mechanic is no longer available.</T></Screen>;
  }
  const dist = [5, 4, 3, 2, 1].map((s) => [s, data.reviews.filter((r) => r.rating === s).length] as const);
  const total = data.reviews.length || 1;

  const message = async () => {
    try {
      const conv = await startConversation(x.id);
      router.push({ pathname: '/chat/[id]', params: { id: conv } });
    } catch (e) { Alert.alert('Couldn’t open chat', friendlyError(e)); }
  };

  return (
    <Screen
      header={<TopHeader back title="Mechanic" right={
        <Pressable accessibilityRole="button" accessibilityLabel={data.saved ? 'Remove from saved' : 'Save mechanic'} hitSlop={10}
          onPress={async () => { if (session) { await setSaved(session.user.id, x.id, !data.saved); reload(); } }}>
          <Ionicons name={data.saved ? 'heart' : 'heart-outline'} size={26} color="#fff" />
        </Pressable>} />}
      footer={
        <Footer>
          <View style={{ flex: 1 }}>
            <T v="price">${x.hourly_rate}<T v="small" muted>/hr labor</T></T>
            <T v="tiny" muted>${x.diag_fee} diagnostic fee</T>
          </View>
          <Button kind="soft" icon="chatbubble-outline" accessibilityLabel={`Message ${firstName(x.full_name)}`} onPress={message} />
          <Button title={`Book ${firstName(x.full_name)}`} onPress={() => router.push({ pathname: '/book', params: { mechanicId: x.id } })} />
        </Footer>
      }
    >
      <Row gap={14}>
        <Avatar name={x.full_name} url={x.avatar_url} id={x.id} size={84} />
        <View style={{ flex: 1, gap: 4 }}>
          <T v="h1" style={{ fontSize: 24 }}>{x.full_name}</T>
          {x.shop_name ? <T v="label" muted>{x.shop_name}</T> : null}
          <Row gap={6} wrap>
            {x.rating_count ? <><Ionicons name="star" size={16} color={c.star} /><T v="small" bold>{Number(x.rating).toFixed(1)}</T><T v="small" muted>({x.rating_count} reviews)</T></> : <Pill label="New on EngiNear" />}
            {x.distance_miles != null ? <T v="small" muted>· {miles(x.distance_miles)} away</T> : null}
          </Row>
          {x.verified ? <Pill tone="ok" icon="shield-checkmark" label="ID & background checked" /> : <Pill icon="id-card-outline" label="ID verified · background check in progress" />}
        </View>
      </Row>
      <Row gap={10}>
        <Stat value={String(x.jobs_completed)} label="Jobs done" />
        <Stat value={x.experience?.replace(' years', ' yr') ?? '—'} label="Experience" />
        <Stat value={x.on_time_pct != null ? `${x.on_time_pct}%` : '—'} label="On time" />
      </Row>
      <Card>
        <T v="h3">About {firstName(x.full_name)}</T>
        {x.bio ? <T>{x.bio}</T> : null}
        <Row gap={6} wrap>
          <Pill icon={x.work_mode === 'shop' ? 'business-outline' : 'car-sport-outline'} label={modeLabel(x.work_mode)} />
          {x.certifications.map((s) => <Pill key={s} tone="ok" icon="ribbon-outline" label={s} />)}
          {x.warranty_days > 0 ? <Pill tone="ok" icon="shield-checkmark-outline" label={`${warrantyLabel(x.warranty_days)} warranty`} /> : null}
          {x.sources_parts ? <Pill label="Gets the parts" /> : null}
          {x.same_day ? <Pill tone="warn" label="Same day" /> : null}
        </Row>
        {x.specialties.length ? <T v="small" muted>Works on: {x.specialties.join(', ')}</T> : null}
        {x.shop_address ? <Row gap={6}><Ionicons name="location-outline" size={16} color={c.muted} /><T v="small" muted style={{ flex: 1 }}>Shop: {x.shop_address}</T></Row> : null}
        {x.work_mode !== 'shop' ? <T v="small" muted>Travels up to {x.radius_miles} miles</T> : null}
        <T v="small" muted>Speaks {x.languages}</T>
      </Card>
      <Card>
        <T v="h3">Services & prices</T>
        {x.services.map((s) => {
          const sp = x.service_prices[s] ?? defaultServicePrice(s);
          return (
            <Row key={s} style={{ minHeight: 40, borderTopWidth: 1, borderTopColor: c.line, paddingTop: 8 }}>
              <Ionicons name={serviceIcon(s)} size={20} color={c.brand} />
              <T style={{ flex: 1 }}>{s}</T>
              <T v="small" bold>{priceHint(sp, x.hourly_rate, x.diag_fee)}</T>
            </Row>
          );
        })}
        <T v="tiny" muted>Parts and any extra work are quoted in the app. Nothing is added to your bill unless you approve it.</T>
      </Card>
      <Card>
        <T v="h3">Ratings & reviews</T>
        {data.reviews.length ? (
          <>
            {dist.map(([s, n]) => (
              <Row key={s} gap={8}>
                <T v="small" style={{ width: 52 }}>{s} star</T>
                <View style={{ flex: 1 }}><Progress value={n / total} color={c.star} /></View>
                <T v="small" muted style={{ width: 30, textAlign: 'right' }}>{n}</T>
              </Row>
            ))}
            {data.reviews.map((r) => (
              <View key={r.id} style={{ gap: 4, borderTopWidth: 1, borderTopColor: c.line, paddingTop: 10 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T v="label">{r.author}</T>
                  <Row gap={2}>{[1, 2, 3, 4, 5].map((n) => <Ionicons key={n} name="star" size={14} color={n <= r.rating ? c.star : c.line} />)}</Row>
                </Row>
                {r.tags.length ? <Row gap={6} wrap>{r.tags.map((t) => <Pill key={t} label={t} />)}</Row> : null}
                {r.body ? <T v="small">{r.body}</T> : null}
                <T v="tiny" muted>{shortDate(r.created_at)}</T>
              </View>
            ))}
          </>
        ) : <T v="small" muted>No reviews yet. Be the first to book {firstName(x.full_name)}.</T>}
      </Card>
    </Screen>
  );
}
