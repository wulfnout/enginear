// Receives Checkr report results and updates the mechanic's verification status.
// Configure in Checkr: webhook URL /functions/v1/checkr-webhook, event report.completed.
import { admin, notify } from '../_shared/util.ts';

async function validSignature(body: string, sig: string | null): Promise<boolean> {
  const secret = Deno.env.get('CHECKR_WEBHOOK_SECRET');
  if (!secret || !sig) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return hex === sig;
}

Deno.serve(async (req) => {
  const body = await req.text();
  if (!(await validSignature(body, req.headers.get('x-checkr-signature')))) return new Response('Bad signature', { status: 400 });
  const event = JSON.parse(body);
  if (event.type === 'report.completed') {
    const report = event.data?.object ?? {};
    const candidateId = report.candidate_id;
    const status = report.result === 'clear' ? 'approved' : 'needs_review';
    const { data: cp } = await admin.from('mechanic_profiles').update({ verification_status: status })
      .eq('background_check_id', candidateId).select('id').single();
    if (cp) {
      await notify(cp.id,
        status === 'approved' ? 'You’re verified!' : 'Background check update',
        status === 'approved' ? 'Your Verified badge is now on your profile.' : 'Our team is reviewing your background check and will contact you.');
    }
  }
  return new Response('ok');
});
