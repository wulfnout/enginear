// Client retries a payment that was declined (e.g. insufficient funds), using their current saved card.
// On success the mechanic is paid. If the bank wants extra verification, the app finishes it on screen.
import { admin, fail, getRole, getUser, handleOptions, json, notify, stripe } from '../_shared/util.ts';

Deno.serve(async (req) => {
  const pre = handleOptions(req); if (pre) return pre;
  const user = await getUser(req);
  if (!user) return fail('Please sign in again.', 401);
  if ((await getRole(user.id)) !== 'client') return fail('Only the client can retry this payment.', 403);
  const { bookingId } = await req.json();

  const { data: b } = await admin.from('bookings').select('*').eq('id', bookingId).single();
  if (!b || b.client_id !== user.id) return fail('Booking not found.', 404);
  if (b.status !== 'completed') return fail('This job isn’t finished yet.');
  if (b.payment_status === 'paid') return json({ ok: true, paymentStatus: 'paid' });

  const { data: client } = await admin.from('client_profiles').select('stripe_customer_id, payment_method_id').eq('id', user.id).single();
  if (!client?.stripe_customer_id || !client?.payment_method_id) return fail('Add a card first, then try again.');

  try {
    let pi;
    if (b.payment_intent_id) {
      pi = await stripe.paymentIntents.retrieve(b.payment_intent_id);
      if (pi.status === 'requires_payment_method' || pi.status === 'requires_confirmation') {
        pi = await stripe.paymentIntents.confirm(pi.id, { payment_method: client.payment_method_id, off_session: true });
      }
    }
    if (!pi || pi.status === 'canceled') {
      pi = await stripe.paymentIntents.create({
        amount: b.total_cents,
        currency: 'usd',
        customer: client.stripe_customer_id,
        payment_method: client.payment_method_id,
        off_session: true,
        confirm: true,
        description: `EngiNear ${b.service}`,
        transfer_group: b.id,
        metadata: { booking_id: b.id },
      }, { idempotencyKey: `booking-${b.id}-retry-${Date.now()}` });
    }

    if (pi.status === 'requires_action') {
      // The bank wants the client to verify (e.g. 3D Secure). The app shows that step.
      await admin.from('bookings').update({ payment_intent_id: pi.id }).eq('id', b.id);
      return json({ ok: false, needsAction: true, clientSecret: pi.client_secret });
    }
    if (pi.status !== 'succeeded') {
      await admin.from('bookings').update({ payment_intent_id: pi.id, payment_status: 'failed' }).eq('id', b.id);
      return fail('The payment still didn’t go through. Try a different card.');
    }
    await settle(b, pi);
    return json({ ok: true, paymentStatus: 'paid' });
  } catch (e) {
    console.error('retry failed', e);
    const err = e as { code?: string; raw?: { payment_intent?: { id?: string; client_secret?: string } } };
    const piId = err.raw?.payment_intent?.id;
    if (piId) await admin.from('bookings').update({ payment_intent_id: piId, payment_status: 'failed' }).eq('id', b.id);
    if (err.code === 'authentication_required' && err.raw?.payment_intent?.client_secret) {
      return json({ ok: false, needsAction: true, clientSecret: err.raw.payment_intent.client_secret });
    }
    return fail('Your card was declined again. Try a different card.');
  }
});

// Mark the booking paid and send the mechanic their share.
// deno-lint-ignore no-explicit-any
async function settle(b: any, pi: { id: string; latest_charge?: unknown }) {
  const { data: mechanic } = await admin.from('mechanic_profiles').select('stripe_account_id, payouts_enabled').eq('id', b.mechanic_id).single();
  let transferId: string | null = b.transfer_id;
  if (!transferId && mechanic?.stripe_account_id && mechanic.payouts_enabled) {
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
  await admin.from('bookings').update({ payment_status: 'paid', payment_intent_id: pi.id, transfer_id: transferId }).eq('id', b.id);
  if (b.mechanic_id) await notify(b.mechanic_id, 'Payment received', `Your client’s payment went through. Your pay is on its way.`, { booking_id: b.id });
}

