import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, View } from 'react-native';
import { checkIn, confirmCheckIn, finishJob, jobEndsAt, jobPhotoUrls, pickPhotos, requestPhotos, sendCompletionPhotos, startJob } from '@/lib/api';
import { firstName, money, timeOf } from '@/lib/format';
import { friendlyError } from '@/lib/supabase';
import type { BookingWithPeople } from '@/lib/types';
import { useColors } from '@/providers/SettingsProvider';
import { QuoteList, useQuotes } from './Quotes';
import { Button, KV, Progress, Row, T } from './ui';

/** Ticks every few seconds so timers stay current. */
function useNow(ms = 5000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}

function hm(ms: number) {
  const m = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(m / 60);
  return h ? `${h} hr ${m % 60} min` : `${m} min`;
}

/** One line in the step list: done (check), current (orange dot) or still to come (grey). */
function Step({ state, text }: { state: 'done' | 'now' | 'todo'; text: string }) {
  const c = useColors();
  const icon = state === 'done' ? 'checkmark-circle' : state === 'now' ? 'ellipse' : 'ellipse-outline';
  const color = state === 'done' ? c.ok : state === 'now' ? c.brand : c.line;
  return (
    <Row gap={10} style={{ alignItems: 'center' }}>
      <Ionicons name={icon} size={state === 'now' ? 16 : 20} color={color} style={{ width: 20, textAlign: 'center' }} />
      <T v="small" bold={state === 'now'} muted={state === 'todo'} style={{ flex: 1 }}>{text}</T>
    </Row>
  );
}

/** Photos of the finished work (and old parts), side by side. */
export function JobPhotos({ paths }: { paths: string[] }) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => { jobPhotoUrls(paths).then(setUrls).catch(() => setUrls([])); }, [paths.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!urls.length) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {urls.map((u) => <Image key={u} source={{ uri: u }} style={{ width: 120, height: 120, borderRadius: 12 }} accessibilityLabel="Photo of the finished work" />)}
    </ScrollView>
  );
}

/** The running bill: starting price plus every approved quote. */
export function RunningBill({ b }: { b: BookingWithPeople }) {
  const c = useColors();
  if (!b.labor_extra_cents && !b.parts_cents) return null;
  return (
    <View style={{ gap: 4, borderTopWidth: 1, borderTopColor: c.line, paddingTop: 8 }}>
      <KV k={b.pricing === 'quote' ? 'Diagnosis' : b.pricing === 'hourly' ? `${b.hours} hr labor` : 'Flat price'} v={money(b.base_cents)} />
      {b.labor_extra_cents ? <KV k="Approved labor" v={money(b.labor_extra_cents)} /> : null}
      {b.parts_cents ? <KV k="Approved parts" v={money(b.parts_cents)} /> : null}
      <KV k="Service & trust fee" v={money(b.fee_cents)} />
      <KV k="Total so far" v={money(b.total_cents)} bold />
    </View>
  );
}

/**
 * Mechanic side of a job: check in -> confirmed -> begin -> quotes -> client approves -> finish & get paid.
 * Mobile: the mechanic checks in and the client confirms. Shop: the client drops off and the mechanic confirms.
 * Every gate is also enforced on the server.
 */
