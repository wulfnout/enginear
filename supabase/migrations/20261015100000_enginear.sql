-- EngiNear: a marketplace for car owners (clients) and independent mechanics.
-- Two separate account types (client, mechanic). A user's role is fixed at sign-up.
--
-- Pricing: each mechanic chooses, per service, one of
--   flat    a fixed price (oil change $79)
--   hourly  labor rate x booked hours, plus parts
--   quote   a diagnostic fee up front, then a parts + labor quote the client approves
-- Any job can get extra quotes (parts or labor found during the work); nothing is added to the
-- bill until the client approves it in the app.
--
-- Where: mobile (the mechanic comes to the client) or shop (the client brings the car in).
--
-- Job flow (the client controls it):
--   1. Check in: mobile -> mechanic taps "I've arrived", client confirms
--                shop   -> client taps "I dropped off my car", mechanic confirms
--   2. Mechanic begins the job (only after step 1)
--   3. Quotes for extra work are approved or declined by the client
--   4. Client reviews the work (checklist in person, or from photos) -> approved
--      (approved automatically 24 hours after the estimated end if the client never responds)
--   5. Mechanic finishes -> card charged, mechanic paid. Hourly jobs also wait for the booked time.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('client', 'mechanic');
create type public.booking_status as enum
  ('open', 'requested', 'confirmed', 'in_progress', 'completed', 'cancelled', 'declined');
create type public.payment_status as enum ('unpaid', 'paid', 'failed', 'refunded', 'not_charged');
create type public.verification_status as enum ('not_started', 'pending', 'approved', 'needs_review', 'rejected');

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  full_name text not null default '',
  phone text,
  avatar_url text,
  expo_push_token text,
  created_at timestamptz not null default now()
);

create table public.client_profiles (
  id uuid primary key references public.profiles (id) on delete cascade,
  onboarded boolean not null default false,
  needs text[] not null default '{}',
  priorities text[] not null default '{}',
  prefers text not null default 'either' check (prefers in ('mobile', 'shop', 'either')),
  monthly_budget integer not null default 200,
  address text,
  entry_notes text,            -- where the car is parked, gate codes
  lat double precision,
  lng double precision,
  stripe_customer_id text,
  payment_method_id text,
  card_brand text,
  card_last4 text,
  rating numeric(2,1) not null default 0,
  rating_count integer not null default 0
);

create table public.mechanic_profiles (
  id uuid primary key references public.profiles (id) on delete cascade,
  legal_name text,
  bio text not null default '',
  services text[] not null default '{}',
  service_prices jsonb not null default '{}'::jsonb,  -- {"Oil change": {"pricing":"flat","price":79,"hours":1}, ...}
  certifications text[] not null default '{}',
  specialties text[] not null default '{}',
  experience text,
  days text[] not null default '{}',
  time_blocks text[] not null default '{}',
  work_mode text not null default 'mobile' check (work_mode in ('mobile', 'shop', 'both')),
  shop_name text,
  shop_address text,
  radius_miles integer not null default 15,
  sources_parts boolean not null default true,
  warranty_days integer not null default 0 check (warranty_days between 0 and 730),
  same_day boolean not null default false,
  languages text not null default 'English',
  hourly_rate integer not null default 90 check (hourly_rate between 30 and 300),
  diag_fee integer not null default 60 check (diag_fee between 0 and 300),
  zip text,
  lat double precision,          -- the shop when they have one, otherwise their home base
  lng double precision,
  onboarding_steps jsonb not null default '{}'::jsonb,
  onboarding_complete boolean not null default false,
  standards_quiz_passed boolean not null default false,
  id_document_path text,
  selfie_path text,
  background_consent_at timestamptz,
  verification_status public.verification_status not null default 'not_started',
  background_check_id text,
  stripe_account_id text,
  payouts_enabled boolean not null default false,
  is_online boolean not null default false,
  weekly_goal integer not null default 1000,
  rating numeric(2,1) not null default 0,
  rating_count integer not null default 0,
  jobs_completed integer not null default 0,
  on_time_count integer not null default 0
);

-- A client's cars
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  year integer not null check (year between 1950 and 2100),
  make text not null check (length(make) between 1 and 40),
  model text not null check (length(model) between 1 and 60),
  trim text,
  mileage integer check (mileage between 0 and 2000000),
  vin text check (vin is null or vin ~ '^[A-HJ-NPR-Z0-9]{17}$'),
  plate text,
  color text,
  nickname text,
  created_at timestamptz not null default now()
);
create index vehicles_client_idx on public.vehicles (client_id, created_at);

create or replace function public.vehicle_label(v public.vehicles) returns text
language sql immutable as $$
  select v.year || ' ' || v.make || ' ' || v.model || coalesce(' ' || nullif(v.trim, ''), '')
$$;

-- Role is set once at sign-up and can never change. Keeps the two account types apart.
create or replace function public.prevent_role_change() returns trigger
language plpgsql as $$
begin
  if new.role <> old.role then
    raise exception 'Account type cannot be changed';
  end if;
  return new;
end $$;
create trigger profiles_role_immutable before update on public.profiles
  for each row execute function public.prevent_role_change();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role public.user_role;
