// Stripe webhook: saves cards, tracks payout status and failed charges.
// Point a Stripe webhook (and a Connect webhook) at /functions/v1/stripe-webhook with these events:
// setup_intent.succeeded, account.updated, payment_intent.payment_failed
import { admin, cryptoProvider, notify, stripe } from '../_shared/util.ts';

Deno.serve(async (req) => {
  const sig = req.headers.get('stripe-signature') ?? '';
  const body = await req.text();
  // Two Stripe destinations can point here: one for your account, one for connected accounts.
  // Each has its own signing secret, so try both.
  const secrets = [Deno.env.get('STRIPE_WEBHOOK_SECRET'), Deno.env.get('STRIPE_CONNECT_WEBHOOK_SECRET')].filter(Boolean) as string[];
  let event;
  for (const secret of secrets) {
    try {
      event = await stripe.webhooks.constructEventAsync(body, sig, secret, undefined, cryptoProvider);
      break;
    } catch { /* try the next secret */ }
  }
  if (!event) {
    console.error('bad signature');
    return new Response('Bad signature', { status: 400 });
  }

  switch (event.type) {
    case 'setup_intent.succeeded': {
      const si = event.data.object;
      const pmId = typeof si.payment_method === 'string' ? si.payment_method : si.payment_method?.id;
      const customer = typeof si.customer === 'string' ? si.customer : si.customer?.id;
      if (pmId && customer) {
        const pm = await stripe.paymentMethods.retrieve(pmId);
        await stripe.customers.update(customer, { invoice_settings: { default_payment_method: pmId } });
        const brand = pm.card?.brand ? pm.card.brand.charAt(0).toUpperCase() + pm.card.brand.slice(1) : pm.type;
        await admin.from('client_profiles').update({
          payment_method_id: pmId, card_brand: brand, card_last4: pm.card?.last4 ?? null,
        }).eq('stripe_customer_id', customer);
      }
      break;
    }
    case 'account.updated': {
      const acct = event.data.object;
      await admin.from('mechanic_profiles').update({ payouts_enabled: !!acct.payouts_enabled }).eq('stripe_account_id', acct.id);
      break;
    }
    case 'payment_intent.payment_failed': {
      const pi = event.data.object;
      const bookingId = pi.metadata?.booking_id;
      if (bookingId && !pi.metadata?.kind) {
        const { data: b } = await admin.from('bookings').update({ payment_status: 'failed' }).eq('id', bookingId).select('client_id').single();
        if (b) await notify(b.client_id, 'Payment didn’t go through', 'Please update your card in Me > Payment card.', { booking_id: bookingId });
      }
      break;
    }
  }
  return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } });
});
