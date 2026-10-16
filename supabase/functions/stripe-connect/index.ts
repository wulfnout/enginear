// Mechanic payouts through Stripe Connect Express.
// actions: onboard | dashboard | status | balance | instant_payout
import { admin, fail, getRole, getUser, handleOptions, json, stripe } from '../_shared/util.ts';

Deno.serve(async (req) => {
  const pre = handleOptions(req); if (pre) return pre;
  const user = await getUser(req);
  if (!user) return fail('Please sign in again.', 401);
  if ((await getRole(user.id)) !== 'mechanic') return fail('Payouts are for mechanic accounts.', 403);
  const { action, returnTo } = await req.json();

  const { data: cp } = await admin.from('mechanic_profiles').select('stripe_account_id, payouts_enabled, legal_name').eq('id', user.id).single();
  let accountId = cp?.stripe_account_id as string | null;
  // Stripe only accepts https return links, so Stripe sends mechanics to a small page on the website,
  // which hands them back to the app (the app tells us its own link in `returnTo`).
  const configured = Deno.env.get('STRIPE_CONNECT_RETURN_URL') ?? '';
  const base = /^https:\/\//.test(configured) ? configured : 'https://cleanconnect.info/enginear/payouts-done.html';
  const appLink = typeof returnTo === 'string' && /^(enginear|exp|exps):\/\//.test(returnTo) ? returnTo : 'enginear://payouts-done';
  const returnUrl = `${base}?to=${encodeURIComponent(appLink)}`;
  const refreshUrl = `${returnUrl}&refresh=1`;

  try {
  if (action === 'onboard') {
    if (accountId) {
      // A saved account can go missing, e.g. after switching Stripe between test and live keys.
      try { await stripe.accounts.retrieve(accountId); } catch (e) {
        const err = e as { code?: string; statusCode?: number; message?: string };
        if (err.code === 'resource_missing' || err.statusCode === 404 || /no such account/i.test(err.message ?? '') || err.code === 'account_invalid') accountId = null;
        else throw e;
      }
    }
    if (!accountId) {
      const acct = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: user.email,
        business_type: 'individual',
        capabilities: { transfers: { requested: true } },
        business_profile: { product_description: 'Independent auto repair and maintenance through EngiNear', mcc: '7538' },
        metadata: { supabase_user_id: user.id },
      });
      accountId = acct.id;
      await admin.from('mechanic_profiles').update({ stripe_account_id: accountId }).eq('id', user.id);
    }
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });
    return json({ url: link.url });
  }

  if (!accountId) return fail('Set up payouts first.');

  if (action === 'status') {
    const acct = await stripe.accounts.retrieve(accountId);
    const enabled = !!acct.payouts_enabled;
    if (enabled !== cp?.payouts_enabled) await admin.from('mechanic_profiles').update({ payouts_enabled: enabled }).eq('id', user.id);
    const ext = acct.external_accounts?.data?.[0] as { last4?: string; bank_name?: string; brand?: string; object?: string } | undefined;
    return json({ payoutsEnabled: enabled, detailsSubmitted: acct.details_submitted, method: ext ? `${ext.bank_name ?? ext.brand ?? 'Account'} ••${ext.last4}` : null });
  }

  if (action === 'dashboard') {
    // Stripe's Express dashboard is where mechanics change their bank account or debit card.
    try {
      const link = await stripe.accounts.createLoginLink(accountId);
      return json({ url: link.url });
    } catch (e) {
      // Not fully set up yet (or the dashboard isn't available): send them through Stripe's setup form instead.
      console.error('login link failed, using onboarding link', e);
      const link = await stripe.accountLinks.create({ account: accountId, refresh_url: refreshUrl, return_url: returnUrl, type: 'account_onboarding' });
      return json({ url: link.url, onboarding: true });
    }
  }

  if (action === 'balance') {
    const bal = await stripe.balance.retrieve({ stripeAccount: accountId });
    const sum = (arr: { amount: number; currency: string }[] | undefined) => (arr ?? []).filter((a) => a.currency === 'usd').reduce((s, a) => s + a.amount, 0);
    return json({
      availableCents: sum(bal.available),
      pendingCents: sum(bal.pending),
      instantAvailableCents: sum((bal as unknown as { instant_available?: { amount: number; currency: string }[] }).instant_available),
    });
  }

  if (action === 'instant_payout') {
    const bal = await stripe.balance.retrieve({ stripeAccount: accountId });
    const instant = ((bal as unknown as { instant_available?: { amount: number; currency: string }[] }).instant_available ?? [])
      .filter((a) => a.currency === 'usd').reduce((s, a) => s + a.amount, 0);
    if (instant < 100) return fail('Nothing is ready for instant cash-out yet. New earnings usually become available within a day.');
    try {
      const payout = await stripe.payouts.create({ amount: instant, currency: 'usd', method: 'instant' }, { stripeAccount: accountId });
      return json({ ok: true, amountCents: payout.amount, arrival: payout.arrival_date });
    } catch (e) {
      console.error('instant payout failed', e);
      return fail('Instant cash-out needs an eligible debit card on your payout account. Tap "Manage payouts" to add one.');
    }
  }

  return fail('Unknown action.');
  } catch (e) {
    console.error('stripe-connect', action, e);
    const msg = (e as { message?: string }).message ?? '';
    return fail(/platform profile|responsibilit|signed up for Connect/i.test(msg)
      ? 'Payout setup isn’t switched on yet. Please try again later.'
      : 'We couldn’t open payout setup. Please try again.', 500);
  }
});
