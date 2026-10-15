// Sends a phone push notification for every new row in public.notifications.
// Set up in Supabase: Database > Webhooks > new webhook on INSERT into public.notifications,
// type "Supabase Edge Function" -> send-push, with header  x-push-secret: <SEND_PUSH_SECRET>.
import { admin } from '../_shared/util.ts';

Deno.serve(async (req) => {
  if (req.headers.get('x-push-secret') !== Deno.env.get('SEND_PUSH_SECRET')) return new Response('Forbidden', { status: 403 });
  const payload = await req.json();
  const n = payload.record;
  if (!n?.user_id) return new Response('ignored');

  const { data: p } = await admin.from('profiles').select('expo_push_token').eq('id', n.user_id).single();
  if (!p?.expo_push_token) return new Response('no token');

  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
  const token = Deno.env.get('EXPO_ACCESS_TOKEN');
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers,
    body: JSON.stringify({ to: p.expo_push_token, title: n.title, body: n.body, data: n.data ?? {}, sound: 'default' }),
  });
  const out = await res.json();
  if (out?.data?.status === 'error' && out.data.details?.error === 'DeviceNotRegistered') {
    await admin.from('profiles').update({ expo_push_token: null }).eq('id', n.user_id);
  }
  return new Response('sent');
});
