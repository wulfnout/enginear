import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { approveQuote, bookingQuotes, declineQuote } from '@/lib/api';
import { money, shortDate, timeOf } from '@/lib/format';
import { friendlyError, supabase } from '@/lib/supabase';
import type { Quote } from '@/lib/types';
import { useColors } from '@/providers/SettingsProvider';
import { Button, KV, Pill, Row, T } from './ui';

/** A booking's quotes, newest first, kept live as they're sent and decided. */
export function useQuotes(bookingId: string) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const load = useCallback(() => { bookingQuotes(bookingId).then(setQuotes).catch(() => {}); }, [bookingId]);
  useEffect(() => {
    load();
    const ch = supabase.channel(`quotes-${bookingId}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quotes', filter: `booking_id=eq.${bookingId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [bookingId, load]);
  return quotes;
}

const STATUS: Record<Quote['status'], { label: string; tone: 'brand' | 'ok' | 'warn' | 'bad' }> = {
  sent: { label: 'Waiting for approval', tone: 'warn' },
  approved: { label: 'Approved', tone: 'ok' },
  declined: { label: 'Declined', tone: 'bad' },
  replaced: { label: 'Replaced', tone: 'brand' },
};

/** One quote: each part and labor line, totals, and (for the client) Approve / Decline. */
export function QuoteCard({ q, side, onChange }: { q: Quote; side: 'client' | 'mechanic'; onChange?: () => void }) {
  const c = useColors();
  const [busy, setBusy] = useState<'approve' | 'decline' | null>(null);
  const open = q.status === 'sent';

  const approve = () => Alert.alert(`Approve ${money(q.total_cents)}?`, 'This is added to your bill and your mechanic goes ahead with the work.', [
    { text: 'Not yet', style: 'cancel' },
    { text: 'Approve', onPress: async () => {
      setBusy('approve');
      try { await approveQuote(q.id); onChange?.(); } catch (e) { Alert.alert('Not approved', friendlyError(e)); } finally { setBusy(null); }
    } },
  ]);
  const decline = () => Alert.alert('Decline this quote?', 'Nothing from it is added to your bill. You can message your mechanic to talk it over.', [
    { text: 'Keep it', style: 'cancel' },
    { text: 'Decline', style: 'destructive', onPress: async () => {
      setBusy('decline');
      try { await declineQuote(q.id); onChange?.(); } catch (e) { Alert.alert('Not declined', friendlyError(e)); } finally { setBusy(null); }
    } },
  ]);

  return (
    <View style={{ gap: 6, backgroundColor: c.surface, borderRadius: 12, borderWidth: open ? 2 : 1, borderColor: open ? c.brand : c.line, padding: 12, opacity: q.status === 'replaced' ? 0.6 : 1 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row gap={6}><Ionicons name="document-text-outline" size={18} color={c.brand} /><T v="label">Quote</T></Row>
        <Pill tone={STATUS[q.status].tone} label={STATUS[q.status].label} />
      </Row>
      {q.items.map((it, i) => (
        <Row key={i} gap={8}>
          <Ionicons name={it.kind === 'part' ? 'cube-outline' : 'construct-outline'} size={16} color={c.muted} />
          <T v="small" style={{ flex: 1 }}>{it.desc}</T>
          <T v="small" bold>{money(it.cents)}</T>
        </Row>
      ))}
      <View style={{ height: 1, backgroundColor: c.line }} />
      {q.parts_cents ? <KV k="Parts" v={money(q.parts_cents)} /> : null}
      {q.labor_cents ? <KV k="Labor" v={money(q.labor_cents)} /> : null}
      <KV k="Quote total" v={money(q.total_cents)} bold />
      {q.note ? <T v="small" muted>“{q.note}”</T> : null}
      {q.decline_reason ? <T v="small" muted>Declined: {q.decline_reason}</T> : null}
      <T v="tiny" muted>Sent {shortDate(q.created_at)} at {timeOf(q.created_at)}{side === 'client' && open ? ' · plus the 6% service fee' : ''}</T>
      {side === 'client' && open ? (
        <Row gap={8}>
          <Button small kind="soft" style={{ flex: 1 }} title="Decline" loading={busy === 'decline'} disabled={!!busy} onPress={decline} />
          <Button small kind="ok" style={{ flex: 1 }} icon="checkmark" title="Approve" loading={busy === 'approve'} disabled={!!busy} onPress={approve} />
        </Row>
      ) : null}
    </View>
  );
}

/** Every quote on a booking, open ones first. Hidden when there are none. */
export function QuoteList({ quotes, side, onChange }: { quotes: Quote[]; side: 'client' | 'mechanic'; onChange?: () => void }) {
  const shown = [...quotes.filter((q) => q.status === 'sent'), ...quotes.filter((q) => q.status !== 'sent' && q.status !== 'replaced')];
  if (!shown.length) return null;
  return <View style={{ gap: 8 }}>{shown.map((q) => <QuoteCard key={q.id} q={q} side={side} onChange={onChange} />)}</View>;
}
