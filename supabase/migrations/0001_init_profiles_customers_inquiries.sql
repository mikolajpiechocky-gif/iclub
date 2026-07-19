-- =====================================================================
-- iClub Management — migracja MVP 1
-- Zakres: profiles, customers, inquiries (+ enumy, RLS, triggery).
-- Pozostałe encje (reservations, jobs, tents, equipment, job_assignments,
-- checklist_items, payments, costs) są opisane w docs/DATA_MODEL_MVP1.md
-- i zostaną dodane w kolejnych migracjach — NIE tworzymy ich na zapas.
-- =====================================================================

-- --- Rozszerzenia ---
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- --- Typy wyliczeniowe (kody techniczne EN; etykiety PL w interfejsie) ---
do $$ begin
  create type public.user_role as enum ('OWNER', 'EMPLOYEE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.customer_type as enum ('PRIVATE', 'COMPANY');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.inquiry_status as enum ('NEW', 'CONTACTED', 'OFFER_SENT', 'WAITING', 'WON', 'LOST');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.inquiry_source as enum ('OLX', 'PHONE', 'WEBSITE_FORM', 'REFERRAL', 'FACEBOOK', 'INSTAGRAM', 'OTHER');
exception when duplicate_object then null; end $$;

-- --- Funkcja: automatyczna aktualizacja updated_at ---
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =====================================================================
-- profiles — profil użytkownika powiązany z auth.users
-- =====================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role public.user_role not null default 'EMPLOYEE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Automatyczne utworzenie profilu przy rejestracji użytkownika w Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'EMPLOYEE'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Pomocnicza funkcja: czy bieżący użytkownik jest właścicielem (OWNER).
create or replace function public.is_owner()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'OWNER'
  );
$$;

-- =====================================================================
-- customers — klienci (osoba prywatna lub firma)
-- =====================================================================
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  type public.customer_type not null default 'PRIVATE',
  name text not null,                 -- imię i nazwisko albo nazwa firmy
  phone text,
  email text,
  city text,
  address text,                       -- opcjonalny
  tax_id text,                        -- NIP, opcjonalny
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_customers_name on public.customers (name);
create index if not exists idx_customers_created_at on public.customers (created_at desc);

drop trigger if exists trg_customers_updated_at on public.customers;
create trigger trg_customers_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

-- =====================================================================
-- inquiries — zapytania klientów
-- =====================================================================
create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  event_type text,                    -- rodzaj imprezy
  event_date date,
  location text,
  guests integer,
  tent_interest text,                 -- interesujący namiot / rozmiar
  package_interest text,              -- interesujący pakiet
  addons_note text,                   -- dodatki jako notatka
  source public.inquiry_source,
  status public.inquiry_status not null default 'NEW',
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_inquiries_customer on public.inquiries (customer_id);
create index if not exists idx_inquiries_status on public.inquiries (status);
create index if not exists idx_inquiries_created_at on public.inquiries (created_at desc);

drop trigger if exists trg_inquiries_updated_at on public.inquiries;
create trigger trg_inquiries_updated_at
  before update on public.inquiries
  for each row execute function public.set_updated_at();

-- =====================================================================
-- RLS (Row Level Security)
-- MVP 1: uwierzytelnieni użytkownicy (OWNER i EMPLOYEE) mogą zarządzać
-- klientami i zapytaniami. Rozdział uprawnień (np. dane poufne) doprecyzujemy
-- w kolejnych etapach.
-- =====================================================================
alter table public.profiles  enable row level security;
alter table public.customers enable row level security;
alter table public.inquiries enable row level security;

-- profiles: każdy zalogowany widzi profile (imiona); edycja własnego lub przez OWNER.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_owner())
  with check (id = auth.uid() or public.is_owner());

-- customers: pełny CRUD dla zalogowanych.
drop policy if exists customers_select on public.customers;
create policy customers_select on public.customers
  for select to authenticated using (true);

drop policy if exists customers_insert on public.customers;
create policy customers_insert on public.customers
  for insert to authenticated with check (true);

drop policy if exists customers_update on public.customers;
create policy customers_update on public.customers
  for update to authenticated using (true) with check (true);

drop policy if exists customers_delete on public.customers;
create policy customers_delete on public.customers
  for delete to authenticated using (true);

-- inquiries: pełny CRUD dla zalogowanych.
drop policy if exists inquiries_select on public.inquiries;
create policy inquiries_select on public.inquiries
  for select to authenticated using (true);

drop policy if exists inquiries_insert on public.inquiries;
create policy inquiries_insert on public.inquiries
  for insert to authenticated with check (true);

drop policy if exists inquiries_update on public.inquiries;
create policy inquiries_update on public.inquiries
  for update to authenticated using (true) with check (true);

drop policy if exists inquiries_delete on public.inquiries;
create policy inquiries_delete on public.inquiries
  for delete to authenticated using (true);
