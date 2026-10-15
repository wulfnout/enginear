// Client adds a tip after a completed job. 100% goes to the mechanic.
import { admin, fail, getUser, handleOptions, json, notify, stripe } from '../_shared/util.ts';

Deno.serve(async (req) => {
  const pre = handleOptions(req); if (pre) return pre;
  const user = await getUser(req);
  if (!user) return fail('Please sign in again.', 401);
  const { bookingId, amountCents } = await req.json();
  const amount = Math.round(Number(amountCents));
  if (!Number.isFinite(amount) || amount < 100 || amount > 50000) return fail('Choose a tip between $1 and $500.');

  const { data: b } = await admin.from('bookings').select('*').eq('id', bookingId).single();
  if (!b || b.client_id !== user.id) return fail('Booking not found.', 404);
  if (b.status !== 'completed') return fail('You can tip after the job is finished.');
  if (b.tip_cents > 0) return fail('You already tipped for this job. Thank you!');

  const { data: cp } = await admin.from('client_profiles').select('stripe_customer_id, payment_method_id').eq('id', user.id).single();
  const { data: cl } = await admin.from('mechanic_profiles').select('stripe_account_id, payouts_enabled').eq('id', b.mechanic_id).single();
  if (!cp?.stripe_customer_id || !cp.payment_method_id) return fail('Add a payment card first.');

  try {
    const pi = await stripe.paymentIntents.create({
      amount, currency: 'usd', customer: cp.stripe_customer_id, payment_method: cp.payment_method_id,
      off_session: true, confirm: true, description: 'EngiNear tip', transfer_group: b.id,
      metadata: { booking_id: b.id, kind: 'tip' },
    }, { idempotencyKey: `tip-${b.id}` });
    if (pi.status !== 'succeeded') return fail('Your card was declined. Please try another card.');
    if (cl?.stripe_account_id && cl.payouts_enabled) {
      await stripe.transfers.create({
        amount, currency: 'usd', destination: cl.stripe_account_id, transfer_group: b.id,
        source_transaction: pi.latest_charge as string, metadata: { booking_id: b.id, kind: 'tip' },
      }, { idempotencyKey: `tip-transfer-${b.id}` });
    }
  } catch (e) {
    console.error('tip failed', e);
    return fail('Your card was declined. Please try another card.');
  }

  await admin.from('bookings').update({ tip_cents: amount }).eq('id', b.id);
  await notify(b.mechanic_id, 'You got a tip!', `Your client tipped you $${(amount / 100).toFixed(2)}.`, { booking_id: b.id });
  return json({ ok: true });
});
