-- Optional tip to EngiNear itself (separate from the mechanic's tip). Kept by the platform.
alter table public.bookings add column if not exists platform_tip_cents integer not null default 0;
