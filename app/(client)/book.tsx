import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';
import { DayPicker, TimePicker } from '@/components/cards';
import { Avatar, Button, Card, Chip, Field, Footer, KV, Loading, Notice, OptionCard, Row, Screen, Segmented, Stars, T, TopHeader } from '@/components/ui';
import { setDraft, useDraft } from '@/hooks/draft';
import { usePaymentCard } from '@/hooks/usePaymentCard';
import { useData } from '@/hooks/useData';
import { createBooking, getMechanic, myBookings, myVehicles, vehicleName } from '@/lib/api';
import { BOOKABLE_SERVICES, defaultServicePrice, OPEN_REQUEST_DIAG_CENTS, PROMO_CODE, SERVICES } from '@/lib/constants';
import { addDays, atTime, dayLabel, estimate, firstName, money } from '@/lib/format';
import { friendlyError } from '@/lib/supabase';
import type { ServicePrice, WorkPlace } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';
import { useColors } from '@/providers/SettingsProvider';

const OPEN_REQUEST: ServicePrice = { pricing: 'quote', hours: 1 };

export default function Book() {
  const c = useColors();
  const { mechanicId } = useLocalSearchParams<{ mechanicId?: string }>();
  const { client } = useAuth();
  const draft = useDraft();
  const { addCard, busy: cardBusy } = usePaymentCard();
  const { data } = useData(async () => {
    const [mechanic, bookings, vehicles] = await Promise.all([
      mechanicId ? getMechanic(mechanicId, { lat: client?.lat ?? null, lng: client?.lng ?? null }) : Promise.resolve(null),
      myBookings(),
      myVehicles(),
    ]);
    return { mechanic, vehicles, firstBooking: !bookings.some((b) => b.status !== 'cancelled') };
  }, [mechanicId]);

  const [service, setService] = useState<string | null>(draft?.service ?? null);
  const [vehicleId, setVehicleId] = useState<string | null>(draft?.vehicleId ?? null);
  const [placeChoice, setPlace] = useState<WorkPlace | null>(draft?.place && draft.place !== 'either' ? draft.place : null);
  const [hours, setHours] = useState<number | null>(null);
  const [day, setDay] = useState<number | null>(draft?.day ?? null);
  const [time, setTime] = useState<string | null>(draft?.time ?? null);
  const [notes, setNotes] = useState(draft?.notes ?? '');
  const [promo, setPromo] = useState('');
  const [promoOn, setPromoOn] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!data) return <Loading />;
  const m = data.mechanic;
  const services = m?.services.length ? m.services : BOOKABLE_SERVICES.map((s) => s.name);
  const svc = service && services.includes(service) ? service : services[0];
  const car = vehicleId && data.vehicles.some((v) => v.id === vehicleId) ? vehicleId : data.vehicles[0]?.id ?? null;

  // Where: mechanics who do both let the client choose; others decide it.
  const modes: WorkPlace[] = !m ? ['mobile'] : m.work_mode === 'both' ? ['mobile', 'shop'] : [m.work_mode];
  const place: WorkPlace = placeChoice && modes.includes(placeChoice) ? placeChoice : modes[0];

  const sp: ServicePrice = m ? (m.service_prices[svc] ?? defaultServicePrice(svc)) : OPEN_REQUEST;
  const usualHours = sp.hours ?? SERVICES.find((s) => s.name === svc)?.hours ?? 1;
  const hrs = sp.pricing === 'hourly' ? Math.max(1, Math.round(hours ?? usualHours)) : usualHours;
  const rate = m?.hourly_rate ?? 0;
  const diag = m ? m.diag_fee : OPEN_REQUEST_DIAG_CENTS / 100;
  const est = estimate(sp, rate, diag, hrs, promoOn);

  const hasCard = !!client?.payment_method_id;
  const needsAddress = place === 'mobile' && !client?.address;
  const ready = day != null && !!time && hasCard && !!car && !needsAddress;

  const applyPromo = () => {
    if (promo.trim().toUpperCase() !== PROMO_CODE) return Alert.alert('Code not valid', 'Check the spelling and try again.');
    if (!data.firstBooking) return Alert.alert('First booking only', `${PROMO_CODE} is for your first booking.`);
    setPromoOn(true);
  };

  const confirm = async () => {
    setBusy(true);
    try {
      const b = await createBooking({
        mechanicId: m?.id ?? null, service: svc, vehicleId: car!, place, hours: hrs, when: atTime(addDays(day!), time!),
        notes: notes.trim() || undefined, promo: promoOn ? PROMO_CODE : undefined,
      });
      setDraft(null);
      router.replace({ pathname: '/booked', params: { id: b.id } });
    } catch (e) {
      Alert.alert('Booking not made', friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const howPriced = sp.pricing === 'flat'
    ? `Flat price. ${m ? firstName(m.full_name) : 'Your mechanic'} quotes any extra parts or repairs in the app first.`
    : sp.pricing === 'hourly'
      ? `$${rate}/hr labor for the hours you book. Parts are quoted in the app and only added if you approve them.`
      : `You pay the $${diag} diagnostic fee to start. After diagnosis you get a parts and labor quote in the app. Approve it and the work goes ahead; decline it and you only pay the diagnosis.`;

  return (
    <Screen
      header={<TopHeader back title={m ? `Book ${firstName(m.full_name)}` : 'Request any mechanic'} showActions={false} />}
      footer={
        <Footer>
          <View style={{ flex: 1 }}>
            <T v="price">{money(est.total)}{est.more ? <T v="small" muted> to start</T> : null}</T>
            <T v="tiny" muted>{day != null ? dayLabel(addDays(day)) : 'Pick a day'}{time ? ` · ${time}` : ''}</T>
          </View>
          <Button title={!hasCard ? 'Add a card first' : 'Confirm booking'} onPress={hasCard ? confirm : addCard} loading={busy || cardBusy}
            disabled={hasCard ? !ready : false} />
        </Footer>
      }
    >
      {m ? (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name={m.full_name} url={m.avatar_url} id={m.id} size={50} />
          <View style={{ flex: 1 }}>
            <T v="h3">{m.full_name}</T>
            {m.shop_name ? <T v="small" muted>{m.shop_name}</T> : null}
            <Stars rating={m.rating} count={m.rating_count} />
          </View>
        </Card>
      ) : (
        <Notice tone="brand" text={`We’ll alert trusted mobile mechanics near you. Whoever accepts diagnoses the problem for $${diag} and sends you a quote to approve.`} />
      )}

      <Card>
        <T v="h3">Service</T>
        <Row gap={8} wrap>{services.map((s) => <Chip key={s} label={s} on={svc === s} onPress={() => setService(s)} />)}</Row>
      </Card>

      <Card>
        <T v="h3">Vehicle</T>
        {data.vehicles.length ? (
          <Row gap={8} wrap>{data.vehicles.map((v) => <Chip key={v.id} icon="car-sport-outline" label={v.nickname || vehicleName(v)} on={car === v.id} onPress={() => setVehicleId(v.id)} />)}</Row>
        ) : <T v="small" muted>Add your car so the mechanic knows what they’re working on.</T>}
        <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/vehicle', params: { then: 'book' } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40 }}>
          <Ionicons name="add-circle-outline" size={20} color={c.brand} /><T v="label" color={c.brand}>Add a vehicle</T>
        </Pressable>
      </Card>

      <Card>
        <T v="h3">Where</T>
        {modes.length > 1 ? (
          <Segmented value={place} onChange={setPlace} options={[
            { value: 'mobile', label: 'Come to me', icon: 'car-sport-outline' }, { value: 'shop', label: 'At the shop', icon: 'business-outline' },
          ]} />
        ) : null}
        {place === 'shop' ? (
          <Row gap={8}><Ionicons name="business-outline" size={20} color={c.brand} /><T v="small" style={{ flex: 1 }}>You drop off your car at {m?.shop_name || 'the shop'}{m?.shop_address ? `, ${m.shop_address}` : ''}.</T></Row>
        ) : (
          <Row gap={8}><Ionicons name="location-outline" size={20} color={c.brand} /><T v="small" style={{ flex: 1 }}>{client?.address ? `They come to ${client.address}.` : 'Add your address first.'}</T></Row>
        )}
        {needsAddress ? <Button small kind="soft" title="Add my address" onPress={() => router.push('/address')} /> : null}
      </Card>

      {sp.pricing === 'hourly' ? (
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <View><T v="h3">How many hours?</T><T v="tiny" muted>Usually about {usualHours} for this job</T></View>
            <Row>
              <Button small kind="soft" icon="remove" accessibilityLabel="Fewer hours" onPress={() => setHours(Math.max(1, hrs - 1))} />
              <T v="h2" style={{ width: 34, textAlign: 'center' }}>{hrs}</T>
              <Button small kind="soft" icon="add" accessibilityLabel="More hours" onPress={() => setHours(Math.min(10, hrs + 1))} />
            </Row>
          </Row>
        </Card>
      ) : null}

      <Card>
        <T v="h3">Day</T>
        <DayPicker value={day} onChange={(d) => { setDay(d); setTime(null); }} />
        <T v="h3">{place === 'shop' ? 'Drop-off time' : 'Arrival time'}</T>
        <TimePicker value={time} onChange={setTime} day={day} />
      </Card>

      <Field label="What’s going on?" value={notes} onChangeText={setNotes} multiline
        placeholder="Noises, warning lights, when it started. Anything the mechanic should know." />

      <Card>
        <T v="h3">Payment</T>
        {hasCard ? (
          <Row style={{ justifyContent: 'space-between' }}>
            <Row><Ionicons name="card-outline" size={22} color={c.brand} /><T>{client?.card_brand} ending {client?.card_last4}</T></Row>
            <Button small kind="ghost" title="Change" onPress={addCard} loading={cardBusy} />
          </Row>
        ) : <Button kind="soft" icon="card-outline" title="Add a payment card" onPress={addCard} loading={cardBusy} />}
        <T v="tiny" muted>Your card is charged after you approve the finished work. Free cancellation up to 24 hours before.</T>
        {data.firstBooking ? (
          <Row>
            <TextInput value={promo} onChangeText={setPromo} placeholder="Promo code" placeholderTextColor={c.muted} autoCapitalize="characters" accessibilityLabel="Promo code"
              style={{ flex: 1, minHeight: 48, borderWidth: 1.5, borderColor: c.line, borderRadius: 12, paddingHorizontal: 12, color: c.text, fontSize: 16, backgroundColor: c.surface }} />
            <Button small kind="soft" title={promoOn ? 'Applied' : 'Apply'} disabled={promoOn} onPress={applyPromo} />
          </Row>
        ) : null}
      </Card>

      <Card>
        <T v="h3">Price</T>
        <OptionCard label={sp.pricing === 'flat' ? 'Flat price' : sp.pricing === 'hourly' ? 'Hourly + parts' : 'Diagnose, then quote'}
          desc={howPriced} icon={sp.pricing === 'flat' ? 'pricetag-outline' : sp.pricing === 'hourly' ? 'time-outline' : 'document-text-outline'} on onPress={() => {}} />
        <KV k={est.baseLabel} v={money(est.base)} />
        {est.promo ? <KV k={`Promo ${PROMO_CODE}`} v={`−${money(est.promo)}`} color={c.ok} /> : null}
        <KV k="Service & trust fee" v={money(est.fee)} />
        <View style={{ height: 1, backgroundColor: c.line }} />
        <KV k={est.more ? 'Total to start' : 'Total'} v={money(est.total)} bold />
        {est.more ? <T v="tiny" muted>Parts and repairs come later as a quote you approve or decline in the app.</T> : null}
      </Card>
    </Screen>
  );
}
