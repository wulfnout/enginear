-- Works anywhere in the US: times in notifications use the client's own time zone
-- (where the job happens) instead of always Central time.
alter table public.profiles add column if not exists timezone text;

-- A user's time zone, or Central time if they haven't opened the app since this change.
create or replace function public.user_tz(p_user uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select p.timezone from public.profiles p
      where p.id = p_user and exists (select 1 from pg_timezone_names t where t.name = p.timezone)),
    'America/Chicago')
$$;
revoke execute on function public.user_tz(uuid) from public, anon;

-- Swap the fixed time zone in the two functions that write times into notifications.
do $$
declare def text;
begin
  def := pg_get_functiondef('public.on_booking_change()'::regprocedure);
  def := replace(def, $q$at time zone 'America/Chicago'$q$, 'at time zone public.user_tz(new.client_id)');
  execute def;
  def := pg_get_functiondef('public.auto_approve_jobs()'::regprocedure);
  def := replace(def, $q$at time zone 'America/Chicago'$q$, 'at time zone public.user_tz(b.client_id)');
  execute def;
end $$;
