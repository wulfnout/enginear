// Live new and used car parts from eBay Motors (eBay Browse API).
// Needs function secrets EBAY_CLIENT_ID and EBAY_CLIENT_SECRET (from developer.ebay.com, Production keys).
// Optional EBAY_CAMPAIGN_ID (eBay Partner Network) so purchases earn EngiNear a commission.
// Without keys it answers { configured: false } and the app shows store links instead.
import { fail, getUser, handleOptions, json } from '../_shared/util.ts';

const CLIENT_ID = Deno.env.get('EBAY_CLIENT_ID') ?? '';
const CLIENT_SECRET = Deno.env.get('EBAY_CLIENT_SECRET') ?? '';
const CAMPAIGN = Deno.env.get('EBAY_CAMPAIGN_ID') ?? '';
const PARTS_CATEGORY = '6030'; // eBay Motors > Parts & Accessories

let token: { value: string; expires: number } | null = null;

async function appToken(): Promise<string> {
  if (token && token.expires > Date.now() + 60_000) return token.value;
  const res = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + btoa(`${CLIENT_ID}:${CLIENT_SECRET}`),
    },
    body: 'grant_type=client_credentials&scope=' + encodeURIComponent('https://api.ebay.com/oauth/api_scope'),
  });
  if (!res.ok) throw new Error(`token ${res.status} ${await res.text()}`);
  const data = await res.json();
  token = { value: data.access_token, expires: Date.now() + Number(data.expires_in ?? 7200) * 1000 };
  return token.value;
}

type Car = { year?: number; make?: string; model?: string };

async function search(q: string, condition: 'new' | 'used' | 'any', car: Car | null, withFit: boolean) {
  const params = new URLSearchParams({ q, category_ids: PARTS_CATEGORY, limit: '30' });
  if (condition !== 'any') params.set('filter', `conditions:{${condition === 'new' ? 'NEW' : 'USED'}}`);
  if (withFit && car?.year && car.make && car.model) {
    params.set('compatibility_filter', `Year:${car.year};Make:${car.make};Model:${car.model}`);
  }
  const headers: Record<string, string> = {
    Authorization: `Bearer ${await appToken()}`,
    'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
  };
  if (CAMPAIGN) headers['X-EBAY-C-ENDUSERCTX'] = `affiliateCampaignId=${CAMPAIGN}`;
  const res = await fetch(`https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`, { headers });
  if (!res.ok) throw new Error(`search ${res.status} ${await res.text()}`);
  return await res.json();
}

Deno.serve(async (req) => {
  const pre = handleOptions(req); if (pre) return pre;
  const user = await getUser(req);
  if (!user) return fail('Please sign in again.', 401);
  if (!CLIENT_ID || !CLIENT_SECRET) return json({ configured: false, items: [] });

  const { query, condition = 'any', car = null } = await req.json() as { query?: string; condition?: 'new' | 'used' | 'any'; car?: Car | null };
  const q = String(query ?? '').trim().slice(0, 120);
  if (q.length < 2) return fail('Type what part you need.');

  try {
    // Try parts that fit the car first; some listings have no fitment data, so fall back to a plain search.
    let data = await search(q, condition, car, true).catch(() => null);
    let fitChecked = !!data;
    if (!data?.itemSummaries?.length) { data = await search(q, condition, car, false); fitChecked = false; }
    // deno-lint-ignore no-explicit-any
    const items = (data.itemSummaries ?? []).map((it: any) => ({
      id: it.itemId,
      title: it.title,
      price: it.price ? Number(it.price.value) : null,
      currency: it.price?.currency ?? 'USD',
      shipping: it.shippingOptions?.[0]?.shippingCost ? Number(it.shippingOptions[0].shippingCost.value) : null,
      condition: it.condition ?? null,
      image: it.image?.imageUrl ?? it.thumbnailImages?.[0]?.imageUrl ?? null,
      url: it.itemAffiliateWebUrl ?? it.itemWebUrl,
      seller: it.seller?.username ?? null,
      sellerRating: it.seller?.feedbackPercentage ?? null,
      fits: fitChecked ? (it.compatibilityMatch === 'EXACT' ? 'yes' : 'maybe') : 'unknown',
    }));
    return json({ configured: true, items, total: data.total ?? items.length });
  } catch (e) {
    console.error('parts-search', e);
    return fail('Couldn’t load parts right now. Try a store below instead.', 502);
  }
});
