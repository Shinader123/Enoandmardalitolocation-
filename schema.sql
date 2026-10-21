-- Enoandmardalitolocation schema. Run in Supabase SQL Editor.
create extension if not exists pgcrypto;
create extension if not exists btree_gist;

do $$ begin
  create type public.user_role as enum ('customer','admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.reservation_status as enum ('pending','approved','rejected','cancelled');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.payment_status as enum ('pending','paid','failed','refunded');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now()
);
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  image_url text,
  price numeric(12,2) not null check (price > 0),
  currency text not null default 'USD' check (currency in ('USD','HTG')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  start_date date not null,
  end_date date not null,
  pickup_location text not null default 'Okay',
  notes text,
  status public.reservation_status not null default 'pending',
  created_at timestamptz not null default now(),
  constraint reservation_dates_valid check (end_date > start_date)
);
-- Approved reservations for the same vehicle cannot overlap.
create index if not exists reservations_vehicle_dates_idx on public.reservations(vehicle_id,start_date,end_date);
do $$ begin
  alter table public.reservations add constraint no_overlapping_approved_reservations
  exclude using gist (vehicle_id with =, daterange(start_date,end_date,'[)') with &&)
  where (status = 'approved');
exception when duplicate_object then null; end $$;
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  method text not null check (method in ('paypal','card','manual_transfer')),
  reference text,
  provider_order_id text unique,
  provider_capture_id text unique,
  amount numeric(12,2),
  currency text not null default 'USD',
  status public.payment_status not null default 'pending',
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,full_name,role) values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), 'customer') on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role='admin');
$$;

alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.reservations enable row level security;
alter table public.payments enable row level security;

drop policy if exists "profiles read own or admin" on public.profiles;
create policy "profiles read own or admin" on public.profiles for select to authenticated using (id=auth.uid() or public.is_admin());
drop policy if exists "profiles update own name" on public.profiles;
create policy "profiles update own name" on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid() and role='customer');
drop policy if exists "vehicles visible to everyone" on public.vehicles;
create policy "vehicles visible to everyone" on public.vehicles for select to anon,authenticated using (active=true or public.is_admin());
drop policy if exists "admin manages vehicles" on public.vehicles;
create policy "admin manages vehicles" on public.vehicles for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "customers see own reservations" on public.reservations;
create policy "customers see own reservations" on public.reservations for select to authenticated using (user_id=auth.uid() or public.is_admin());
drop policy if exists "customers create own pending reservations" on public.reservations;
create policy "customers create own pending reservations" on public.reservations for insert to authenticated with check (user_id=auth.uid() and status='pending');
drop policy if exists "admin updates reservations" on public.reservations;
create policy "admin updates reservations" on public.reservations for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "users see own payments or admin" on public.payments;
create policy "users see own payments or admin" on public.payments for select to authenticated using (user_id=auth.uid() or public.is_admin());
drop policy if exists "customers submit transfer references" on public.payments;
create policy "customers submit transfer references" on public.payments for insert to authenticated with check (user_id=auth.uid() and method='manual_transfer' and status='pending' and exists(select 1 from public.reservations r where r.id=reservation_id and r.user_id=auth.uid() and r.status='approved'));
drop policy if exists "admin manages payments" on public.payments;
create policy "admin manages payments" on public.payments for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Seed a wider starter fleet once. Admin can add more vehicle models and edit names/prices later.
insert into public.vehicles(name,description,price,currency,active)
select v.name,v.description,v.price,'USD',true from (values
 ('Toyota Land Cruiser (Zo Reken)','Gwo SUV pou vwayaj ak fanmi.',150::numeric),
 ('Toyota RAV4','Konfòtab pou deplasman chak jou.',80::numeric),
 ('Honda CR-V','SUV pratik pou vil ak wout.',80::numeric),
 ('Suzuki Vitara','SUV konpak pou deplasman.',80::numeric),
 ('Hyundai Tucson','SUV modèn pou vil ak vwayaj.',80::numeric),
 ('Kia Sportage','SUV konfòtab ak espas pou pasaje.',80::numeric),
 ('Nissan X-Trail','SUV fanmi pou vwayaj pi long.',90::numeric),
 ('Mitsubishi Montero Sport','SUV solid pou wout ak deplasman andeyò vil.',100::numeric),
 ('Toyota Prado','SUV premium pou plis konfò.',130::numeric),
 ('Nissan Patrol','Gwo SUV pou gwoup ak vwayaj.',130::numeric),
 ('Toyota Hilux (Pickup)','Pickup solid pou travay ak deplasman.',100::numeric),
 ('Ford Ranger (Pickup)','Pickup pou chay ak vwayaj.',100::numeric),
 ('Mitsubishi L200 (Pickup)','Pickup itil pou travay ak wout andeyò vil.',90::numeric),
 ('Toyota Corolla (Sedan)','Machin ekonomik pou deplasman nan vil.',60::numeric),
 ('Hyundai Elantra (Sedan)','Sedan konfòtab pou chak jou.',60::numeric),
 ('Honda Civic (Sedan)','Sedan modèn pou deplasman.',65::numeric),
 ('Hyundai Staria (Van)','Van ak plis plas pou pasaje.',120::numeric),
 ('Toyota Hiace (Minibus)','Minibus pou gwoup ak transpò pasaje.',140::numeric)
) as v(name,description,price)
where not exists(select 1 from public.vehicles x where x.name=v.name);

-- IMPORTANT: after creating your account in the website, get its UUID from Authentication > Users.
-- Run the following manually with your real user UUID; never let customers set their own role.
-- update public.profiles set role='admin' where id='PUT-YOUR-AUTH-USER-UUID-HERE';
