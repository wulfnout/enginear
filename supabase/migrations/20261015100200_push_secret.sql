-- Random secret shared between the database trigger and the send-push function, kept in Vault.
-- (Applied once per project; replace the URL with the project's own.)
select vault.create_secret('https://pujquptettumkufegwil.supabase.co', 'project_url');
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'send_push_secret');

create or replace function public.check_push_secret(p_secret text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from vault.decrypted_secrets where name = 'send_push_secret' and decrypted_secret = p_secret)
$$;
revoke execute on function public.check_push_secret(text) from public, anon, authenticated;
grant execute on function public.check_push_secret(text) to service_role;
