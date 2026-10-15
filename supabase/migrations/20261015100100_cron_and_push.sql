-- Background jobs: auto-approval every 10 minutes, and a phone push for every new notification.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule('auto-approve-jobs', '*/10 * * * *', $$select public.auto_approve_jobs()$$);

-- Push: each new notification calls the send-push server function.
-- Needs two Vault secrets: 'project_url' (https://<ref>.supabase.co) and 'send_push_secret'
-- (the same value as the SEND_PUSH_SECRET function secret).
create or replace function public.push_notification() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_url text; v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'send_push_secret';
  if v_url is null or v_secret is null then return new; end if;
  perform net.http_post(
    url := v_url || '/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    body := jsonb_build_object('type', 'INSERT', 'table', 'notifications', 'record', to_jsonb(new))
  );
  return new;
end $$;
revoke execute on function public.push_notification() from public, anon, authenticated;

create trigger notifications_push after insert on public.notifications
  for each row execute function public.push_notification();
