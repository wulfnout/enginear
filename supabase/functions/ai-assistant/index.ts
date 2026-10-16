// AI Help Assistant. Answers questions about the app and the user's own account using Claude.
import { admin, fail, getUser, handleOptions, json } from '../_shared/util.ts';

type Turn = { role: 'user' | 'assistant'; content: string };

const APP_GUIDE = `
EngiNear connects car owners (clients) with independent, ID-verified and background-checked mechanics. Mechanics work mobile (they come to the car), at their own shop, or both.
CLIENT APP. Bottom tabs: Home, Find, Parts, Bookings, Me. Spending is in Me.
- Parts tab: pick a car from My garage, browse common parts by job with tips on what to buy, see new and used listings (eBay Motors, when enabled), open a search at stores (RockAuto, AutoZone, O'Reilly, Advance, NAPA, Amazon, eBay, Car-Part.com), or tap "Have a mechanic get & install it" to book a mechanic who buys the part and adds it to a quote.
- My garage (Home, or Me > My garage) holds the client's cars: year, make, model, mileage, VIN. Each booking is for one car.
- Book: Home > "Book a mechanic" (service, car, come to me / take it to a shop / either, describe the problem, day, time), then pick a mechanic or "Any available mobile mechanic". Or open a mechanic and tap "Book".
- Pricing is set by each mechanic per service, one of three ways: Flat price; Hourly + parts (labor rate x booked hours); Diagnose, then quote (a diagnostic fee first, then a parts and labor quote). Open requests to any mechanic are diagnose-then-quote with a $49 diagnostic fee.
- Quotes: when a mechanic finds parts or work needed, they send a quote in the app listing every part and labor line. The client approves or declines it under Bookings. Nothing is added to the bill unless the client approves. A 6% service and trust fee applies. First-booking promo FIRSTFIX10 = $10 off.
- Check-in: for mobile jobs the mechanic taps "I've arrived" and the client confirms. For shop jobs the client taps "I dropped off my car" and the mechanic confirms. Work can't begin until then.
- When the work is done the client checks the car with a checklist (or from the mechanic's photos if not there) and taps "The work is done". The card is charged after that. If the client doesn't respond, the job is approved automatically 24 hours after the estimated end, unless they reported a problem.
- Cancel free up to 24 hours before; inside 24 hours a $15 fee goes to the mechanic. Bookings > Upcoming > Cancel. Change time: Bookings > Upcoming > Change time.
- Not happy: Report a problem during the job or within 48 hours after; our team works with the mechanic to make it right.
- Rate, review and tip: Bookings > Past. 100% of tips go to the mechanic. If a card is declined, Bookings shows Retry payment and Use a different card.
MECHANIC APP. Bottom tabs: Earnings, Find jobs, Schedule, Messages, Me.
- Setup has 8 steps: basic info, skills & certifications, prices (labor rate, diagnostic fee, flat/hourly/quote per service, labor warranty), where you work (mobile radius and/or shop address), availability, ID + selfie + background check, EngiNear 101 quiz, payouts (Stripe).
- Accept jobs in Find jobs. In Schedule follow the steps: check in, begin, send quotes ("Quote extra parts or work"), then "Finish job & get paid" once the client approves. Hourly jobs also wait for the booked time.
- Pay is sent to the mechanic's Stripe account when the job is finished. Mechanics keep 90% of labor and diagnostic fees and 100% of parts and tips. No lead fees or subscriptions. Instant cash-out to a debit card is available from Earnings for a small Stripe fee.
- Me > My prices and Me > Where I work change pricing and location any time.
EVERYONE. Me > Display has Text size and Appearance. Tap your photo in Me to change it. Safety center is in Me. Emergencies: call 911 first. EngiNear can't diagnose cars over chat; for safety issues (brakes failing, smoke, fuel smell) tell the user to stop driving and get help.
Human support: ${Deno.env.get('SUPPORT_EMAIL') ?? 'enginearsupport@gmail.com'}.`;

const usd = (c: number) => `$${(c / 100).toFixed(2)}`;

