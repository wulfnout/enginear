// Starts a background check with Checkr for a mechanic who has consented.
// Checkr emails the mechanic a secure invitation to complete the check; results arrive via checkr-webhook.
import { admin, fail, getRole, getUser, handleOptions, json } from '../_shared/util.ts';

const CHECKR = 'https://api.checkr.com/v1';

Deno.serve(async (req) => {
  const pre = handleOptions(req); if (pre) return pre;
  const user = await getUser(req);
  if (!user) return fail('Please sign in again.', 401);
  if ((await getRole(user.id)) !== 'mechanic') return fail('Only mechanics need a background check.', 403);

  const { data: cp } = await admin.from('mechanic_profiles')
    .select('legal_name, zip, background_consent_at, background_check_id, verification_status, id_document_path, selfie_path')
    .eq('id', user.id).single();
  if (!cp?.background_consent_at) return fail('Please agree to the background check first.');
  if (!cp.id_document_path || !cp.selfie_path) return fail('Please upload your ID photo and a selfie first.');
  if (cp.background_check_id) return json({ ok: true, status: cp.verification_status });

  const key = Deno.env.get('CHECKR_API_KEY');
  if (!key) {
    // No screening partner configured yet: queue for manual review by your team.
    if (cp.verification_status !== 'approved') {
      await admin.from('mechanic_profiles').update({ verification_status: 'pending' }).eq('id', user.id);
    }
    return json({ ok: true, status: cp.verification_status === 'approved' ? 'approved' : 'pending', manual: true });
  }
  const auth = 'Basic ' + btoa(`${key}:`);
  const [first, ...rest] = (cp.legal_name ?? '').trim().split(/\s+/);

  const cand = await fetch(`${CHECKR}/candidates`, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, first_name: first, last_name: rest.join(' ') || first, zipcode: cp.zip, metadata: { supabase_user_id: user.id } }),
  });
  if (!cand.ok) { console.error('checkr candidate', await cand.text()); return fail('We couldn’t start your background check. Please try again later.', 502); }
  const candidate = await cand.json();

  const inv = await fetch(`${CHECKR}/invitations`, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      candidate_id: candidate.id,
      package: Deno.env.get('CHECKR_PACKAGE') ?? 'tasker_standard',
      work_locations: [{ country: 'US', zipcode: cp.zip }],
    }),
  });
  if (!inv.ok) { console.error('checkr invitation', await inv.text()); return fail('We couldn’t start your background check. Please try again later.', 502); }

  await admin.from('mechanic_profiles').update({ background_check_id: candidate.id, verification_status: 'pending' }).eq('id', user.id);
  return json({ ok: true, status: 'pending' });
});
