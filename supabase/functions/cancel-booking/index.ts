// Client cancels. Free 24+ hours ahead; inside 24 hours a $15 fee goes to the mechanic.
import { admin, fail, getUser, handleOptions, json, stripe } from '../_shared/util.ts';

const LATE_FEE_CENTS = 1500;

Deno.serve(async (req) => {
  const pre = handleOptions(req); if (pre) return pre;
  const user = await getUser(req);
  if (!user) return fail('Please sign in again.', 401);
  const { bookingId } = await req.json();

  const { data: b } = await admin.from('bookings').select('*').eq('id', bookingId).single();
  if (!b || b.client_id !== user.id) return fail('Booking not found.', 404);
  if (!['open', 'requested', 'confirmed'].includes(b.status)) return fail('This booking can’t be cancelled.');

  const hoursAway = (new Date(b.scheduled_at).getTime() - Date.now()) / 36e5;
  const late = hoursAway < 24 && b.status === 'confirmed' && !!b.mechanic_id;
  let fee = 0;
  let paymentStatus = 'not_charged';

  if (late) {
    fee = LATE_FEE_CENTS;
    const { data: cp } = await admin.from('client_profiles').select('stripe_customer_id, payment_method_id').eq('id', user.id).single();
    const { data: cl } = await admin.from('mechanic_profiles').select('stripe_account_id, payouts_enabled').eq('id', b.mechanic_id).single();
    if (cp?.stripe_customer_id && cp.payment_method_id) {
      try {
        const pi = await stripe.paymentIntents.create({
          amount: fee, currency: 'usd', customer: cp.stripe_customer_id, payment_method: cp.payment_method_id,
          off_session: true, confirm: true, description: 'EngiNear late cancellation', transfer_group: b.id,
          metadata: { booking_id: b.id, kind: 'late_cancel' },
        }, { idempotencyKey: `cancel-${b.id}` });
        paymentStatus = pi.status === 'succeeded' ? 'paid' : 'unpaid';
        if (pi.status === 'succeeded' && cl?.stripe_account_id && cl.payouts_enabled) {
          await stripe.transfers.create({
            amount: fee, currency: 'usd', destination: cl.stripe_account_id, transfer_group: b.id,
            source_transaction: pi.latest_charge as string,
          }, { idempotencyKey: `cancel-transfer-${b.id}` });
        }
      } catch (e) {
        console.error('late fee failed', e);
        paymentStatus = 'failed';
      }
    }
  }

  await admin.from('bookings').update({
    status: 'cancelled', cancelled_at: new Date().toISOString(), cancel_fee_cents: fee, payment_status: paymentStatus,
  }).eq('id', b.id);

  return json({ ok: true, feeCents: fee });
});