begin
  v_role := coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'client')::public.user_role;
  insert into public.profiles (id, role, full_name)
  values (new.id, v_role, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  if v_role = 'client' then
    insert into public.client_profiles (id) values (new.id);
  else
    insert into public.mechanic_profiles (id) values (new.id);
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.my_role() returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

-- Fields a mechanic may not set on themselves (only the server can).
create or replace function public.protect_mechanic_fields() returns trigger
language plpgsql as $$
begin
  if current_user = 'authenticated' then
    new.verification_status := old.verification_status;
    new.background_check_id := old.background_check_id;
    new.stripe_account_id := old.stripe_account_id;
    new.payouts_enabled := old.payouts_enabled;
    new.rating := old.rating;
    new.rating_count := old.rating_count;
    new.jobs_completed := old.jobs_completed;
    new.on_time_count := old.on_time_count;
  end if;
  if new.onboarding_complete and not old.onboarding_complete then
    if not (new.onboarding_steps ?& array['info','skills','pricing','where','availability','verify','quiz','payouts'])
       or not new.standards_quiz_passed or new.id_document_path is null or new.selfie_path is null
       or new.background_consent_at is null or new.stripe_account_id is null or cardinality(new.services) = 0
       or (new.work_mode in ('shop', 'both') and coalesce(new.shop_address, '') = '') then
      raise exception 'Please finish every setup step first';
    end if;
  end if;
  return new;
end $$;
create trigger mechanic_profiles_protect before update on public.mechanic_profiles
  for each row execute function public.protect_mechanic_fields();

create or replace function public.protect_client_fields() returns trigger
language plpgsql as $$
begin
  if current_user = 'authenticated' then
    new.stripe_customer_id := old.stripe_customer_id;
    new.payment_method_id := old.payment_method_id;
    new.card_brand := old.card_brand;
    new.card_last4 := old.card_last4;
    new.rating := old.rating;
    new.rating_count := old.rating_count;
  end if;
  return new;
end $$;
create trigger client_profiles_protect before update on public.client_profiles
  for each row execute function public.protect_client_fields();

-- ---------------------------------------------------------------------------
-- Public mechanic directory (safe columns only)
-- ---------------------------------------------------------------------------
create view public.mechanic_directory as
select c.id, p.full_name, p.avatar_url, c.bio, c.services, c.service_prices, c.certifications, c.specialties,
       c.experience, c.radius_miles, c.work_mode, c.shop_name,
       case when c.work_mode in ('shop', 'both') then c.shop_address else null end as shop_address,
       c.sources_parts, c.warranty_days, c.same_day, c.languages, c.hourly_rate, c.diag_fee,
       c.lat, c.lng, c.rating, c.rating_count, c.jobs_completed,
       case when c.jobs_completed > 0 then round(100.0 * c.on_time_count / c.jobs_completed) else null end as on_time_pct,
       c.verification_status = 'approved' as verified, c.is_online, p.created_at
from public.mechanic_profiles c
join public.profiles p on p.id = c.id
where c.onboarding_complete;

create or replace function public.miles_between(lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision) returns double precision
language sql immutable as $$
  select case when lat1 is null or lat2 is null then null else
    3958.8 * 2 * asin(sqrt(power(sin(radians(lat2 - lat1) / 2), 2) +
      cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2))) end
$$;

create or replace function public.search_mechanics(
  p_lat double precision, p_lng double precision, p_radius double precision default 25,
  p_service text default null, p_query text default null)
returns table (
  id uuid, full_name text, avatar_url text, bio text, services text[], service_prices jsonb,
  certifications text[], specialties text[], experience text, work_mode text, shop_name text, shop_address text,
  radius_miles integer, sources_parts boolean, warranty_days integer, same_day boolean, languages text, hourly_rate integer, diag_fee integer,
  lat double precision, lng double precision, rating numeric, rating_count integer, jobs_completed integer,
  on_time_pct numeric, verified boolean, is_online boolean, distance_miles double precision)
language sql stable security definer set search_path = public as $$
  select d.id, d.full_name, d.avatar_url, d.bio, d.services, d.service_prices, d.certifications, d.specialties,
         d.experience, d.work_mode, d.shop_name, d.shop_address, d.radius_miles, d.sources_parts, d.warranty_days, d.same_day,
         d.languages, d.hourly_rate, d.diag_fee, d.lat, d.lng, d.rating, d.rating_count, d.jobs_completed,
         d.on_time_pct, d.verified, d.is_online,
         public.miles_between(p_lat, p_lng, d.lat, d.lng) as distance_miles
  from public.mechanic_directory d
  where (p_service is null or p_service = any (d.services))
    and (p_query is null or p_query = '' or
         d.full_name ilike '%' || p_query || '%' or
         coalesce(d.shop_name, '') ilike '%' || p_query || '%' or
         array_to_string(d.services, ' ') ilike '%' || p_query || '%' or
         array_to_string(d.specialties, ' ') ilike '%' || p_query || '%' or
         d.languages ilike '%' || p_query || '%')
    and (p_lat is null or d.lat is null or
         public.miles_between(p_lat, p_lng, d.lat, d.lng) <= greatest(p_radius, d.radius_miles))
  order by distance_miles nulls last, d.rating desc
  limit 100
$$;

-- ---------------------------------------------------------------------------
-- Saved mechanics
-- ---------------------------------------------------------------------------
create table public.saved_mechanics (
  client_id uuid references public.profiles (id) on delete cascade,
  mechanic_id uuid references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (client_id, mechanic_id)
);

-- ---------------------------------------------------------------------------
-- Bookings
-- ---------------------------------------------------------------------------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  mechanic_id uuid references public.profiles (id) on delete set null,
  status public.booking_status not null,
  service text not null,
  pricing text not null check (pricing in ('flat', 'hourly', 'quote')),
  location_type text not null default 'mobile' check (location_type in ('mobile', 'shop')),
  vehicle_id uuid references public.vehicles (id) on delete set null,
  vehicle_label text not null,
  hours numeric(4,1) not null check (hours between 0.5 and 12),
  scheduled_at timestamptz not null,
  notes text,                    -- what's wrong / what the client wants done
  address text not null,         -- client's address (mobile) or the shop's (shop)
  area text,
  lat double precision,
  lng double precision,
  hourly_rate integer not null default 0,
  base_cents integer not null,           -- flat price, hours x rate, or diagnostic fee
  labor_extra_cents integer not null default 0,  -- approved extra labor from quotes
  parts_cents integer not null default 0,        -- approved parts from quotes (passed to the mechanic in full)
  subtotal_cents integer not null,
  discount_cents integer not null default 0,
  promo_code text,
  fee_cents integer not null,
  total_cents integer not null,
  mechanic_payout_cents integer not null,
  tip_cents integer not null default 0,
  cancel_fee_cents integer not null default 0,
  payment_status public.payment_status not null default 'unpaid',
  payment_intent_id text,
  transfer_id text,
  client_reviewed boolean not null default false,
  mechanic_reviewed boolean not null default false,
  problem_report text,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  -- client-controlled job flow
  arrived_at timestamptz,
  arrival_confirmed_at timestamptz,
  photos_requested_at timestamptz,
  completion_requested_at timestamptz,
  completion_photos text[] not null default '{}',
  client_approved_at timestamptz,
  approval_method text check (approval_method in ('in_person', 'photos', 'auto')),
  client_checklist jsonb,
  review_reminder_at timestamptz
);
create index bookings_client_idx on public.bookings (client_id, scheduled_at desc);
create index bookings_mechanic_idx on public.bookings (mechanic_id, scheduled_at desc);
create index bookings_open_idx on public.bookings (status) where status = 'open';

