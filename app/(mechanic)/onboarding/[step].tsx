import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { TopHeader, Button, Card, Chip, Field, Notice, OptionCard, Row, T, Toggle } from '@/components/ui';
import { connect, geocode, pickImage, uploadVerification, payoutsReturnLink } from '@/lib/api';
import { CERTIFICATIONS, defaultServicePrice, MECHANIC_STEPS, PRICING, SERVICE_NAMES, SPECIALTIES, STANDARDS_QUIZ, WARRANTIES, WORK_MODES } from '@/lib/constants';
import { callFunction, friendlyError } from '@/lib/supabase';
import type { MechanicProfile, Pricing, ServicePrice } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';
import { useColors } from '@/providers/SettingsProvider';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const BLOCKS = ['Morning', 'Afternoon', 'Evening'];
const EXPERIENCE = ['Less than 2 years', '2 to 5 years', '5 to 10 years', '10+ years'];

export default function Step() {
  const c = useColors();
  const { step } = useLocalSearchParams<{ step: string }>();
  const meta = MECHANIC_STEPS.find((s) => s.key === step) ?? MECHANIC_STEPS[0];
  const { mechanic, profile, session, updateMechanic, updateProfile, refresh } = useAuth();
  const [p, setP] = useState<Partial<MechanicProfile>>({ ...mechanic });
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [quiz, setQuiz] = useState<(number | null)[]>(STANDARDS_QUIZ.map(() => null));
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<MechanicProfile>) => { setP((x) => ({ ...x, ...patch })); setErr(''); };
  const toggleIn = (k: 'services' | 'days' | 'time_blocks' | 'certifications' | 'specialties', v: string) => {
    const cur = (p[k] as string[] | undefined) ?? [];
    set({ [k]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] } as Partial<MechanicProfile>);
  };

  const finishStep = async (patch: Partial<MechanicProfile>) => {
    const steps = { ...(mechanic?.onboarding_steps ?? {}), [meta.key]: true };
    await updateMechanic({ ...patch, onboarding_steps: steps });
    if (mechanic?.onboarding_complete) return router.back();
    const next = MECHANIC_STEPS.find((s) => !steps[s.key]);
    if (next) router.replace({ pathname: '/onboarding/[step]', params: { step: next.key } });
    else router.replace('/onboarding/checklist');
  };

  const save = async () => {
    setBusy(true);
    try {
      switch (meta.key) {
        case 'info': {
          if (!p.legal_name?.trim() || phone.replace(/\D/g, '').length < 10 || !/^\d{5}$/.test(p.zip ?? '')) {
            setErr('Please add your legal name, a 10-digit phone number and a 5-digit ZIP code.'); return;
          }
          const pos = await geocode(`${p.zip}, USA`);
          await updateProfile({ phone: phone.trim() });
          await finishStep({ legal_name: p.legal_name.trim(), zip: p.zip, lat: pos?.lat ?? null, lng: pos?.lng ?? null });
          break;
        }
        case 'skills':
          if (!p.services?.length || !p.experience) { setErr('Pick at least one service and your experience.'); return; }
          await finishStep({ services: p.services, experience: p.experience, certifications: p.certifications ?? [], specialties: p.specialties ?? [],
            bio: (p.bio ?? '').trim(), languages: (p.languages ?? 'English').trim() || 'English' });
          break;
        case 'pricing': {
          const prices: Record<string, ServicePrice> = {};
          for (const s of p.services ?? []) {
            const sp = priceFor(s);
            if (sp.pricing === 'flat' && !(Number(sp.price) > 0)) { setErr(`Set a flat price for ${s}, or switch it to hourly or quote.`); return; }
            prices[s] = sp;
          }
          await finishStep({ hourly_rate: p.hourly_rate ?? 90, diag_fee: p.diag_fee ?? 60, service_prices: prices,
            warranty_days: p.warranty_days ?? 0, sources_parts: p.sources_parts ?? true });
          break;
        }
        case 'where': {
          const mode = p.work_mode ?? 'mobile';
          if (mode !== 'mobile' && (p.shop_address ?? '').trim().length < 6) { setErr('Add your shop’s street address so clients can find you.'); return; }
          // The map pin is the shop when there is one, otherwise the ZIP code.
          const pos = mode !== 'mobile' ? await geocode(p.shop_address!.trim()) : await geocode(`${p.zip ?? mechanic?.zip}, USA`);
          if (mode !== 'mobile' && !pos) { setErr('We couldn’t find that address on the map. Check the street, city and state.'); return; }
          await finishStep({ work_mode: mode, shop_name: (p.shop_name ?? '').trim() || null, shop_address: mode !== 'mobile' ? p.shop_address!.trim() : null,
            radius_miles: p.radius_miles ?? 15, lat: pos?.lat ?? mechanic?.lat ?? null, lng: pos?.lng ?? mechanic?.lng ?? null });
          break;
        }
        case 'availability':
          if (!p.days?.length || !p.time_blocks?.length) { setErr('Choose at least one day and one time of day.'); return; }
          await finishStep({ days: p.days, time_blocks: p.time_blocks, same_day: !!p.same_day });
          break;
        case 'verify':
          if (!p.id_document_path || !p.selfie_path || !p.background_consent_at) { setErr('Add your ID photo and selfie, and agree to the background check.'); return; }
          await updateMechanic({ id_document_path: p.id_document_path, selfie_path: p.selfie_path, background_consent_at: p.background_consent_at });
          try { await callFunction('background-check'); } catch (e) { Alert.alert('Background check', friendlyError(e)); }
          await finishStep({});
          await refresh();
          break;
        case 'quiz': {
          if (quiz.some((a) => a === null)) { setErr('Please answer all 3 questions.'); return; }
          const wrong = STANDARDS_QUIZ.findIndex((q, i) => quiz[i] !== q.answer);
          if (wrong >= 0) { setErr(`Question ${wrong + 1} isn’t right yet. The best answer is always to tell the client in the app and let them decide.`); return; }
          await finishStep({ standards_quiz_passed: true });
          break;
        }
        case 'payouts': {
          const st = await connect<{ payoutsEnabled: boolean; detailsSubmitted: boolean }>('status').catch(() => null);
          if (!st?.detailsSubmitted) { setErr('Tap “Set up with Stripe” and finish the form first.'); return; }
          await finishStep({});
          await refresh();
          break;
        }
      }
    } catch (e) {
      setErr(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const upload = async (kind: 'id' | 'selfie') => {
    if (!session) return;
    Alert.alert(kind === 'id' ? 'Photo of your ID' : 'Your selfie', 'Make sure it’s clear and well lit.', [
      { text: 'Take photo', onPress: () => go('camera') },
      { text: 'Choose from photos', onPress: () => go('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
    async function go(src: 'camera' | 'library') {
      try {
        const uri = await pickImage(src, kind === 'selfie');
        if (!uri) return;
        setBusy(true);
        const path = await uploadVerification(session!.user.id, uri, kind);
        set(kind === 'id' ? { id_document_path: path } : { selfie_path: path });
      } catch (e) { Alert.alert('Upload failed', friendlyError(e)); } finally { setBusy(false); }
    }
  };

  const openStripe = async () => {
    setBusy(true);
    try {
      const { url } = await connect('onboard');
      await WebBrowser.openAuthSessionAsync(url, payoutsReturnLink());
      const st = await connect<{ payoutsEnabled: boolean; detailsSubmitted: boolean; method: string | null }>('status');
      if (st.detailsSubmitted) setErr('');
      else setErr('Stripe still needs a few details. Tap the button again to finish.');
      await refresh();
    } catch (e) { setErr(friendlyError(e)); } finally { setBusy(false); }
  };

  const priceFor = (s: string): ServicePrice => ({ ...defaultServicePrice(s), ...(p.service_prices?.[s] ?? {}) });
  const setPrice = (s: string, patch: Partial<ServicePrice>) =>
    set({ service_prices: { ...(p.service_prices ?? {}), [s]: { ...priceFor(s), ...patch } } });
  const stepper = (label: string, value: number, step: number, min: number, max: number, onSet: (n: number) => void, unit = '') => (
    <Card style={{ alignItems: 'center' }}>
      <T v="label" muted>{label}</T>
      <T v="h1" style={{ fontSize: 38, lineHeight: 44 }}>${value}<T v="h3" muted>{unit}</T></T>
      <Row gap={14}>
        <Button kind="soft" icon="remove" accessibilityLabel={`Lower ${label}`} onPress={() => onSet(Math.max(min, value - step))} />
        <Button kind="soft" icon="add" accessibilityLabel={`Raise ${label}`} onPress={() => onSet(Math.min(max, value + step))} />
      </Row>
    </Card>
  );

  const one = (key: 'experience', opts: string[]) => (
    <Row gap={8} wrap>{opts.map((o) => <Chip key={o} label={o} on={p[key] === o} onPress={() => set({ [key]: o } as Partial<MechanicProfile>)} />)}</Row>
  );
  const switchRow = (label: string, sub: string, key: 'same_day' | 'sources_parts') => (
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1 }}><T v="h3">{label}</T><T v="small" muted>{sub}</T></View>
      <Toggle label={label} value={!!p[key]} onChange={(v) => set({ [key]: v } as Partial<MechanicProfile>)} />
    </Card>
  );
  const uploadCard = (kind: 'id' | 'selfie', title: string, has: boolean) => (
    <Card>
      <Row><Ionicons name={kind === 'id' ? 'id-card-outline' : 'person-circle-outline'} size={24} color={c.brand} /><T v="h3" style={{ flex: 1 }}>{title}</T>
        {has ? <Ionicons name="checkmark-circle" size={24} color={c.ok} /> : null}</Row>
      <Button kind="soft" icon="camera-outline" title={has ? 'Replace photo' : 'Take or upload photo'} onPress={() => upload(kind)} />
    </Card>
  );

  const body: Record<string, React.ReactNode> = {
    info: (
      <>
        <Field label="Legal name (as on your ID)" value={p.legal_name ?? profile?.full_name ?? ''} onChangeText={(t) => set({ legal_name: t })} autoComplete="name" />
        <Field label="Mobile number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" hint="We text new job alerts and day-of updates." />
        <Field label="Home ZIP code" value={p.zip ?? ''} onChangeText={(t) => set({ zip: t.replace(/\D/g, '').slice(0, 5) })} keyboardType="number-pad" autoComplete="postal-code" />
      </>
    ),
    skills: (
      <>
        <T v="h3">What do you work on?</T>
        <Row gap={8} wrap>{SERVICE_NAMES.map((s) => <Chip key={s} label={s} on={!!p.services?.includes(s)} onPress={() => toggleIn('services', s)} />)}</Row>
        <T v="h3">Experience as a mechanic</T>
        {one('experience', EXPERIENCE)}
        <T v="h3">Certifications (optional)</T>
        <Row gap={8} wrap>{CERTIFICATIONS.map((s) => <Chip key={s} label={s} on={!!p.certifications?.includes(s)} onPress={() => toggleIn('certifications', s)} />)}</Row>
        <T v="tiny" muted>Only pick ones you can show proof of. We may ask for a copy.</T>
        <T v="h3">Vehicles you specialize in (optional)</T>
        <Row gap={8} wrap>{SPECIALTIES.map((s) => <Chip key={s} label={s} on={!!p.specialties?.includes(s)} onPress={() => toggleIn('specialties', s)} />)}</Row>
        <Field label="Languages you speak" value={p.languages ?? 'English'} onChangeText={(t) => set({ languages: t })} />
        <Field label="Short intro clients will see" value={p.bio ?? ''} onChangeText={(t) => set({ bio: t })} multiline placeholder="20 years on Toyotas and Hondas. I explain everything before I touch it." />
      </>
    ),
    pricing: (
      <>
        {stepper('Labor rate', p.hourly_rate ?? 90, 5, 30, 300, (n) => set({ hourly_rate: n }), '/hr')}
        {stepper('Diagnostic fee', p.diag_fee ?? 60, 5, 0, 300, (n) => set({ diag_fee: n }))}
        <T v="small" muted>You keep 90% of labor and diagnostic fees, 100% of parts, and 100% of tips. No lead fees or subscriptions.</T>
        <T v="h3">Price for each service</T>
        {!(p.services ?? []).length ? <Notice text="Pick your services in Skills & certifications first." /> : null}
        {(p.services ?? []).map((s) => {
          const sp = priceFor(s);
          return (
            <Card key={s}>
              <T v="h3">{s}</T>
              <Row gap={8} wrap>{PRICING.map((x) => <Chip key={x.value} icon={x.icon} label={x.short} on={sp.pricing === x.value} onPress={() => setPrice(s, { pricing: x.value as Pricing })} />)}</Row>
              <T v="tiny" muted>{PRICING.find((x) => x.value === sp.pricing)?.desc}</T>
              {sp.pricing === 'flat' ? (
                <Field label="Flat price ($)" value={sp.price != null ? String(sp.price) : ''} keyboardType="number-pad"
                  onChangeText={(t) => setPrice(s, { price: Number(t.replace(/\D/g, '').slice(0, 5)) || undefined })} />
              ) : null}
              <Row style={{ justifyContent: 'space-between' }}>
                <T v="small">Usual time</T>
                <Row>
                  <Button small kind="soft" icon="remove" accessibilityLabel={`Less time for ${s}`} onPress={() => setPrice(s, { hours: Math.max(0.5, (sp.hours ?? 1) - 0.5) })} />
                  <T v="label" style={{ width: 56, textAlign: 'center' }}>{sp.hours ?? 1} hr</T>
                  <Button small kind="soft" icon="add" accessibilityLabel={`More time for ${s}`} onPress={() => setPrice(s, { hours: Math.min(12, (sp.hours ?? 1) + 0.5) })} />
                </Row>
              </Row>
            </Card>
          );
        })}
        <T v="h3">Warranty on your labor</T>
        <Row gap={8} wrap>{WARRANTIES.map((w) => <Chip key={w.days} label={w.label} on={(p.warranty_days ?? 0) === w.days} onPress={() => set({ warranty_days: w.days })} />)}</Row>
        {switchRow('I can buy the parts', 'You pick up parts and add them to a quote for the client to approve', 'sources_parts')}
      </>
    ),
    where: (
      <>
        {WORK_MODES.map((m) => <OptionCard key={m.value} label={m.label} desc={m.desc} icon={m.icon} on={(p.work_mode ?? 'mobile') === m.value} onPress={() => set({ work_mode: m.value })} />)}
        {(p.work_mode ?? 'mobile') !== 'mobile' ? (
          <>
            <Field label="Shop name (optional)" value={p.shop_name ?? ''} onChangeText={(t) => set({ shop_name: t })} placeholder="Ray’s Auto Repair" />
            <Field label="Shop street address" value={p.shop_address ?? ''} onChangeText={(t) => set({ shop_address: t })} placeholder="410 Industrial Pkwy, Nashville, TN" autoComplete="street-address" />
            <T v="tiny" muted>Clients see this address and drop their cars off here.</T>
          </>
        ) : null}
        {(p.work_mode ?? 'mobile') !== 'shop' ? (
          <>
            <T v="h3">How far will you drive for mobile jobs?</T>
            <Card style={{ alignItems: 'center' }}>
              <T v="h1" style={{ fontSize: 36, lineHeight: 42 }}>{p.radius_miles ?? 15} <T v="h3" muted>miles</T></T>
              <Row gap={8} wrap style={{ justifyContent: 'center' }}>
                {[5, 10, 15, 25, 40].map((m) => <Chip key={m} label={`${m} mi`} on={(p.radius_miles ?? 15) === m} onPress={() => set({ radius_miles: m })} />)}
              </Row>
            </Card>
          </>
        ) : null}
      </>
    ),
    availability: (
      <>
        <T v="h3">Days</T>
        <Row gap={8} wrap>{DAYS.map((d) => <Chip key={d} label={d} on={!!p.days?.includes(d)} onPress={() => toggleIn('days', d)} />)}</Row>
        <T v="h3">Times</T>
        <Row gap={8} wrap>{BLOCKS.map((d) => <Chip key={d} label={d} on={!!p.time_blocks?.includes(d)} onPress={() => toggleIn('time_blocks', d)} />)}</Row>
        {switchRow('I can take same-day jobs', 'Shows a Same day badge and sends you urgent jobs like no-starts', 'same_day')}
        <T v="tiny" muted>This decides which jobs we show you first. You can still take any job.</T>
      </>
    ),
    verify: (
      <>
        {uploadCard('id', 'Photo of your driver’s license or state ID', !!p.id_document_path)}
        {uploadCard('selfie', 'A selfie to match your ID', !!p.selfie_path)}
        <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <Toggle label="Background check consent" value={!!p.background_consent_at} onChange={(v) => set({ background_consent_at: v ? new Date().toISOString() : null })} />
          <T v="small" style={{ flex: 1 }}>I agree to a background check through EngiNear’s screening partner. It’s free for me. I’ll get an email to complete it, and results usually take 1 to 3 business days.</T>
        </Card>
        {mechanic?.verification_status && mechanic.verification_status !== 'not_started' ? (
          <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Ionicons name={mechanic.verification_status === 'approved' ? 'shield-checkmark' : 'time-outline'} size={26} color={mechanic.verification_status === 'approved' ? c.ok : c.brand} />
            <View style={{ flex: 1 }}>
              <T v="h3">{mechanic.verification_status === 'approved' ? 'Background check cleared' : 'Background check in review'}</T>
              <T v="small" muted>{mechanic.verification_status === 'approved'
                ? 'You’re verified. Your badge shows on your profile.'
                : 'We’re reviewing your ID and selfie. This usually takes 1 to 3 business days. You can keep setting up meanwhile.'}</T>
            </View>
          </Card>
        ) : null}
        <T v="tiny" muted>Your ID and selfie are stored privately and only used to verify your identity.</T>
      </>
    ),
    quiz: (
      <>
        {STANDARDS_QUIZ.map((q, qi) => (
          <Card key={q.q}>
            <T v="h3">{qi + 1}. {q.q}</T>
            {q.options.map((o, oi) => <OptionCard key={o} label={o} on={quiz[qi] === oi} onPress={() => { const n = quiz.slice(); n[qi] = oi; setQuiz(n); setErr(''); }} />)}
          </Card>
        ))}
      </>
    ),
    payouts: (
      <>
        <Card>
          <Row><Ionicons name="lock-closed-outline" size={22} color={c.ok} /><T v="h3">Paid securely through Stripe</T></Row>
          <T v="small" muted>Stripe is the payment company used by Lyft, Instacart and DoorDash. You’ll add your bank account or debit card on Stripe’s secure page. EngiNear never sees your full account number.</T>
          <Button icon="open-outline" title={mechanic?.stripe_account_id ? 'Finish setup with Stripe' : 'Set up with Stripe'} onPress={openStripe} loading={busy} />
        </Card>
        <T v="small" muted>You’ll get a 1099 tax form from Stripe each January. Add a debit card to unlock instant cash-out.</T>
      </>
    ),
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <TopHeader back title={meta.title} showActions={false} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}>
          <T muted>{meta.desc}</T>
          {err ? <Notice text={err} /> : null}
          {body[meta.key]}
          <Button title="Save and continue" onPress={save} loading={busy} />
          <Pressable onPress={() => router.replace('/onboarding/checklist')} style={{ alignItems: 'center', padding: 8 }}>
            <T v="label" color={c.brand}>See all steps</T>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
