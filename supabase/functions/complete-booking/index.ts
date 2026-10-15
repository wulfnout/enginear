// Mechanic finishes a job: charge the client's saved card (starting price + approved quotes) and pay the mechanic.
import { admin, fail, getUser, handleOptions, json, notify, stripe } from '../_shared/util.ts';

Deno.serve(async (req) => {
  const pre = handleOptions(req); if (pre) return pre;
  const user = await getUser(req);
  if (!user) return fail('Please sign in again.', 401);
  const { bookingId } = await req.json();

  const { data: b } = await admin.from('bookings').select('*').eq('id', bookingId).single();
  if (!b || b.mechanic_id !== user.id) return fail('Job not found.', 404);
  if (b.status !== 'in_progress') return fail('Begin the job before finishing it.');
  // The client has to review and approve the work (in person or from photos)...
  if (!b.client_approved_at) return fail('Your client needs to check the work and tap "The work is done" first.');
  const { count: openQuotes } = await admin.from('quotes').select('id', { count: 'exact', head: true }).eq('booking_id', b.id).eq('status', 'sent');
  if (openQuotes) return fail('Your client still has a quote to approve or decline.');
  // ...and for hourly jobs, the booked hours have to have passed since the job began.
  const endsAt = new Date(b.started_at).getTime() + Number(b.hours) * 36e5;
  if (b.pricing === 'hourly' && Date.now() < endsAt - 60 * 1000) {
    const mins = Math.ceil((endsAt - Date.now()) / 60000);
    return fail(`You can finish when your booked time is up, in about ${mins >= 60 ? `${Math.floor(mins / 60)} hr ${mins % 60} min` : `${mins} min`}.`);
  }

  const { data: client } = await admin.from('client_profiles').select('stripe_customer_id, payment_method_id').eq('id', b.client_id).single();
  const { data: mechanic } = await admin.from('mechanic_profiles').select('stripe_account_id, payouts_enabled, jobs_completed, on_time_count').eq('id', user.id).single();

  let paymentStatus = 'unpaid';
  let paymentIntentId: string | null = null;
  let transferId: string | null = null;

  if (client?.stripe_customer_id && client?.payment_method_id && b.total_cents > 0) {
    try {
      const pi = await stripe.paymentIntents.create({
        amount: b.total_cents,
        currency: 'usd',
        customer: client.stripe_customer_id,
        payment_method: client.payment_method_id,
        off_session: true,
        confirm: true,
        description: `EngiNear ${b.service} · ${b.vehicle_label}`,
        transfer_group: b.id,
        metadata: { booking_id: b.id },
      }, { idempotencyKey: `booking-${b.id}` });
      paymentIntentId = pi.id;
      paymentStatus = pi.status === 'succeeded' ? 'paid' : 'unpaid';
      if (pi.status === 'succeeded' && mechanic?.stripe_account_id && mechanic.payouts_enabled) {
        const tr = await stripe.transfers.create({
          amount: b.mechanic_payout_cents,
          currency: 'usd',
          destination: mechanic.stripe_account_id,
          transfer_group: b.id,
          source_transaction: pi.latest_charge as string,
          metadata: { booking_id: b.id },
        }, { idempotencyKey: `transfer-${b.id}` });
        transferId = tr.id;
      }
    } catch (e) {
      console.error('charge failed', e);
      // Keep the failed attempt so the client can retry the same payment later.
      paymentIntentId = (e as { raw?: { payment_intent?: { id?: string } } }).raw?.payment_intent?.id ?? null;
      paymentStatus = 'failed';
      await notify(b.client_id, 'Payment didn’t go through', 'Your card was declined. Open My bookings to retry the payment or use a different card.', { booking_id: b.id });
    }
  }

  const startedAt = b.started_at ? new Date(b.started_at).getTime() : Date.now();
  const onTime = startedAt <= new Date(b.scheduled_at).getTime() + 15 * 60 * 1000;

  await admin.from('bookings').update({
    status: 'completed',
    completed_at: new Date().toISOString(),
    payment_status: paymentStatus,
    payment_intent_id: paymentIntentId,
    transfer_id: transferId,
  }).eq('id', b.id);

  await admin.from('mechanic_profiles').update({
    jobs_completed: (mechanic?.jobs_completed ?? 0) + 1,
    on_time_count: (mechanic?.on_time_count ?? 0) + (onTime ? 1 : 0),
  }).eq('id', user.id);

  return json({ ok: true, paymentStatus, earnedCents: b.mechanic_payout_cents });
});