-- Platform settings
create or replace function public.service_fee_rate() returns numeric language sql immutable as $$ select 0.06 $$;
create or replace function public.platform_commission_rate() returns numeric language sql immutable as $$ select 0.10 $$;
-- Diagnostic fee for an open request (no mechanic chosen yet)
create or replace function public.open_request_diag_cents() returns integer language sql immutable as $$ select 4900 $$;

-- Recompute the money columns from base + approved extras. Commission is on labor only;
-- parts go to the mechanic in full. Promo discounts come out of the platform's share.
create or replace function public.price_booking(b public.bookings) returns public.bookings
language plpgsql immutable as $$
declare v_labor integer := b.base_cents + b.labor_extra_cents;
begin
  b.subtotal_cents := v_labor + b.parts_cents;
  b.fee_cents := round(b.subtotal_cents * public.service_fee_rate());
  b.total_cents := greatest(b.subtotal_cents - b.discount_cents + b.fee_cents, 0);
  b.mechanic_payout_cents := round(v_labor * (1 - public.platform_commission_rate())) + b.parts_cents;
  return b;
end $$;

create or replace function public.create_booking(
  p_mechanic_id uuid, p_service text, p_vehicle uuid, p_location text, p_hours numeric,
  p_scheduled_at timestamptz, p_notes text default null, p_promo text default null)
returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  c public.client_profiles;
  m public.mechanic_directory;
  v public.vehicles;
  sp jsonb;
  v_prior integer;
  b public.bookings;
begin
  if public.my_role() is distinct from 'client' then raise exception 'Only client accounts can book'; end if;
  select * into c from public.client_profiles where id = auth.uid();
  if c.payment_method_id is null then raise exception 'Add a payment card before booking'; end if;
  if p_scheduled_at < now() + interval '2 hours' then raise exception 'Please choose a time at least 2 hours from now'; end if;
  select * into v from public.vehicles where id = p_vehicle and client_id = auth.uid();
  if v.id is null then raise exception 'Choose one of your vehicles'; end if;
  if p_location not in ('mobile', 'shop') then raise exception 'Choose where the work happens'; end if;

  b.id := gen_random_uuid();
  b.client_id := auth.uid();
  b.service := p_service;
  b.location_type := p_location;
  b.vehicle_id := v.id;
  b.vehicle_label := public.vehicle_label(v);
  b.scheduled_at := p_scheduled_at;
  b.notes := nullif(trim(coalesce(p_notes, '')), '');
  b.labor_extra_cents := 0;
  b.parts_cents := 0;

  if p_mechanic_id is null then
    -- Open request: any nearby mechanic can claim it. Diagnosis first, then a quote.
    if p_location <> 'mobile' then raise exception 'Open requests are for mobile service. Pick a shop to book shop service.'; end if;
    b.status := 'open';
    b.pricing := 'quote';
    b.hourly_rate := 0;
    b.hours := 1;
    b.base_cents := public.open_request_diag_cents();
  else
    select * into m from public.mechanic_directory where id = p_mechanic_id and p_service = any (services);
    if m.id is null then raise exception 'This mechanic does not offer that service'; end if;
    if p_location = 'mobile' and m.work_mode = 'shop' then raise exception 'This mechanic only works at their shop'; end if;
    if p_location = 'shop' and m.work_mode = 'mobile' then raise exception 'This mechanic is mobile only'; end if;
    b.mechanic_id := m.id;
    b.status := 'requested';
    b.hourly_rate := m.hourly_rate;
    sp := coalesce(m.service_prices -> p_service, '{}'::jsonb);
    b.pricing := coalesce(sp ->> 'pricing', 'quote');
    if b.pricing = 'flat' then
      if coalesce((sp ->> 'price')::numeric, 0) <= 0 then raise exception 'This mechanic hasn''t set a price for that service yet'; end if;
      b.base_cents := round((sp ->> 'price')::numeric * 100);
      b.hours := greatest(least(coalesce((sp ->> 'hours')::numeric, 1), 12), 0.5);
    elsif b.pricing = 'hourly' then
      b.hours := greatest(least(coalesce(p_hours, (sp ->> 'hours')::numeric, 1), 10), 1);
      b.base_cents := round(m.hourly_rate * b.hours * 100);
    else
      b.pricing := 'quote';
      b.hours := greatest(least(coalesce((sp ->> 'hours')::numeric, 1), 12), 0.5);
      b.base_cents := m.diag_fee * 100;
    end if;
  end if;

  if p_location = 'mobile' then
    if c.address is null then raise exception 'Add your address before booking mobile service'; end if;
    b.address := c.address; b.area := nullif(trim(split_part(c.address, ',', 2)), ''); b.lat := c.lat; b.lng := c.lng;
  else
    b.address := coalesce(nullif(m.shop_name, '') || ', ', '') || m.shop_address;
    b.area := nullif(trim(split_part(m.shop_address, ',', 2)), ''); b.lat := m.lat; b.lng := m.lng;
  end if;

  select count(*) into v_prior from public.bookings where client_id = auth.uid() and status <> 'cancelled';
  b.discount_cents := 0;
  if upper(coalesce(p_promo, '')) = 'FIRSTFIX10' then
    if v_prior > 0 then raise exception 'FIRSTFIX10 is for your first booking only'; end if;
    b.discount_cents := 1000; b.promo_code := 'FIRSTFIX10';
  elsif coalesce(p_promo, '') <> '' then
    raise exception 'That promo code is not valid';
  end if;

  b := public.price_booking(b);
  insert into public.bookings (id, client_id, mechanic_id, status, service, pricing, location_type, vehicle_id, vehicle_label,
    hours, scheduled_at, notes, address, area, lat, lng, hourly_rate, base_cents, labor_extra_cents, parts_cents,
    subtotal_cents, discount_cents, promo_code, fee_cents, total_cents, mechanic_payout_cents)
  values (b.id, b.client_id, b.mechanic_id, b.status, b.service, b.pricing, b.location_type, b.vehicle_id, b.vehicle_label,
    b.hours, b.scheduled_at, b.notes, b.address, b.area, b.lat, b.lng, b.hourly_rate, b.base_cents, 0, 0,
    b.subtotal_cents, b.discount_cents, b.promo_code, b.fee_cents, b.total_cents, b.mechanic_payout_cents)
  returning * into b;
  if p_mechanic_id is not null then
    insert into public.conversations (client_id, mechanic_id) values (auth.uid(), p_mechanic_id)
    on conflict (client_id, mechanic_id) do nothing;
  end if;
  return b;