export function MechanicJobSteps({ b, onChange }: { b: BookingWithPeople; onChange: () => void }) {
  const c = useColors();
  const now = useNow();
  const quotes = useQuotes(b.id);
  const [busy, setBusy] = useState<string | null>(null);
  const client = firstName(b.client?.full_name) || 'your client';
  const shop = b.location_type === 'shop';
  const run = async (key: string, fn: () => Promise<unknown>, okMsg?: [string, string]) => {
    setBusy(key);
    try { await fn(); onChange(); if (okMsg) Alert.alert(okMsg[0], okMsg[1]); }
    catch (e) { Alert.alert('Not yet', friendlyError(e)); }
    finally { setBusy(null); }
  };

  const started = b.status === 'in_progress';
  const hourly = b.pricing === 'hourly';
  const endsAt = jobEndsAt(b);
  const timeLeft = endsAt ? endsAt - now : null;
  const timeDone = !hourly || (timeLeft !== null && timeLeft <= 60 * 1000);
  const approved = !!b.client_approved_at;
  const elapsed = b.started_at ? now - new Date(b.started_at).getTime() : 0;
  const openQuote = quotes.find((q) => q.status === 'sent');

  const sendPhotos = () => Alert.alert('Send photos of your work', `Include the old parts if you replaced any. ${client} will look at them and approve the job.`, [
    { text: 'Take a photo', onPress: () => go('camera') },
    { text: 'Choose photos', onPress: () => go('library') },
    { text: 'Cancel', style: 'cancel' },
  ]);
  const go = async (src: 'camera' | 'library') => {
    try {
      const uris = await pickPhotos(src);
      if (!uris.length) return;
      await run('photos', () => sendCompletionPhotos(b.id, uris), ['Photos sent', `We let ${client} know. You can finish once they approve.`]);
    } catch (e) { Alert.alert('Photos not sent', friendlyError(e)); }
  };

  const finish = () => Alert.alert('Finish this job?', `${client} will be charged ${money(b.total_cents)} and your pay sent to you.`, [
    { text: 'Not yet', style: 'cancel' },
    { text: 'Finish & get paid', onPress: async () => {
      setBusy('finish');
      try {
        const r = await finishJob(b.id);
        router.push({ pathname: '/rate-client/[id]', params: { id: b.id, earned: String(r.earnedCents) } });
      } catch (e) { Alert.alert('Can’t finish yet', friendlyError(e)); } finally { setBusy(null); }
    } },
  ]);

  const quoteButton = (
    <Button small kind="soft" icon="document-text-outline" title={openQuote ? 'Replace the open quote' : b.pricing === 'quote' && !quotes.length ? 'Send your quote' : 'Quote extra parts or work'}
      onPress={() => router.push({ pathname: '/quote/[id]', params: { id: b.id } })} />
  );

  return (
    <View style={{ gap: 10, backgroundColor: c.bg, borderRadius: 14, padding: 12 }}>
      <Step state={b.arrived_at ? 'done' : 'now'} text={shop ? `${client} drops off the car` : 'Arrive and check in'} />
      <Step state={b.arrival_confirmed_at ? 'done' : b.arrived_at ? 'now' : 'todo'} text={shop ? 'You confirm you have the car' : `${client} confirms you’re there`} />
      <Step state={started ? 'done' : b.arrival_confirmed_at ? 'now' : 'todo'} text={b.pricing === 'quote' ? 'Begin and diagnose' : 'Begin the job'} />
      {b.pricing === 'quote' ? <Step state={quotes.some((q) => q.status === 'approved' || q.status === 'declined') ? 'done' : started ? 'now' : 'todo'} text={`Send a quote; ${client} approves it`} /> : null}
      {hourly ? <Step state={!started ? 'todo' : timeDone ? 'done' : 'now'} text={`Work your booked ${b.hours} hours`} /> : null}
      <Step state={approved ? 'done' : started ? 'now' : 'todo'} text={`${client} reviews and approves the work`} />

      {b.status === 'confirmed' && shop && !b.arrived_at ? (
        <View style={{ gap: 4 }}>
          <T v="small">Waiting for {client} to drop off their {b.vehicle_label}.</T>
          <T v="tiny" muted>They tap “I dropped off my car” in their app when they get to your shop.</T>
        </View>
      ) : b.status === 'confirmed' && !b.arrived_at ? (
        <Button icon="location" title="I’ve arrived" loading={busy === 'arrive'}
          onPress={() => run('arrive', () => checkIn(b.id), ['Checked in', `We asked ${client} to confirm you’re there. Then you can begin.`])} />
      ) : b.status === 'confirmed' && !b.arrival_confirmed_at ? (
        shop ? (
          <View style={{ gap: 6 }}>
            <T v="small" bold>{client} says they dropped off their {b.vehicle_label}.</T>
            <Button icon="key" title="Confirm I have the car" loading={busy === 'confirm'}
              onPress={() => run('confirm', () => confirmCheckIn(b.id), ['Car checked in', 'You can begin when you’re ready.'])} />
          </View>
        ) : (
          <View style={{ gap: 4 }}>
            <T v="small">Waiting for {client} to confirm you’ve arrived.</T>
            <T v="tiny" muted>Ask them to open EngiNear and tap “Confirm arrival”.</T>
          </View>
        )
      ) : !started ? (
        <View style={{ gap: 8 }}>
          <Button kind="ok" icon="play" title={b.pricing === 'quote' ? 'Begin diagnosis' : 'Begin job'} loading={busy === 'start'} onPress={() => run('start', () => startJob(b.id))} />
          {quoteButton}
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          <View style={{ gap: 6 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T v="label">Time on the job {hm(elapsed)}</T>
              {hourly ? <T v="small" muted>{timeDone ? 'Booked time done' : `${hm(timeLeft ?? 0)} left`}</T> : null}
            </Row>
            {hourly ? <Progress value={Math.min(1, elapsed / (Number(b.hours) * 36e5))} /> : null}
            {hourly && endsAt && !timeDone ? <T v="tiny" muted>Finishing unlocks at {timeOf(new Date(endsAt).toISOString())}.</T> : null}
          </View>

          <QuoteList quotes={quotes} side="mechanic" />
          {!approved ? quoteButton : null}
          <RunningBill b={b} />

          {approved ? (
            <T v="small" color={c.ok} bold>✓ {b.approval_method === 'auto' ? `Approved automatically (${client} didn’t respond within 24 hours).` : `${client} approved your work${b.approval_method === 'photos' ? ' from your photos' : ''}.`}</T>
          ) : b.problem_report ? (
            <View style={{ gap: 4, backgroundColor: c.warnSoft, borderRadius: 10, padding: 10 }}>
              <T v="small" bold color={c.warn}>{client} reported a problem</T>
              <T v="small">“{b.problem_report}”</T>
              <T v="tiny" muted>Message them to sort it out. Our team will help before the job is approved.</T>
            </View>
          ) : b.completion_requested_at ? (
            <View style={{ gap: 6 }}>
              <T v="small">Photos sent. Waiting for {client} to approve.</T>
              <JobPhotos paths={b.completion_photos} />
            </View>
          ) : b.photos_requested_at ? (
            <View style={{ gap: 6 }}>
              <T v="small" bold color={c.brand}>{client} isn’t there and asked for photos of the work.</T>
              <Button kind="soft" icon="camera" title="Send photos for approval" loading={busy === 'photos'} onPress={sendPhotos} />
            </View>
          ) : (
            <View style={{ gap: 6 }}>
              <T v="small">When you’re done, {client} checks the car with the checklist in their app and taps “The work is done”.</T>
              <Button small kind="ghost" icon="camera-outline" title="Client not there? Send photos instead" loading={busy === 'photos'} onPress={sendPhotos} />
            </View>
          )}

          <Button kind="ok" icon="checkmark-circle" title="Finish job & get paid" loading={busy === 'finish'}
            disabled={!approved || !timeDone} onPress={finish} />
          {!approved && !b.problem_report ? (
            <T v="tiny" muted center>If {client} doesn’t respond, the job is approved automatically 24 hours after the estimated end.</T>
          ) : null}
          {!approved || !timeDone ? (
            <T v="tiny" muted center>
              {!approved && !timeDone ? 'Unlocks when your booked time is up and your client approves.'
                : !approved ? 'Unlocks when your client approves the work.' : 'Unlocks when your booked time is up.'}
            </T>
          ) : null}
        </View>
      )}
    </View>
  );
}

/** Client side of a job: check in, approve quotes, then review and approve the work. */
export function ClientJobSteps({ b, onChange }: { b: BookingWithPeople; onChange: () => void }) {
  const c = useColors();
  const now = useNow();
  const quotes = useQuotes(b.id);
  const [busy, setBusy] = useState<string | null>(null);
  const who = firstName(b.mechanic?.full_name) || 'Your mechanic';
  const shop = b.location_type === 'shop';
  const run = async (key: string, fn: () => Promise<unknown>, okMsg?: [string, string]) => {
    setBusy(key);
    try { await fn(); onChange(); if (okMsg) Alert.alert(okMsg[0], okMsg[1]); }
    catch (e) { Alert.alert('Something went wrong', friendlyError(e)); }
    finally { setBusy(null); }
  };

  if (b.status === 'confirmed') {
    const pending = quotes.some((q) => q.status === 'sent') ? <QuoteList quotes={quotes} side="client" onChange={onChange} /> : null;
    if (shop && !b.arrived_at) {
      return (
        <View style={{ gap: 8 }}>
          <View style={{ gap: 8, backgroundColor: c.brandSoft, borderRadius: 14, padding: 12 }}>
            <T v="label" color={c.brandInk}>At the shop?</T>
            <T v="small" color={c.brandInk}>When you hand over your keys, tap below. {who} confirms they have the car, then work can begin.</T>
            <Button icon="key" title="I dropped off my car" loading={busy === 'drop'}
              onPress={() => run('drop', () => checkIn(b.id), ['Thanks!', `We let ${who} know your car is there.`])} />
          </View>
          {pending}
        </View>
      );
    }
    if (shop && !b.arrival_confirmed_at) {
      return <T v="small" muted>Waiting for {who} to confirm they have your car.</T>;
    }
    if (!shop && b.arrived_at && !b.arrival_confirmed_at) {
      return (
        <View style={{ gap: 8, backgroundColor: c.brandSoft, borderRadius: 14, padding: 12 }}>
          <T v="label" color={c.brandInk}>{who} says they’ve arrived</T>
          <T v="small" color={c.brandInk}>Only confirm once they’re really at your car. They can’t begin until you do.</T>
          <Button icon="checkmark-circle" title="Confirm arrival" loading={busy === 'arrival'}
            onPress={() => run('arrival', () => confirmCheckIn(b.id), ['Thanks!', `${who} can begin now.`])} />
        </View>
      );
    }
    return pending;
  }
  if (b.status !== 'in_progress') return null;

  const elapsed = b.started_at ? now - new Date(b.started_at).getTime() : 0;
  const hasPhotos = b.completion_photos.length > 0 && !!b.completion_requested_at;
  const openQuote = quotes.some((q) => q.status === 'sent');

  return (
    <View style={{ gap: 10, backgroundColor: c.bg, borderRadius: 14, padding: 12 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="label">{b.pricing === 'quote' && !quotes.length ? 'Diagnosing now' : 'Working on it now'} · {hm(elapsed)}</T>
        {b.pricing === 'hourly' ? <T v="small" muted>of {b.hours} hours</T> : null}
      </Row>
      {b.pricing === 'hourly' ? <Progress value={Math.min(1, elapsed / (Number(b.hours) * 36e5))} /> : null}
      {b.pricing === 'quote' && !quotes.length ? <T v="small" muted>{who} will send you a parts and labor quote after the diagnosis. Nothing is added until you approve it.</T> : null}

      <QuoteList quotes={quotes} side="client" onChange={onChange} />
      <RunningBill b={b} />

      {b.client_approved_at ? (
        <T v="small" color={c.ok} bold>✓ {b.approval_method === 'auto' ? 'Approved automatically after 24 hours.' : 'You approved the work.'} {who} will finish up and you’ll be charged then.</T>
      ) : b.problem_report ? (
        <View style={{ gap: 4, backgroundColor: c.warnSoft, borderRadius: 10, padding: 10 }}>
          <T v="small" bold color={c.warn}>You reported a problem</T>
          <T v="tiny" muted>Our team will contact you within 24 hours. You can still approve once it’s sorted out.</T>
          <Button small icon="clipboard-outline" title="Review & approve" onPress={() => router.push({ pathname: '/approve/[id]', params: { id: b.id } })} />
        </View>
      ) : (
        <>
          {hasPhotos ? (
            <View style={{ gap: 6 }}>
              <T v="small" bold>{who} sent photos of the finished work.</T>
              <JobPhotos paths={b.completion_photos} />
            </View>
          ) : null}
          <Button icon="clipboard-outline" title={hasPhotos ? 'Review photos & approve' : 'Check the car & approve'} disabled={openQuote}
            onPress={() => router.push({ pathname: '/approve/[id]', params: { id: b.id } })} />
          {openQuote ? <T v="tiny" muted center>Approve or decline the open quote first.</T> : null}
          {!hasPhotos ? (
            b.photos_requested_at
              ? <T v="tiny" muted center>You asked {who} for photos. You’ll get a notification when they arrive.</T>
              : <Button small kind="ghost" icon="camera-outline" title="Not there? Ask for photos" loading={busy === 'photos'}
                  onPress={() => run('photos', () => requestPhotos(b.id), ['Request sent', `${who} will send photos of the finished work for you to approve.`])} />
          ) : null}
          <Button small kind="ghost" icon="alert-circle-outline" title="Report a problem" onPress={() => router.push({ pathname: '/problem/[id]', params: { id: b.id } })} />
          <T v="tiny" muted center>If you don’t respond, it’s approved automatically 24 hours after the estimated end.</T>
        </>
      )}
    </View>
  );
}