async function userContext(userId: string): Promise<string> {
  const { data: profile } = await admin.from('profiles').select('role, full_name').eq('id', userId).single();
  if (!profile) return 'Unknown user.';
  const lines = [`Name: ${profile.full_name}. Account type: ${profile.role}.`];
  if (profile.role === 'client') {
    const { data: cp } = await admin.from('client_profiles').select('*').eq('id', userId).single();
    lines.push(`Prefers: ${cp?.prefers}. Address on file: ${cp?.address ? 'yes' : 'no'}. Card saved: ${cp?.card_last4 ? `${cp.card_brand} ending ${cp.card_last4}` : 'no'}.`);
    const { data: cars } = await admin.from('vehicles').select('year, make, model, mileage').eq('client_id', userId).limit(10);
    for (const v of cars ?? []) lines.push(`Car: ${v.year} ${v.make} ${v.model}${v.mileage ? `, ${v.mileage} miles` : ''}.`);
    const { data: bks } = await admin.from('bookings')
      .select('service, status, scheduled_at, total_cents, tip_cents, pricing, location_type, vehicle_label, mechanic:profiles!bookings_mechanic_id_fkey(full_name)')
      .eq('client_id', userId).order('scheduled_at', { ascending: false }).limit(15);
    for (const b of bks ?? []) {
      // deno-lint-ignore no-explicit-any
      const cl = (b as any).mechanic?.full_name ?? 'not assigned yet';
      lines.push(`Booking: ${b.service}, ${b.status}, ${new Date(b.scheduled_at).toUTCString()}, mechanic ${cl}, ${b.vehicle_label}, ${b.location_type}, pricing ${b.pricing}, total so far ${usd(b.total_cents + b.tip_cents)}.`);
    }
    const { data: top } = await admin.from('mechanic_directory').select('full_name, shop_name, work_mode, hourly_rate, diag_fee, rating, rating_count, services, certifications, same_day')
      .order('rating', { ascending: false }).limit(8);
    for (const c of top ?? []) lines.push(`Mechanic available: ${c.full_name}${c.shop_name ? ` (${c.shop_name})` : ''}, ${c.work_mode}, $${c.hourly_rate}/hr labor, $${c.diag_fee} diagnosis, ${c.rating} stars (${c.rating_count}), ${c.services.join('/')}${c.certifications.length ? `, ${c.certifications.join('/')}` : ''}${c.same_day ? ', same-day' : ''}.`);
  } else {
    const { data: cp } = await admin.from('mechanic_profiles').select('*').eq('id', userId).single();
    lines.push(`Setup complete: ${cp?.onboarding_complete}. Steps done: ${Object.keys(cp?.onboarding_steps ?? {}).join(', ') || 'none'}. Verification: ${cp?.verification_status}. Payouts enabled: ${cp?.payouts_enabled}. Labor $${cp?.hourly_rate}/hr, diagnosis $${cp?.diag_fee}. Works: ${cp?.work_mode}. Rating ${cp?.rating} (${cp?.rating_count}). Jobs done ${cp?.jobs_completed}. Online: ${cp?.is_online}. Weekly goal $${cp?.weekly_goal}.`);
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
    const { data: done } = await admin.from('bookings').select('mechanic_payout_cents, tip_cents, completed_at')
      .eq('mechanic_id', userId).eq('status', 'completed').gte('completed_at', weekAgo);
    const week = (done ?? []).reduce((s, b) => s + b.mechanic_payout_cents + b.tip_cents, 0);
    lines.push(`Earned in the last 7 days: ${usd(week)}.`);
    const { data: up } = await admin.from('bookings').select('service, status, scheduled_at, mechanic_payout_cents, area, vehicle_label, location_type')
      .eq('mechanic_id', userId).in('status', ['confirmed', 'in_progress', 'requested']).order('scheduled_at').limit(10);
    for (const b of up ?? []) lines.push(`Job: ${b.service} on ${b.vehicle_label}, ${b.status}, ${new Date(b.scheduled_at).toUTCString()}, ${b.location_type}, ${b.area ?? ''}, pays ${usd(b.mechanic_payout_cents)} so far.`);
    const { count } = await admin.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'open');
    lines.push(`Open jobs on the platform right now: ${count ?? 0}.`);
  }
  return lines.join('\n');
}

Deno.serve(async (req) => {
  const pre = handleOptions(req); if (pre) return pre;
  const user = await getUser(req);
  if (!user) return fail('Please sign in again.', 401);

  const { messages, timezone } = (await req.json()) as { messages: Turn[]; timezone?: string };
  const history = (messages ?? []).filter((m) => m.content?.trim()).slice(-12);
  while (history.length && history[0].role !== 'user') history.shift();
  if (!history.length) return fail('Ask a question to get started.');

  const system = `You are the EngiNear Help Assistant inside the EngiNear mobile app.
Style: warm, plain and short. 2 to 5 short sentences. Everyday words a teenager or a grandparent can follow. When giving steps, name the exact buttons and tabs, and you may bold them with **double asterisks**. No tables.
Rules: Only state facts about the person's account that appear in ACCOUNT below; never invent bookings, mechanics, prices or amounts. Never ask for passwords, full card numbers or bank numbers. If someone may be in danger, tell them to call 911 first, then use Me > Safety center. If you can't resolve something, give the human support email.
Today is ${new Date().toUTCString()}${timezone ? ` (user time zone ${timezone})` : ''}.

APP GUIDE:${APP_GUIDE}

ACCOUNT:
${await userContext(user.id)}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') ?? '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-haiku-5-5',
      max_tokens: 600,
      system,
      messages: history,
    }),
  });
  if (!res.ok) {
    console.error('anthropic error', res.status, await res.text());
    return fail('The assistant is busy right now. Please try again in a minute.', 502);
  }
  const data = await res.json();
  // deno-lint-ignore no-explicit-any
  const text = (data.content ?? []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n').trim();
  return json({ reply: text || 'Sorry, I didn’t catch that. Could you ask another way?' });
});