end $$;

-- Mechanic accepts a request made to them, or claims an open job.
create or replace function public.accept_booking(p_booking uuid) returns public.bookings
language plpgsql security definer set search_path = public as $$
declare b public.bookings; cp public.mechanic_profiles;
begin
  select * into cp from public.mechanic_profiles where id = auth.uid();
  if cp.id is null or not cp.onboarding_complete then raise exception 'Finish your setup before accepting jobs'; end if;
  update public.bookings set mechanic_id = auth.uid(), status = 'confirmed'
  where id = p_booking
    and ((status = 'open' and mechanic_id is null and cp.work_mode in ('mobile', 'both'))
      or (status = 'requested' and mechanic_id = auth.uid()))
  returning * into b;
  if b.id is null then raise exception 'This job is no longer available'; end if;
  insert into public.conversations (client_id, mechanic_id) values (b.client_id, b.mechanic_id)
  on conflict (client_id, mechanic_id) do nothing;
  return b;
end $$;

-- Declining a direct request: mobile requests open up to other mechanics; shop requests are declined
-- (the price and place were specific to that shop).
create or replace function public.decline_booking(p_booking uuid) returns void
language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  select * into b from public.bookings where id = p_booking and mechanic_id = auth.uid() and status = 'requested';
  if b.id is null then return; end if;
  if b.location_type = 'mobile' then
    b.status := 'open'; b.mechanic_id := null; b.pricing := 'quote'; b.hourly_rate := 0; b.hours := 1;
    b.base_cents := public.open_request_diag_cents();
    b := public.price_booking(b);
    update public.bookings set status = 'open', mechanic_id = null, pricing = 'quote', hourly_rate = 0, hours = 1,
      base_cents = b.base_cents, subtotal_cents = b.subtotal_cents, fee_cents = b.fee_cents, total_cents = b.total_cents,
      mechanic_payout_cents = b.mechanic_payout_cents
    where id = b.id;
  else
    update public.bookings set status = 'declined' where id = b.id;
  end if;
end $$;

create or replace function public.reschedule_booking(p_booking uuid, p_when timestamptz) returns public.bookings
language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  if p_when < now() + interval '2 hours' then raise exception 'Please choose a time at least 2 hours from now'; end if;
  update public.bookings set scheduled_at = p_when
  where id = p_booking and client_id = auth.uid() and status in ('open', 'requested', 'confirmed') and arrived_at is null
  returning * into b;
  if b.id is null then raise exception 'This booking can''t be changed'; end if;
  return b;
end $$;

-- ---------------------------------------------------------------------------
-- Check in, begin, photos, approval
-- ---------------------------------------------------------------------------
-- Step 1a. Mobile: the mechanic says they've arrived. Shop: the client says they dropped off the car.
create or replace function public.check_in(p_booking uuid) returns public.bookings
language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  select * into b from public.bookings where id = p_booking and status = 'confirmed'
    and ((location_type = 'mobile' and mechanic_id = auth.uid()) or (location_type = 'shop' and client_id = auth.uid()));
  if b.id is null then raise exception 'This job isn''t ready to check in'; end if;
  if now() < b.scheduled_at - interval '60 minutes' then
    raise exception 'You can check in starting 1 hour before the start time';
  end if;
  update public.bookings set arrived_at = coalesce(arrived_at, now()) where id = b.id returning * into b;
  if b.location_type = 'mobile' then
    insert into public.notifications (user_id, title, body, data) values
      (b.client_id, 'Your mechanic is here',
       (select split_part(full_name, ' ', 1) from public.profiles where id = b.mechanic_id) || ' says they''ve arrived. Open the app to confirm so they can begin.',
       jsonb_build_object('booking_id', b.id));
  else
    insert into public.notifications (user_id, title, body, data) values
      (b.mechanic_id, 'Car dropped off',
       (select split_part(full_name, ' ', 1) from public.profiles where id = b.client_id) || ' says they dropped off their ' || b.vehicle_label || '. Confirm you have it so you can begin.',
       jsonb_build_object('booking_id', b.id));
  end if;
  return b;
end $$;

-- Step 1b. The other person confirms. Mobile: the client. Shop: the mechanic.
create or replace function public.confirm_check_in(p_booking uuid) returns public.bookings
language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  update public.bookings set arrival_confirmed_at = now()
  where id = p_booking and status = 'confirmed' and arrived_at is not null and arrival_confirmed_at is null
    and ((location_type = 'mobile' and client_id = auth.uid()) or (location_type = 'shop' and mechanic_id = auth.uid()))
  returning * into b;
  if b.id is null then raise exception 'There''s nothing to confirm right now'; end if;
  if b.location_type = 'mobile' then
    insert into public.notifications (user_id, title, body, data) values
      (b.mechanic_id, 'Arrival confirmed', 'Your client confirmed you''re there. You can begin the job.', jsonb_build_object('booking_id', b.id));
  else
    insert into public.notifications (user_id, title, body, data) values
      (b.client_id, 'Your car is checked in', 'The shop confirmed they have your ' || b.vehicle_label || '. We''ll let you know when work starts.', jsonb_build_object('booking_id', b.id));
  end if;
  return b;
