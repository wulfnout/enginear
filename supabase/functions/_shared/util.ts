// Shared helpers for EngiNear edge functions (Deno).
import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2.49.4';
import Stripe from 'npm:stripe@17.7.0';

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

export function fail(message: string, status = 400): Response {
  return json({ error: message }, status);
}

export const admin: SupabaseClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

/** Returns the signed-in user for this request, or null. */
export async function getUser(req: Request): Promise<User | null> {
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  if (!token) return null;
  const { data } = await admin.auth.getUser(token);
  return data.user ?? null;
}

export async function getRole(userId: string): Promise<'client' | 'mechanic' | null> {
  const { data } = await admin.from('profiles').select('role').eq('id', userId).single();
  return (data?.role as 'client' | 'mechanic') ?? null;
}

export const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2025-02-24.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});

export const cryptoProvider = Stripe.createSubtleCryptoProvider();

export async function notify(userId: string, title: string, body: string, data: Record<string, unknown> = {}) {
  await admin.from('notifications').insert({ user_id: userId, title, body, data });
}

export function handleOptions(req: Request): Response | null {
  return req.method === 'OPTIONS' ? new Response('ok', { headers: cors }) : null;
}
