-- =============================================================
-- iClub Management — KOMPLETNY SETUP BAZY (wklej całość i uruchom)
-- Zawiera migracje 0001 + 0002 + 0003 w poprawnej kolejności.
-- =============================================================

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


-- =====================================================================
-- iClub Management — migracja 0002: zasoby konfigurowalne
-- Namioty, pakiety i dodatki. Ceny i skład są w BAZIE (nie w kodzie) —
-- zgodnie z zasadą konfigurowalności (§51 instrukcji master).
-- =====================================================================

do $$ begin
  create type public.business_line as enum ('ICLUB', 'EQUIPMENT_RENTAL');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tent_status as enum ('AVAILABLE', 'RESERVED', 'ON_SITE', 'SERVICE', 'DAMAGED');
exception when duplicate_object then null; end $$;

-- --- Namioty ---
create table if not exists public.tents (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  size text,                       -- np. "6×8", "5,4×5,4"
  set_color text,                  -- zestaw: "Niebieski" / "Żółty"
  has_back_door boolean not null default false,  -- drzwi w tylnej ścianie (§14)
  status public.tent_status not null default 'AVAILABLE',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_tents_updated_at on public.tents;
create trigger trg_tents_updated_at before update on public.tents
  for each row execute function public.set_updated_at();

-- --- Pakiety (Standard / Premium / VIP) ---
create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  base_price numeric(10,2) not null default 0,  -- cena brutto, konfigurowalna
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_packages_updated_at on public.packages;
create trigger trg_packages_updated_at before update on public.packages
  for each row execute function public.set_updated_at();

-- --- Dodatki / dosprzedaż ---
create table if not exists public.addons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  price numeric(10,2) not null default 0,
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_addons_updated_at on public.addons;
create trigger trg_addons_updated_at before update on public.addons
  for each row execute function public.set_updated_at();

-- --- RLS: odczyt dla zalogowanych; edycja (konfiguracja) tylko OWNER ---
alter table public.tents    enable row level security;
alter table public.packages enable row level security;
alter table public.addons   enable row level security;

drop policy if exists tents_select on public.tents;
create policy tents_select on public.tents for select to authenticated using (true);
drop policy if exists tents_write on public.tents;
create policy tents_write on public.tents for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

drop policy if exists packages_select on public.packages;
create policy packages_select on public.packages for select to authenticated using (true);
drop policy if exists packages_write on public.packages;
create policy packages_write on public.packages for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

drop policy if exists addons_select on public.addons;
create policy addons_select on public.addons for select to authenticated using (true);
drop policy if exists addons_write on public.addons;
create policy addons_write on public.addons for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- =====================================================================
-- SEED — dane startowe (edytowalne później w panelu / ustawieniach)
-- =====================================================================
insert into public.tents (code, name, size, set_color, has_back_door, status) values
  ('TENT-01', 'Namiot 6×8 Niebieski', '6×8', 'Niebieski', true,  'AVAILABLE'),
  ('TENT-02', 'Namiot 6×8 Żółty',     '6×8', 'Żółty',     false, 'AVAILABLE'),
  ('TENT-03', 'Namiot 5,4×5,4 Żółty', '5,4×5,4', 'Żółty', false, 'AVAILABLE')
on conflict (code) do nothing;

insert into public.packages (code, name, description, base_price, sort) values
  ('STANDARD', 'Standard', 'Namiot iClub, montaż, oświetlenie LED, laser, dym, serwis, nagłośnienie.', 0, 1),
  ('PREMIUM',  'Premium',  'Standard + parkiet ze sztucznej trawy, laser animacyjny, 50 pałeczek fluo.', 0, 2),
  ('VIP',      'VIP',      'Premium + 100 pałeczek fluo, oświetlenie UV, strefa VIP, karaoke.', 0, 3)
on conflict (code) do nothing;

insert into public.addons (code, name, price, sort) values
  ('KARAOKE',      'Mikrofony karaoke', 100, 1),
  ('VIP_ZONE',     'Strefa VIP',        200, 2),
  ('HEATING',      'Ogrzewanie',        250, 3),
  ('TABLES',       'Stoły',             0,   4),
  ('CHAIRS',       'Krzesła',           0,   5),
  ('COCKTAIL',     'Stoliki koktajlowe', 0,  6)
on conflict (code) do nothing;


-- =====================================================================
-- iClub Management — migracja 0003: rezerwacje, zlecenia, etapy
-- Rezerwacja iClub → automatyczne zlecenie (job) i podstawowe etapy.
-- =====================================================================

do $$ begin
  create type public.reservation_status as enum ('TEMPORARY', 'CONFIRMED', 'CANCELLED', 'EXPIRED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.job_status as enum ('PLANNED', 'IN_PROGRESS', 'DONE', 'CANCELLED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.stage_status as enum ('TODO', 'IN_PROGRESS', 'DONE', 'SKIPPED');
exception when duplicate_object then null; end $$;

-- --- Rezerwacje ---
create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  business_line public.business_line not null default 'ICLUB',
  customer_id uuid references public.customers(id) on delete set null,
  inquiry_id uuid references public.inquiries(id) on delete set null,
  event_type text,
  event_date date,
  setup_date date,
  teardown_date date,
  location text,
  guests integer,
  tent_id uuid references public.tents(id) on delete set null,
  package_id uuid references public.packages(id) on delete set null,
  addon_ids uuid[] not null default '{}',   -- lista dodatków (konfigurowalne)
  price numeric(10,2),
  discount numeric(10,2) not null default 0,
  deposit numeric(10,2) not null default 0,
  is_invoice boolean not null default false, -- prywatnie / FV (§43)
  source text,
  status public.reservation_status not null default 'TEMPORARY',
  expires_at timestamptz,                    -- rezerwacja tymczasowa: domyślnie +48h
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_reservations_customer on public.reservations (customer_id);
create index if not exists idx_reservations_event_date on public.reservations (event_date);
create index if not exists idx_reservations_status on public.reservations (status);

drop trigger if exists trg_reservations_updated_at on public.reservations;
create trigger trg_reservations_updated_at before update on public.reservations
  for each row execute function public.set_updated_at();

-- --- Zlecenia (tworzone automatycznie z rezerwacji) ---
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid references public.reservations(id) on delete cascade,
  business_line public.business_line not null default 'ICLUB',
  title text,
  event_date date,
  status public.job_status not null default 'PLANNED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_jobs_reservation on public.jobs (reservation_id);
create index if not exists idx_jobs_event_date on public.jobs (event_date);

drop trigger if exists trg_jobs_updated_at on public.jobs;
create trigger trg_jobs_updated_at before update on public.jobs
  for each row execute function public.set_updated_at();

-- --- Etapy zlecenia (generowane z szablonu przy tworzeniu zlecenia) ---
create table if not exists public.job_stages (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  stage_key text not null,        -- PREP / PACKING / SETUP / HANDOVER / TEARDOWN / RETURN / UNPACK / SERVICE
  title text not null,
  status public.stage_status not null default 'TODO',
  sort integer not null default 0,
  planned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_job_stages_job on public.job_stages (job_id);

drop trigger if exists trg_job_stages_updated_at on public.job_stages;
create trigger trg_job_stages_updated_at before update on public.job_stages
  for each row execute function public.set_updated_at();

-- --- RLS: pełny CRUD dla zalogowanych (rozdział uprawnień w kolejnych fazach) ---
alter table public.reservations enable row level security;
alter table public.jobs         enable row level security;
alter table public.job_stages   enable row level security;

drop policy if exists reservations_all on public.reservations;
create policy reservations_all on public.reservations for all to authenticated using (true) with check (true);

drop policy if exists jobs_all on public.jobs;
create policy jobs_all on public.jobs for all to authenticated using (true) with check (true);

drop policy if exists job_stages_all on public.job_stages;
create policy job_stages_all on public.job_stages for all to authenticated using (true) with check (true);