end $$;

-- Step 2. Begin, only after check-in is confirmed.
create or replace function public.start_booking(p_booking uuid) returns public.bookings
language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  update public.bookings set status = 'in_progress', started_at = now()
  where id = p_booking and mechanic_id = auth.uid() and status = 'confirmed' and arrival_confirmed_at is not null
  returning * into b;
  if b.id is null then raise exception 'Check-in has to be confirmed before you can begin'; end if;
  return b;
end $$;

create or replace function public.request_photos(p_booking uuid) returns public.bookings
language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  update public.bookings set photos_requested_at = now()
  where id = p_booking and client_id = auth.uid() and status = 'in_progress' and client_approved_at is null
  returning * into b;
  if b.id is null then raise exception 'This job isn''t in progress'; end if;
  insert into public.notifications (user_id, title, body, data) values
    (b.mechanic_id, 'Photos requested', 'Your client isn''t there. When you''re done, send photos of the work (and the old parts) so they can approve it.', jsonb_build_object('booking_id', b.id));
  return b;
end $$;

create or replace function public.submit_completion_photos(p_booking uuid, p_paths text[]) returns public.bookings
language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  if coalesce(array_length(p_paths, 1), 0) = 0 then raise exception 'Add at least one photo'; end if;
  if exists (select 1 from unnest(p_paths) x where x not like p_booking::text || '/%') then raise exception 'Invalid photo'; end if;
  update public.bookings set completion_photos = p_paths, completion_requested_at = now()
  where id = p_booking and mechanic_id = auth.uid() and status = 'in_progress'
  returning * into b;
  if b.id is null then raise exception 'This job isn''t in progress'; end if;
  insert into public.notifications (user_id, title, body, data) values
    (b.client_id, 'Photos of the work are ready', 'Take a look and approve the job if everything looks good.', jsonb_build_object('booking_id', b.id));
  return b;
end $$;

-- Step 4. The client approves the finished work (in person with the checklist, or from photos).
create or replace function public.approve_completion(p_booking uuid, p_checklist jsonb, p_method text) returns public.bookings
language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  if p_method not in ('in_person', 'photos') then raise exception 'Invalid approval'; end if;
  if exists (select 1 from public.quotes q where q.booking_id = p_booking and q.status = 'sent') then
    raise exception 'Approve or decline the open quote first';
  end if;
  update public.bookings set client_approved_at = now(), client_checklist = p_checklist, approval_method = p_method
  where id = p_booking and client_id = auth.uid() and status = 'in_progress' and client_approved_at is null
    and (p_method = 'in_person' or coalesce(array_length(completion_photos, 1), 0) > 0)
  returning * into b;
  if b.id is null then raise exception 'This job can''t be approved right now'; end if;
  insert into public.notifications (user_id, title, body, data) values
    (b.mechanic_id, 'Work approved', 'Your client approved the work. You can finish the job and get paid.', jsonb_build_object('booking_id', b.id));
  return b;
end $$;

create or replace function public.report_problem(p_booking uuid, p_text text) returns void
language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  update public.bookings set problem_report = p_text
  where id = p_booking and client_id = auth.uid() and status in ('in_progress', 'completed')
  returning * into b;
  if b.id is null then raise exception 'You can report a problem once the work has started'; end if;
  insert into public.notifications (user_id, title, body, data)
  values (auth.uid(), 'We got your report', 'Our team will contact you within 24 hours to make it right.',
          jsonb_build_object('booking_id', p_booking));
  if b.status = 'in_progress' and b.mechanic_id is not null then
    insert into public.notifications (user_id, title, body, data) values
      (b.mechanic_id, 'Your client reported a problem', 'Please check your messages. Our team will help sort it out before the job is approved.',
       jsonb_build_object('booking_id', b.id));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Quotes: parts + labor the client approves before it's added to the bill
-- ---------------------------------------------------------------------------
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  mechanic_id uuid not null references public.profiles (id) on delete cascade,
  items jsonb not null,           -- [{"kind":"part"|"labor","desc":"Front brake pads","cents":8900}]
  labor_cents integer not null,
  parts_cents integer not null,
  total_cents integer not null,
  note text,
  status text not null default 'sent' check (status in ('sent', 'approved', 'declined', 'replaced')),
  decline_reason text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index quotes_booking_idx on public.quotes (booking_id, created_at);

create or replace function public.send_quote(p_booking uuid, p_items jsonb, p_note text default null) returns public.quotes
language plpgsql security definer set search_path = public as $$
declare b public.bookings; q public.quotes; it jsonb; v_labor integer := 0; v_parts integer := 0; v_cents integer;
begin
  select * into b from public.bookings where id = p_booking and mechanic_id = auth.uid()
    and status in ('confirmed', 'in_progress') and client_approved_at is null;
  if b.id is null then raise exception 'You can only send a quote on an active job'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Add at least one line'; end if;
  if jsonb_array_length(p_items) > 30 then raise exception 'That''s too many lines'; end if;
  for it in select * from jsonb_array_elements(p_items) loop
    if (it ->> 'kind') not in ('part', 'labor') or length(trim(coalesce(it ->> 'desc', ''))) not between 1 and 120 then
      raise exception 'Each line needs a description and a type (part or labor)';
    end if;
    v_cents := (it ->> 'cents')::integer;
    if v_cents is null or v_cents <= 0 or v_cents > 1000000 then raise exception 'Each line needs a price between $0.01 and $10,000'; end if;
    if it ->> 'kind' = 'part' then v_parts := v_parts + v_cents; else v_labor := v_labor + v_cents; end if;
  end loop;
  update public.quotes set status = 'replaced', decided_at = now() where booking_id = b.id and status = 'sent';
  insert into public.quotes (booking_id, mechanic_id, items, labor_cents, parts_cents, total_cents, note)
  values (b.id, auth.uid(), p_items, v_labor, v_parts, v_labor + v_parts, nullif(trim(coalesce(p_note, '')), ''))
  returning * into q;
  insert into public.notifications (user_id, title, body, data) values
    (b.client_id, 'New quote for your ' || b.vehicle_label,
     'Parts and labor: $' || to_char(q.total_cents / 100.0, 'FM999990.00') || '. Nothing is added to your bill unless you approve it.',
     jsonb_build_object('booking_id', b.id, 'quote_id', q.id));
  return q;
