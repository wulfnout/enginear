// Prepares Stripe PaymentSheet in "setup" mode so a client can save a card.
// The card is charged later, only after the client approves the finished work (see complete-booking).
import { admin, fail, getRole, getUser, handleOptions, json, stripe } from '../_shared/util.ts';

Deno.serve(async (req) => {
  const pre = handleOptions(req); if (pre) return pre;
  const user = await getUser(req);
  if (!user) return fail('Please sign in again.', 401);
  if ((await getRole(user.id)) !== 'client') return fail('Only client accounts can add a card.', 403);

  const { data: cp } = await admin.from('client_profiles').select('stripe_customer_id').eq('id', user.id).single();
  const { data: p } = await admin.from('profiles').select('full_name').eq('id', user.id).single();

  let customerId = cp?.stripe_customer_id as string | null;
  if (customerId) {
    // A saved customer can go missing, e.g. after switching Stripe between test and live keys.
    try {
      const existing = await stripe.customers.retrieve(customerId);
      if ((existing as { deleted?: boolean }).deleted) customerId = null;
    } catch (e) {
      const err = e as { code?: string; statusCode?: number };
      if (err.code === 'resource_missing' || err.statusCode === 404) customerId = null; else throw e;
    }
  }
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: p?.full_name ?? undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await admin.from('client_profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
  }

  const ephemeralKey = await stripe.ephemeralKeys.create({ customer: customerId }, { apiVersion: '2025-02-24.acacia' });
  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    usage: 'off_session',
    automatic_payment_methods: { enabled: true },
    metadata: { supabase_user_id: user.id },
  });

  return json({
    setupIntent: setupIntent.client_secret,
    ephemeralKey: ephemeralKey.secret,
    customer: customerId,
    publishableKey: Deno.env.get('STRIPE_PUBLISHABLE_KEY'),
    livemode: setupIntent.livemode,
  });
});
