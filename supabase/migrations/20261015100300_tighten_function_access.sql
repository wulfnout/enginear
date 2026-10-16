-- Signed-out visitors can only call platform_stats. Trigger and internal functions can't be called from the app.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig, p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
  loop
    if f.proname <> 'platform_stats' then
      execute format('revoke execute on function %s from public, anon', f.sig);
    end if;
    if f.proname in ('handle_new_user', 'on_booking_change', 'on_message', 'push_notification',
                     'prevent_role_change', 'protect_mechanic_fields', 'protect_client_fields',
                     'auto_approve_jobs', 'price_booking', 'check_push_secret') then
      execute format('revoke execute on function %s from authenticated', f.sig);
    else
      execute format('grant execute on function %s to authenticated', f.sig);
    end if;
  end loop;
end $$;
grant execute on function public.check_push_secret(text) to service_role;

alter function public.vehicle_label(public.vehicles) set search_path = public;
alter function public.prevent_role_change() set search_path = public;
alter function public.protect_mechanic_fields() set search_path = public;
alter function public.protect_client_fields() set search_path = public;
alter function public.miles_between(double precision, double precision, double precision, double precision) set search_path = public;
alter function public.service_fee_rate() set search_path = public;
alter function public.platform_commission_rate() set search_path = public;
alter function public.open_request_diag_cents() set search_path = public;
alter function public.price_booking(public.bookings) set search_path = public;