end $$;

create or replace function public.approve_quote(p_quote uuid) returns public.bookings
language plpgsql security definer set search_path = public as $$
declare q public.quotes; b public.bookings;
begin
  select * into q from public.quotes where id = p_quote and status = 'sent' for update;
  if q.id is null then raise exception 'This quote is no longer open'; end if;
  select * into b from public.bookings where id = q.booking_id and client_id = auth.uid()
    and status in ('confirmed', 'in_progress') for update;
  if b.id is null then raise exception 'This quote is no longer open'; end if;
  update public.quotes set status = 'approved', decided_at = now() where id = q.id;
  b.labor_extra_cents := b.labor_extra_cents + q.labor_cents;
  b.parts_cents := b.parts_cents + q.parts_cents;
  b := public.price_booking(b);
  update public.bookings set labor_extra_cents = b.labor_extra_cents, parts_cents = b.parts_cents,
    subtotal_cents = b.subtotal_cents, fee_cents = b.fee_cents, total_cents = b.total_cents,
    mechanic_payout_cents = b.mechanic_payout_cents
  where id = b.id returning * into b;
  insert into public.notifications (user_id, title, body, data) values
    (b.mechanic_id, 'Quote approved', 'Your client approved $' || to_char(q.total_cents / 100.0, 'FM999990.00') || ' for their ' || b.vehicle_label || '. Go ahead with the work.',
     jsonb_build_object('booking_id', b.id, 'quote_id', q.id));
  return b;
end $$;

create or replace function public.decline_quote(p_quote uuid, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
declare q public.quotes; b public.bookings;
begin
  select * into q from public.quotes where id = p_quote and status = 'sent';
  select * into b from public.bookings where id = q.booking_id and client_id = auth.uid();
  if q.id is null or b.id is null then raise exception 'This quote is no longer open'; end if;
  update public.quotes set status = 'declined', decided_at = now(), decline_reason = nullif(trim(coalesce(p_reason, '')), '') where id = q.id;
  insert into public.notifications (user_id, title, body, data) values
    (b.mechanic_id, 'Quote declined', 'Your client declined the quote' || coalesce(': ' || nullif(trim(coalesce(p_reason, '')), ''), '.') ||
     ' Only work they''ve approved is billed.', jsonb_build_object('booking_id', b.id, 'quote_id', q.id));
end $$;

-- ---------------------------------------------------------------------------
-- Reviews (two-way)
-- ---------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  subject_id uuid not null references public.profiles (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  tags text[] not null default '{}',
  body text,
  created_at timestamptz not null default now(),
  unique (booking_id, author_id)
);

create or replace function public.submit_review(p_booking uuid, p_rating integer, p_tags text[], p_body text)
returns void language plpgsql security definer set search_path = public as $$
declare b public.bookings; v_subject uuid;
begin
  select * into b from public.bookings where id = p_booking and status = 'completed'
    and (client_id = auth.uid() or mechanic_id = auth.uid());
  if b.id is null then raise exception 'You can only review a completed job'; end if;
  v_subject := case when b.client_id = auth.uid() then b.mechanic_id else b.client_id end;
  insert into public.reviews (booking_id, author_id, subject_id, rating, tags, body)
  values (p_booking, auth.uid(), v_subject, p_rating, coalesce(p_tags, '{}'), nullif(trim(p_body), ''));
  if b.client_id = auth.uid() then
    update public.bookings set client_reviewed = true where id = p_booking;
    update public.mechanic_profiles cp set
      rating = (select round(avg(rating)::numeric, 1) from public.reviews where subject_id = v_subject),
      rating_count = (select count(*) from public.reviews where subject_id = v_subject)
    where cp.id = v_subject;
  else
    update public.bookings set mechanic_reviewed = true where id = p_booking;
    update public.client_profiles cp set
      rating = (select round(avg(rating)::numeric, 1) from public.reviews where subject_id = v_subject),
      rating_count = (select count(*) from public.reviews where subject_id = v_subject)
    where cp.id = v_subject;
  end if;
end $$;

create or replace function public.mechanic_reviews(p_mechanic uuid)
returns table (id uuid, rating integer, tags text[], body text, created_at timestamptz, author text)
language sql stable security definer set search_path = public as $$
  select r.id, r.rating, r.tags, r.body, r.created_at,
         split_part(p.full_name, ' ', 1) ||
           coalesce(' ' || left(nullif(split_part(p.full_name, ' ', 2), ''), 1) || '.', '') as author
  from public.reviews r join public.profiles p on p.id = r.author_id
  join public.profiles s on s.id = r.subject_id and s.role = 'mechanic'
  where r.subject_id = p_mechanic
  order by r.created_at desc limit 50
$$;

-- ---------------------------------------------------------------------------
-- Messaging
-- ---------------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  mechanic_id uuid not null references public.profiles (id) on delete cascade,
  last_message text,
  last_message_at timestamptz not null default now(),
  unique (client_id, mechanic_id)
);
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index messages_conv_idx on public.messages (conversation_id, created_at);

create or replace function public.start_conversation(p_mechanic uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if public.my_role() is distinct from 'client' then raise exception 'Only clients can start a conversation'; end if;
  insert into public.conversations (client_id, mechanic_id) values (auth.uid(), p_mechanic)
  on conflict (client_id, mechanic_id) do update set client_id = excluded.client_id
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.on_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare c public.conversations; v_to uuid; v_name text;
begin
  select * into c from public.conversations where id = new.conversation_id;
  update public.conversations set last_message = left(new.body, 140), last_message_at = new.created_at where id = c.id;
  v_to := case when new.sender_id = c.client_id then c.mechanic_id else c.client_id end;
  select split_part(full_name, ' ', 1) into v_name from public.profiles where id = new.sender_id;
  insert into public.notifications (user_id, title, body, data)
  values (v_to, 'Message from ' || coalesce(v_name, 'EngiNear'), left(new.body, 140),
          jsonb_build_object('conversation_id', c.id));
  return new;
end $$;
create trigger messages_after_insert after insert on public.messages
  for each row execute function public.on_message();

-- ---------------------------------------------------------------------------
-- Notifications & safety
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null default '',
  data jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.safety_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete set null,
  category text not null,
  details text not null,
  trusted_contact text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create or replace function public.on_booking_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_when text := to_char(new.scheduled_at at time zone 'America/Chicago', 'Dy Mon DD "at" FMHH12:MI AM');
        v_mname text := (select split_part(full_name, ' ', 1) from public.profiles where id = new.mechanic_id);
begin
  if tg_op = 'INSERT' then
    if new.status = 'requested' then
      insert into public.notifications (user_id, title, body, data) values
        (new.mechanic_id, 'New job request', new.service || ' · ' || new.vehicle_label || ' · ' || v_when,
         jsonb_build_object('booking_id', new.id));
    elsif new.status = 'open' then
      insert into public.notifications (user_id, title, body, data)
      select cp.id, 'New job near you', new.service || ' · ' || new.vehicle_label || ' · ' || v_when,
             jsonb_build_object('booking_id', new.id)
      from public.mechanic_profiles cp
      where cp.is_online and cp.onboarding_complete and new.service = any (cp.services) and cp.work_mode in ('mobile', 'both')
        and coalesce(public.miles_between(cp.lat, cp.lng, new.lat, new.lng), 0) <= cp.radius_miles;
    end if;
    return new;
  end if;
  if new.status is distinct from old.status then
    if new.status = 'confirmed' then
      insert into public.notifications (user_id, title, body, data) values
        (new.client_id, 'Your booking is confirmed',
         case when new.location_type = 'shop' then 'Bring your ' || new.vehicle_label || ' to ' || v_mname || ' ' || v_when
              else v_mname || ' will come to you ' || v_when end,
         jsonb_build_object('booking_id', new.id));
    elsif new.status = 'in_progress' then
      insert into public.notifications (user_id, title, body, data) values
        (new.client_id, 'Work has started on your ' || new.vehicle_label, 'When it''s done, review the work in the app and tap "The work is done".', jsonb_build_object('booking_id', new.id));
    elsif new.status = 'completed' then
      insert into public.notifications (user_id, title, body, data) values
        (new.client_id, 'Job complete', 'How did it go? Tap to rate and tip.', jsonb_build_object('booking_id', new.id));
    elsif new.status = 'cancelled' and new.mechanic_id is not null then
      insert into public.notifications (user_id, title, body, data) values
        (new.mechanic_id, 'Job cancelled', 'The ' || lower(new.service) || ' on ' || v_when || ' was cancelled by the client.', jsonb_build_object('booking_id', new.id));
    elsif new.status = 'open' and old.status = 'requested' then
      insert into public.notifications (user_id, title, body, data) values
        (new.client_id, 'Finding you another mechanic', 'Your first choice wasn''t available, so we opened your request to other trusted mechanics nearby. You''ll get a quote after diagnosis.', jsonb_build_object('booking_id', new.id));
    elsif new.status = 'declined' then
      insert into public.notifications (user_id, title, body, data) values
        (new.client_id, 'Shop not available', 'That shop can''t take your ' || lower(new.service) || ' on ' || v_when || '. Try another time or another mechanic.', jsonb_build_object('booking_id', new.id));
    end if;
  elsif new.scheduled_at is distinct from old.scheduled_at and new.mechanic_id is not null then
    insert into public.notifications (user_id, title, body, data) values
      (new.mechanic_id, 'Job time changed', 'The ' || lower(new.service) || ' is now ' || v_when, jsonb_build_object('booking_id', new.id));
  end if;
  return new;
end $$;
create trigger bookings_notify after insert or update on public.bookings
  for each row execute function public.on_booking_change();

-- Mechanic's open job feed
create or replace function public.job_feed(p_lat double precision default null, p_lng double precision default null)
returns table (booking public.bookings, distance_miles double precision, client_rating numeric, client_first_name text)
language sql stable security definer set search_path = public as $$
  with me as (select * from public.mechanic_profiles where id = auth.uid())
  select b, public.miles_between(coalesce(p_lat, me.lat), coalesce(p_lng, me.lng), b.lat, b.lng),
         cl.rating, split_part(p.full_name, ' ', 1)
  from public.bookings b, me, public.client_profiles cl, public.profiles p
  where cl.id = b.client_id and p.id = b.client_id
    and b.scheduled_at > now()
    and ((b.status = 'open' and b.service = any (me.services) and me.work_mode in ('mobile', 'both')
          and coalesce(public.miles_between(coalesce(p_lat, me.lat), coalesce(p_lng, me.lng), b.lat, b.lng), 0) <= me.radius_miles + 5)
      or (b.status = 'requested' and b.mechanic_id = auth.uid()))
  order by b.status desc, b.scheduled_at
$$;

-- How many things have been posted so far (counts only; signed-out visitors may call it).
create or replace function public.platform_stats()
returns table (mechanics_live integer, requests_posted integer, total_posts integer)
language sql stable security definer set search_path = public as $$
  select c.n, r.n, c.n + r.n
  from (select count(*)::int as n from public.mechanic_profiles where onboarding_complete) c,
       (select count(*)::int as n from public.bookings) r
$$;
grant execute on function public.platform_stats() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Auto-approval: if the client never reviews, the mechanic still gets paid
-- ---------------------------------------------------------------------------
create or replace function public.auto_approve_jobs() returns void
language plpgsql security definer set search_path = public as $$
declare b public.bookings; v_auto text;
begin
  for b in
    select * from public.bookings
    where status = 'in_progress' and client_approved_at is null and review_reminder_at is null and problem_report is null
      and started_at is not null and now() >= started_at + hours * interval '1 hour'
  loop
    v_auto := to_char((b.started_at + b.hours * interval '1 hour' + interval '24 hours') at time zone 'America/Chicago', 'Dy Mon DD "at" FMHH12:MI AM');
    insert into public.notifications (user_id, title, body, data) values
      (b.client_id, 'Please review the work on your ' || b.vehicle_label,
       'Check the work and tap "The work is done", or report a problem. If we don''t hear from you, it''s approved automatically ' || v_auto || '.',
       jsonb_build_object('booking_id', b.id));
    update public.bookings set review_reminder_at = now() where id = b.id;
  end loop;

  for b in
    update public.bookings bk set client_approved_at = now(), approval_method = 'auto'
    where status = 'in_progress' and client_approved_at is null and problem_report is null
      and started_at is not null and now() >= started_at + hours * interval '1 hour' + interval '24 hours'
      and not exists (select 1 from public.quotes q where q.booking_id = bk.id and q.status = 'sent')
    returning *
  loop
    insert into public.notifications (user_id, title, body, data) values
      (b.mechanic_id, 'Job approved automatically', 'Your client didn''t respond within 24 hours, so the job was approved. You can finish it and get paid.',
       jsonb_build_object('booking_id', b.id)),
      (b.client_id, 'Job approved automatically', 'You didn''t review it within 24 hours, so it was approved. Something wrong? Report a problem within 48 hours.',
       jsonb_build_object('booking_id', b.id));
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.client_profiles enable row level security;
alter table public.mechanic_profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.saved_mechanics enable row level security;
alter table public.bookings enable row level security;
alter table public.quotes enable row level security;
alter table public.reviews enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.safety_reports enable row level security;

create policy "own profile" on public.profiles for select using (id = auth.uid());
create policy "counterpart profile" on public.profiles for select using (
  exists (select 1 from public.conversations c where (c.client_id = auth.uid() and c.mechanic_id = profiles.id)
                                                   or (c.mechanic_id = auth.uid() and c.client_id = profiles.id)));
create policy "update own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "own client profile" on public.client_profiles for select using (id = auth.uid());
create policy "update own client profile" on public.client_profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "own mechanic profile" on public.mechanic_profiles for select using (id = auth.uid());
create policy "update own mechanic profile" on public.mechanic_profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "own vehicles" on public.vehicles for all
  using (client_id = auth.uid()) with check (client_id = auth.uid() and public.my_role() = 'client');
create policy "mechanic sees vehicles on their jobs" on public.vehicles for select using (
  exists (select 1 from public.bookings b where b.vehicle_id = vehicles.id and b.mechanic_id = auth.uid()));

create policy "own saved" on public.saved_mechanics for all using (client_id = auth.uid()) with check (client_id = auth.uid());

create policy "client sees own bookings" on public.bookings for select using (client_id = auth.uid());
create policy "mechanic sees assigned bookings" on public.bookings for select using (mechanic_id = auth.uid());
-- All writes to bookings and quotes go through the functions above or server functions.

create policy "booking people see quotes" on public.quotes for select using (
  exists (select 1 from public.bookings b where b.id = quotes.booking_id and (b.client_id = auth.uid() or b.mechanic_id = auth.uid())));

create policy "see own reviews" on public.reviews for select using (author_id = auth.uid() or subject_id = auth.uid());

create policy "participants see conversation" on public.conversations for select
  using (client_id = auth.uid() or mechanic_id = auth.uid());
create policy "participants read messages" on public.messages for select using (
  exists (select 1 from public.conversations c where c.id = conversation_id and (c.client_id = auth.uid() or c.mechanic_id = auth.uid())));
create policy "participants send messages" on public.messages for insert with check (
  sender_id = auth.uid() and
  exists (select 1 from public.conversations c where c.id = conversation_id and (c.client_id = auth.uid() or c.mechanic_id = auth.uid())));
create policy "recipient marks read" on public.messages for update using (
  exists (select 1 from public.conversations c where c.id = conversation_id and (c.client_id = auth.uid() or c.mechanic_id = auth.uid())));

create policy "own notifications" on public.notifications for select using (user_id = auth.uid());
create policy "mark notifications read" on public.notifications for update using (user_id = auth.uid());

create policy "file safety report" on public.safety_reports for insert with check (reporter_id = auth.uid());
create policy "see own safety reports" on public.safety_reports for select using (reporter_id = auth.uid());

grant select on public.mechanic_directory to authenticated;
revoke all on public.mechanic_directory from anon;

-- Internal helpers are not callable from the app.
revoke execute on function public.auto_approve_jobs() from public, anon, authenticated;
revoke execute on function public.price_booking(public.bookings) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('verification', 'verification', false) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('job-photos', 'job-photos', false) on conflict do nothing;

create policy "avatar upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar update own folder" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar delete own folder" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar public read" on storage.objects for select using (bucket_id = 'avatars');

create policy "verification upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'verification' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "verification update own folder" on storage.objects for update to authenticated
  using (bucket_id = 'verification' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "verification read own" on storage.objects for select to authenticated
  using (bucket_id = 'verification' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "job photos upload by mechanic" on storage.objects for insert to authenticated
  with check (bucket_id = 'job-photos' and exists (
    select 1 from public.bookings b
    where b.id::text = (storage.foldername(name))[1] and b.mechanic_id = auth.uid() and b.status = 'in_progress'));
create policy "job photos read by client and mechanic" on storage.objects for select to authenticated
  using (bucket_id = 'job-photos' and exists (
    select 1 from public.bookings b
    where b.id::text = (storage.foldername(name))[1] and (b.mechanic_id = auth.uid() or b.client_id = auth.uid())));

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.bookings;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.quotes;
