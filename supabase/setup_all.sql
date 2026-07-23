-- =============================================================
-- iClub Management — KOMPLETNY SETUP BAZY (migracje 0001–0016)
-- Wklej calosc i uruchom. Idempotentne.
-- =============================================================

-- ---- 0001_init_profiles_customers_inquiries ----
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

-- ---- 0002_resources ----
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

-- ---- 0003_reservations_jobs ----
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

-- ---- 0004_equipment ----
-- =====================================================================
-- iClub Management — migracja 0004: sprzęt (magazyn, część 1)
-- Sprzęt liczony ilościowo. Pełny model (numery seryjne, serwis, rentowność,
-- ruchy magazynowe) dojdzie w kolejnych częściach Fazy 4.
-- =====================================================================

do $$ begin
  create type public.equipment_status as enum ('AVAILABLE', 'SERVICE', 'DAMAGED');
exception when duplicate_object then null; end $$;

create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category text,
  quantity integer not null default 0,     -- ilość na stanie
  tracking text not null default 'QUANTITY', -- QUANTITY | INDIVIDUAL (na razie QUANTITY)
  unit_cost numeric(10,2),                  -- koszt zakupu (do rentowności)
  status public.equipment_status not null default 'AVAILABLE',
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_equipment_category on public.equipment (category);

drop trigger if exists trg_equipment_updated_at on public.equipment;
create trigger trg_equipment_updated_at before update on public.equipment
  for each row execute function public.set_updated_at();

alter table public.equipment enable row level security;

drop policy if exists equipment_select on public.equipment;
create policy equipment_select on public.equipment for select to authenticated using (true);
drop policy if exists equipment_write on public.equipment;
create policy equipment_write on public.equipment for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- SEED
insert into public.equipment (code, name, category, quantity, unit_cost) values
  ('EQ-01', 'Kolumny aktywne',   'Nagłośnienie', 8,   1200),
  ('EQ-02', 'Głowice LED',       'Oświetlenie',  12,  450),
  ('EQ-03', 'Wytwornice dymu',   'Efekty',       4,   600),
  ('EQ-04', 'Stoły koktajlowe',  'Meble',        20,  120),
  ('EQ-05', 'Krzesła',           'Meble',        120, 35),
  ('EQ-06', 'Parasole grzewcze', 'Ogrzewanie',   6,   500)
on conflict (code) do nothing;

-- ---- 0005_employee_rates ----
-- =====================================================================
-- iClub Management — migracja 0005: stawki i premie pracowników (§10)
-- Dane poufne — dostęp tylko dla OWNER (RLS). Pracownik nie widzi stawek innych.
-- Pracownik = profil (profiles). Tu przechowujemy jego model rozliczenia.
-- =====================================================================

do $$ begin
  create type public.rate_model as enum ('FLAT', 'HOURLY', 'FLAT_PLUS_BONUS', 'HOURLY_PLUS_BONUS', 'MIXED');
exception when duplicate_object then null; end $$;

create table if not exists public.employee_rates (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  rate_model public.rate_model not null default 'FLAT',
  hourly_rate numeric(10,2),          -- stawka godzinowa
  iclub_flat numeric(10,2),           -- ryczałt za realizację iClub
  far_bonus numeric(10,2),            -- premia za daleki wyjazd
  gastro_bonus numeric(10,2),         -- premia za namiot gastronomiczny
  review_bonus numeric(10,2),         -- premia za opinię
  reel_bonus numeric(10,2),           -- premia za rolkę
  upsell_percent numeric(5,2) default 15, -- % premii za dosprzedaż (§18)
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_employee_rates_updated_at on public.employee_rates;
create trigger trg_employee_rates_updated_at before update on public.employee_rates
  for each row execute function public.set_updated_at();

alter table public.employee_rates enable row level security;

-- Tylko właściciel widzi i edytuje stawki.
drop policy if exists employee_rates_owner on public.employee_rates;
create policy employee_rates_owner on public.employee_rates for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- ---- 0006_job_assignments ----
-- =====================================================================
-- iClub Management — migracja 0006: przypisania pracowników do zleceń (§9)
-- + ręczny bonus właściciela do zlecenia (§10).
-- =====================================================================

alter table public.jobs add column if not exists owner_bonus numeric(10,2) not null default 0;

-- Pracownik może zobaczyć WŁASNE stawki (do wyliczenia własnego zarobku, §6).
drop policy if exists employee_rates_self_select on public.employee_rates;
create policy employee_rates_self_select on public.employee_rates for select to authenticated
  using (profile_id = auth.uid());

create table if not exists public.job_assignments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  is_lead boolean not null default false,
  note text,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, profile_id)
);

create index if not exists idx_job_assignments_job on public.job_assignments (job_id);
create index if not exists idx_job_assignments_profile on public.job_assignments (profile_id);

drop trigger if exists trg_job_assignments_updated_at on public.job_assignments;
create trigger trg_job_assignments_updated_at before update on public.job_assignments
  for each row execute function public.set_updated_at();

alter table public.job_assignments enable row level security;

-- Wszyscy zalogowani widzą przypisania (koordynacja, wspólny kalendarz).
drop policy if exists job_assignments_select on public.job_assignments;
create policy job_assignments_select on public.job_assignments for select to authenticated using (true);

-- Dodać przypisanie może właściciel (dowolne) lub pracownik samego siebie (§9).
drop policy if exists job_assignments_insert on public.job_assignments;
create policy job_assignments_insert on public.job_assignments for insert to authenticated
  with check (public.is_owner() or profile_id = auth.uid());

-- Zmieniać / usuwać przypisania może tylko właściciel (pracownik nie może się odpiąć).
drop policy if exists job_assignments_update on public.job_assignments;
create policy job_assignments_update on public.job_assignments for update to authenticated
  using (public.is_owner()) with check (public.is_owner());

drop policy if exists job_assignments_delete on public.job_assignments;
create policy job_assignments_delete on public.job_assignments for delete to authenticated
  using (public.is_owner());

-- ---- 0007_payments_costs ----
-- =====================================================================
-- iClub Management — migracja 0007: płatności i koszty (§21, §45)
-- Płatność: metoda, status (zgłoszenie gotówki → weryfikacja właściciela).
-- Koszt: kategoria, kwota, przypisany do zlecenia; status weryfikacji.
-- =====================================================================

do $$ begin
  create type public.payment_method as enum ('CASH', 'TRANSFER', 'BLIK', 'CARD');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('PLANNED', 'REPORTED', 'PAID', 'OVERDUE', 'REFUNDED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.cost_status as enum ('PENDING', 'VERIFIED');
exception when duplicate_object then null; end $$;

-- --- Płatności ---
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete cascade,
  title text,
  method public.payment_method not null default 'TRANSFER',
  amount numeric(10,2) not null default 0,
  status public.payment_status not null default 'PLANNED',
  note text,
  reported_by uuid references public.profiles(id) on delete set null,
  verified_by uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payments_job on public.payments (job_id);
create index if not exists idx_payments_status on public.payments (status);

drop trigger if exists trg_payments_updated_at on public.payments;
create trigger trg_payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- --- Koszty ---
create table if not exists public.costs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete set null,
  category text not null default 'Inne',
  amount numeric(10,2) not null default 0,
  spent_on date,
  note text,
  status public.cost_status not null default 'PENDING',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_costs_job on public.costs (job_id);
create index if not exists idx_costs_status on public.costs (status);

drop trigger if exists trg_costs_updated_at on public.costs;
create trigger trg_costs_updated_at before update on public.costs
  for each row execute function public.set_updated_at();

-- --- RLS: CRUD dla zalogowanych (pracownik dodaje koszty i zgłasza gotówkę;
--     weryfikację wymusza aplikacja po stronie właściciela) ---
alter table public.payments enable row level security;
alter table public.costs    enable row level security;

drop policy if exists payments_all on public.payments;
create policy payments_all on public.payments for all to authenticated using (true) with check (true);

drop policy if exists costs_all on public.costs;
create policy costs_all on public.costs for all to authenticated using (true) with check (true);

-- ---- 0008_checklist_items ----
-- =====================================================================
-- iClub Management — migracja 0008: checklisty pakowania (§17)
-- Pozycje checklisty przypisane do zlecenia; generowane z konfiguracji.
-- =====================================================================

create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  category text not null default 'Magazyn',
  label text not null,
  qty text,
  required boolean not null default false,
  done boolean not null default false,
  problem boolean not null default false,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_checklist_items_job on public.checklist_items (job_id);

drop trigger if exists trg_checklist_items_updated_at on public.checklist_items;
create trigger trg_checklist_items_updated_at before update on public.checklist_items
  for each row execute function public.set_updated_at();

alter table public.checklist_items enable row level security;

drop policy if exists checklist_items_all on public.checklist_items;
create policy checklist_items_all on public.checklist_items for all to authenticated using (true) with check (true);

-- ---- 0009_incidents ----
-- =====================================================================
-- iClub Management — migracja 0009: zgłoszenia i szkody / incydenty (§22, §30)
-- Jeden rejestr zgłoszeń: szkody, awarie, braki, zgłoszenia pracownika.
-- =====================================================================

do $$ begin
  create type public.incident_priority as enum ('LOW', 'MEDIUM', 'HIGH');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.incident_status as enum ('OPEN', 'IN_PROGRESS', 'RESOLVED');
exception when duplicate_object then null; end $$;

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete set null,
  category text not null default 'Inne',
  description text,
  equipment text,                       -- czego dotyczy (opis)
  priority public.incident_priority not null default 'MEDIUM',
  status public.incident_status not null default 'OPEN',
  resolution text,
  reported_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_incidents_job on public.incidents (job_id);
create index if not exists idx_incidents_status on public.incidents (status);
create index if not exists idx_incidents_created_at on public.incidents (created_at desc);

drop trigger if exists trg_incidents_updated_at on public.incidents;
create trigger trg_incidents_updated_at before update on public.incidents
  for each row execute function public.set_updated_at();

alter table public.incidents enable row level security;

drop policy if exists incidents_all on public.incidents;
create policy incidents_all on public.incidents for all to authenticated using (true) with check (true);

-- ---- 0010_employee_availability ----
-- =====================================================================
-- iClub Management — migracja 0010: dostępność pracowników (§11)
-- Pracownik oznacza niedostępność (zakres dni + opis). Blokuje sugestie
-- przypisania i generuje ostrzeżenie; właściciel może nadpisać.
-- =====================================================================

create table if not exists public.employee_availability (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_emp_avail_profile on public.employee_availability (profile_id);
create index if not exists idx_emp_avail_dates on public.employee_availability (start_date, end_date);

alter table public.employee_availability enable row level security;

-- Wszyscy zalogowani widzą niedostępności (koordynacja przypisań).
drop policy if exists emp_avail_select on public.employee_availability;
create policy emp_avail_select on public.employee_availability for select to authenticated using (true);

-- Dodać/edytować/usunąć może właściciel (dowolne) lub pracownik swoje.
drop policy if exists emp_avail_insert on public.employee_availability;
create policy emp_avail_insert on public.employee_availability for insert to authenticated
  with check (public.is_owner() or profile_id = auth.uid());

drop policy if exists emp_avail_update on public.employee_availability;
create policy emp_avail_update on public.employee_availability for update to authenticated
  using (public.is_owner() or profile_id = auth.uid()) with check (public.is_owner() or profile_id = auth.uid());

drop policy if exists emp_avail_delete on public.employee_availability;
create policy emp_avail_delete on public.employee_availability for delete to authenticated
  using (public.is_owner() or profile_id = auth.uid());

-- ---- 0011_signatures ----
-- =====================================================================
-- iClub Management — migracja 0011: podpis klienta (§21)
-- Podpis zapisywany jako obraz (data URL) przy zleceniu.
-- =====================================================================

create table if not exists public.signatures (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete cascade,
  data_url text not null,          -- podpis jako obraz PNG (base64)
  signer_name text,
  signed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_signatures_job on public.signatures (job_id);

alter table public.signatures enable row level security;

drop policy if exists signatures_all on public.signatures;
create policy signatures_all on public.signatures for all to authenticated using (true) with check (true);

-- ---- 0012_service_tasks ----
-- =====================================================================
-- iClub Management — migracja 0012: zadania serwisowe (§29)
-- Czyszczenie / naprawa / sprawdzenie sprzętu. Cykl tygodniowy (przypomnienia)
-- dojdzie z modułem powiadomień.
-- =====================================================================

do $$ begin
  create type public.service_status as enum ('OPEN', 'IN_PROGRESS', 'DONE');
exception when duplicate_object then null; end $$;

create table if not exists public.service_tasks (
  id uuid primary key default gen_random_uuid(),
  equipment text,                   -- czego dotyczy (sprzęt / namiot)
  kind text not null default 'Sprawdzenie',  -- Czyszczenie / Naprawa / Sprawdzenie / Inne
  description text,
  status public.service_status not null default 'OPEN',
  due_date date,
  incident_id uuid references public.incidents(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_service_status on public.service_tasks (status);
create index if not exists idx_service_due on public.service_tasks (due_date);

drop trigger if exists trg_service_tasks_updated_at on public.service_tasks;
create trigger trg_service_tasks_updated_at before update on public.service_tasks
  for each row execute function public.set_updated_at();

alter table public.service_tasks enable row level security;

drop policy if exists service_tasks_all on public.service_tasks;
create policy service_tasks_all on public.service_tasks for all to authenticated using (true) with check (true);

-- ---- 0013_contracts ----
-- =====================================================================
-- iClub Management — migracja 0013: umowy (§44)
-- Status umowy przy zleceniu (treść generowana z rezerwacji z szablonu).
-- Wersjonowanie i podpis elektroniczny — kolejny etap.
-- =====================================================================

do $$ begin
  create type public.contract_status as enum ('DRAFT', 'SENT', 'SIGNED');
exception when duplicate_object then null; end $$;

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references public.jobs(id) on delete cascade,
  status public.contract_status not null default 'DRAFT',
  sent_at timestamptz,
  signed_at timestamptz,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_contracts_updated_at on public.contracts;
create trigger trg_contracts_updated_at before update on public.contracts
  for each row execute function public.set_updated_at();

alter table public.contracts enable row level security;

drop policy if exists contracts_all on public.contracts;
create policy contracts_all on public.contracts for all to authenticated using (true) with check (true);

-- ---- 0014_vehicles ----
-- =====================================================================
-- iClub Management — migracja 0014: flota (§31)
-- Pojazdy + przypisanie do zleceń (jeden zlecenie może mieć kilka pojazdów).
-- =====================================================================

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  registration text,
  type text,                        -- Bus / Ciężarowy / Osobowy
  fuel_type text,                   -- Benzyna / Diesel / LPG
  consumption numeric(6,2),         -- spalanie l/100km
  capacity text,                    -- ładowność / pojemność
  mileage integer,                  -- przebieg
  insurance_date date,
  inspection_date date,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_vehicles_updated_at on public.vehicles;
create trigger trg_vehicles_updated_at before update on public.vehicles
  for each row execute function public.set_updated_at();

alter table public.vehicles enable row level security;
drop policy if exists vehicles_select on public.vehicles;
create policy vehicles_select on public.vehicles for select to authenticated using (true);
drop policy if exists vehicles_write on public.vehicles;
create policy vehicles_write on public.vehicles for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- --- Przypisanie pojazdu do zlecenia ---
create table if not exists public.job_vehicles (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (job_id, vehicle_id)
);

create index if not exists idx_job_vehicles_job on public.job_vehicles (job_id);
create index if not exists idx_job_vehicles_vehicle on public.job_vehicles (vehicle_id);

alter table public.job_vehicles enable row level security;
drop policy if exists job_vehicles_all on public.job_vehicles;
create policy job_vehicles_all on public.job_vehicles for all to authenticated using (true) with check (true);

-- seed: jeden pojazd startowy (tylko gdy tabela pusta — idempotentne)
insert into public.vehicles (name, registration, type, fuel_type, consumption, capacity)
select 'Iveco Daily', 'PO 00000', 'Bus', 'Diesel', 11.5, 'do 3.5 t'
where not exists (select 1 from public.vehicles);

-- ---- 0015_transport ----
-- =====================================================================
-- iClub Management — migracja 0015: transport i koszt paliwa (§33, §34)
-- Kalkulacja per zlecenie: dystans (ręczny), spalanie, cena paliwa → koszt.
-- Optymalizacja tras / geokodowanie (Google Maps) — osobny etap z kluczem API.
-- =====================================================================

create table if not exists public.transport_calculations (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  kind text not null default 'PLAN',   -- PLAN / ACTUAL
  distance_km numeric(10,2),
  consumption numeric(6,2),            -- l/100km (snapshot)
  fuel_price numeric(6,2),             -- zł/l
  fuel_cost numeric(10,2),             -- wyliczony koszt paliwa
  client_price numeric(10,2),          -- cena transportu dla klienta (opcjonalnie)
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_transport_job on public.transport_calculations (job_id);

alter table public.transport_calculations enable row level security;

drop policy if exists transport_all on public.transport_calculations;
create policy transport_all on public.transport_calculations for all to authenticated using (true) with check (true);

-- ---- 0016_notifications ----
-- =====================================================================
-- iClub Management — migracja 0016: powiadomienia in-app (§8)
-- Kanały push / e-mail / SMS — osobny etap (dostawcy).
-- =====================================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient uuid not null references public.profiles(id) on delete cascade,
  type text,                         -- ASSIGNMENT / STATUS / ...
  title text not null,
  body text,
  job_id uuid references public.jobs(id) on delete set null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_recipient on public.notifications (recipient, read);
create index if not exists idx_notifications_created_at on public.notifications (created_at desc);

alter table public.notifications enable row level security;

-- Odbiorca widzi i oznacza swoje; utworzyć powiadomienie może każdy zalogowany
-- (system tworzy je dla innych, np. przy przypisaniu).
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to authenticated using (recipient = auth.uid());
drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications for insert to authenticated with check (true);
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update to authenticated using (recipient = auth.uid()) with check (recipient = auth.uid());

-- ================= 0017: app_settings (§51) =================
create table if not exists public.app_settings (
  id boolean primary key default true,
  base_address text not null default 'Południowa 9, Dopiewo',
  fuel_price_petrol numeric(6,2) not null default 6.50,
  fuel_price_diesel numeric(6,2) not null default 6.50,
  fuel_price_lpg numeric(6,2) not null default 3.20,
  iclub_hours numeric(5,2) not null default 8,
  vat_rate numeric(5,2) not null default 23,
  updated_at timestamptz not null default now(),
  constraint app_settings_singleton check (id = true)
);
drop trigger if exists trg_app_settings_updated_at on public.app_settings;
create trigger trg_app_settings_updated_at before update on public.app_settings for each row execute function public.set_updated_at();
alter table public.app_settings enable row level security;
drop policy if exists app_settings_select on public.app_settings;
create policy app_settings_select on public.app_settings for select to authenticated using (true);
drop policy if exists app_settings_write on public.app_settings;
create policy app_settings_write on public.app_settings for all to authenticated using (public.is_owner()) with check (public.is_owner());
insert into public.app_settings (id) values (true) on conflict (id) do nothing;

-- ================= 0018: job_photos + bucket 'realizations' =================
create table if not exists public.job_photos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  path text not null,
  caption text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_job_photos_job on public.job_photos (job_id);
alter table public.job_photos enable row level security;
drop policy if exists job_photos_select on public.job_photos;
create policy job_photos_select on public.job_photos for select to authenticated using (true);
drop policy if exists job_photos_insert on public.job_photos;
create policy job_photos_insert on public.job_photos for insert to authenticated with check (true);
drop policy if exists job_photos_delete on public.job_photos;
create policy job_photos_delete on public.job_photos for delete to authenticated using (true);
insert into storage.buckets (id, name, public) values ('realizations', 'realizations', false) on conflict (id) do nothing;
drop policy if exists "realizations read" on storage.objects;
create policy "realizations read" on storage.objects for select to authenticated using (bucket_id = 'realizations');
drop policy if exists "realizations insert" on storage.objects;
create policy "realizations insert" on storage.objects for insert to authenticated with check (bucket_id = 'realizations');
drop policy if exists "realizations delete" on storage.objects;
create policy "realizations delete" on storage.objects for delete to authenticated using (bucket_id = 'realizations');

-- ================= 0019: eksploatacja auta w koszcie transportu =================
alter table public.app_settings add column if not exists amortization_per_km numeric(6,2) not null default 0.05;
alter table public.transport_calculations add column if not exists amortization numeric(10,2);

-- ================= 0020: przypomnienie o aktualizacji cen paliwa =================
alter table public.app_settings add column if not exists fuel_updated_at timestamptz not null default now();

-- ================= 0021: potwierdzenie klienta przed realizacją =================
alter table public.reservations add column if not exists client_confirmed boolean not null default false;
alter table public.reservations add column if not exists client_confirmed_at timestamptz;

-- ================= 0022: szkielet faktur VAT =================
alter table public.reservations add column if not exists invoice_issued boolean not null default false;
alter table public.reservations add column if not exists invoice_issued_at timestamptz;
alter table public.reservations add column if not exists invoice_number text;

-- ================= 0023: powiązanie z Google Calendar =================
alter table public.reservations add column if not exists gcal_event_id text;

-- ================= 0024: pola pod format wydarzeń kalendarza =================
alter table public.reservations add column if not exists tent_id_2 uuid references public.tents(id) on delete set null;
alter table public.reservations add column if not exists rental_items text;
alter table public.reservations add column if not exists delivery_time text;
alter table public.reservations add column if not exists payment_upfront boolean not null default false;

-- ================= 0025: ochrona pola role w profiles =================
create or replace function public.guard_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and not public.is_owner() then
    raise exception 'Tylko wlasciciel moze zmieniac role uzytkownika';
  end if;
  if old.role = 'OWNER' and new.role <> 'OWNER' then
    perform pg_advisory_xact_lock(hashtext('iclub_owner_role'));
    if (select count(*) from public.profiles where role = 'OWNER') <= 1 then
      raise exception 'Musi zostac przynajmniej jeden wlasciciel';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_guard_profile_role on public.profiles;
create trigger trg_guard_profile_role before update on public.profiles
  for each row execute function public.guard_profile_role();

-- ================= 0026: inwestycje (osobny rejestr majątku) =================
-- Rejestr inwestycji w iClub. NIE są kosztem realizacji — służą wyłącznie do
-- oceny, czy inwestycja się zwróciła (suma włożona vs zysk narastająco).
create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount numeric(12,2) not null default 0,
  category text not null default 'Sprzęt',
  note text,
  created_at timestamptz not null default now()
);
alter table public.investments enable row level security;
drop policy if exists investments_owner on public.investments;
create policy investments_owner on public.investments for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- Seed 2025 (idempotentny: usuwa poprzedni seed i wstawia od nowa; ręcznie dodane
-- pozycje bez note='seed-2025' zostają nietknięte).
delete from public.investments where note = 'seed-2025';
insert into public.investments (name, amount, category, note) values
  ('Namiot + paliwo', 4629.00, 'Sprzęt', 'seed-2025'),
  ('Lasery + wytwonica dymu', 850.00, 'Sprzęt', 'seed-2025'),
  ('Stoliki Koktajlowe + osłonki', 600.00, 'Sprzęt', 'seed-2025'),
  ('Transmiter bluetooth', 240.00, 'Sprzęt', 'seed-2025'),
  ('Czerwony dywan', 80.00, 'Sprzęt', 'seed-2025'),
  ('Kordony', 405.00, 'Sprzęt', 'seed-2025'),
  ('Lampy UV', 255.00, 'Sprzęt', 'seed-2025'),
  ('Ładowarka', 22.00, 'Sprzęt', 'seed-2025'),
  ('Stojak do telefonu', 28.00, 'Sprzęt', 'seed-2025'),
  ('Przedłużacz na rolce', 298.00, 'Sprzęt', 'seed-2025'),
  ('Trójniki', 35.00, 'Sprzęt', 'seed-2025'),
  ('Płyn do dymu', 50.00, 'Sprzęt', 'seed-2025'),
  ('Baner', 100.00, 'Marketing', 'seed-2025'),
  ('Baner PCV', 100.00, 'Marketing', 'seed-2025'),
  ('OLX', 183.00, 'Marketing', 'seed-2025'),
  ('Kampanie IG', 100.00, 'Marketing', 'seed-2025'),
  ('Kampanie tiktok', 100.00, 'Marketing', 'seed-2025'),
  ('Pochodnie', 200.00, 'Sprzęt', 'seed-2025'),
  ('Rzepy', 60.00, 'Sprzęt', 'seed-2025'),
  ('Projektor', 300.00, 'Sprzęt', 'seed-2025'),
  ('Druga dmuchawa', 500.00, 'Sprzęt', 'seed-2025'),
  ('Karabińczyki', 25.00, 'Sprzęt', 'seed-2025'),
  ('Namiot 6x8', 5600.00, 'Sprzęt', 'seed-2025'),
  ('Lasery + wytwonica dymu do drugiego namiotu', 550.00, 'Sprzęt', 'seed-2025'),
  ('Dekoracje halloween', 500.00, 'Sprzęt', 'seed-2025'),
  ('Brico Obi drugi namiot (kotwy, podstawki pod kolumny itp.)', 400.00, 'Sprzęt', 'seed-2025'),
  ('Logo 2 namiot', 215.00, 'Marketing', 'seed-2025'),
  ('Dron', 400.00, 'Sprzęt', 'seed-2025'),
  ('Worki Lidl', 40.00, 'Sprzęt', 'seed-2025'),
  ('Niepoliczone', 500.00, 'Sprzęt', 'seed-2025'),
  ('Nagrzewnica x2 2000W i 3000W', 950.00, 'Sprzęt', 'seed-2025'),
  ('Odświeżenie ogłoszeń', 150.00, 'Sprzęt', 'seed-2025'),
  ('Montaż Filmów', 250.00, 'Marketing', 'seed-2025'),
  ('Przyczepka', 12679.80, 'Pojazd', 'seed-2025'),
  ('Stoliki koktajlowe x2 i krzesła action x6 + pokrowce x5', 700.00, 'Sprzęt', 'seed-2025'),
  ('Spodnie + pasek Jula', 170.00, 'Sprzęt', 'seed-2025'),
  ('Dekoracje temu', 330.00, 'Sprzęt', 'seed-2025'),
  ('Reklama IG', 120.00, 'Marketing', 'seed-2025'),
  ('Signius', 16.00, 'Marketing', 'seed-2025'),
  ('Nagrzewnica olejowa', 1050.00, 'Sprzęt', 'seed-2025'),
  ('Kanister (Leroy)', 82.00, 'Sprzęt', 'seed-2025'),
  ('Ozdoby halloween', 80.00, 'Sprzęt', 'seed-2025'),
  ('Krzesła', 2100.00, 'Sprzęt', 'seed-2025'),
  ('Stoły', 728.00, 'Sprzęt', 'seed-2025'),
  ('Lampa led do namiotu', 120.00, 'Sprzęt', 'seed-2025'),
  ('Parasole grzewcze', 2160.00, 'Sprzęt', 'seed-2025'),
  ('Chińskie sklepy', 75.00, 'Sprzęt', 'seed-2025'),
  ('Szycie namiotów', 85.00, 'Sprzęt', 'seed-2025'),
  ('Butle gazowe', 420.00, 'Sprzęt', 'seed-2025'),
  ('Sztuczna trawa + śledzie', 680.00, 'Sprzęt', 'seed-2025'),
  ('Uszczelki', 35.00, 'Sprzęt', 'seed-2025'),
  ('Wąż do nagrzewnicy', 100.00, 'Sprzęt', 'seed-2025'),
  ('Przedłużacz na rolce uszkodzony', 64.00, 'Sprzęt', 'seed-2025'),
  ('Hosting', 30.00, 'Marketing', 'seed-2025'),
  ('Biurowe', 100.00, 'Sprzęt', 'seed-2025'),
  ('Drukarka', 440.00, 'Sprzęt', 'seed-2025'),
  ('Gniazda do kolumn', 32.00, 'Sprzęt', 'seed-2025'),
  ('Ogłoszenia OLX', 180.00, 'Marketing', 'seed-2025'),
  ('Wózek', 262.00, 'Sprzęt', 'seed-2025'),
  ('Logo 2x', 335.00, 'Marketing', 'seed-2025'),
  ('Mixer', 280.00, 'Sprzęt', 'seed-2025'),
  ('Kotwy', 80.00, 'Sprzęt', 'seed-2025'),
  ('Pokrowce do stolików', 100.00, 'Sprzęt', 'seed-2025'),
  ('Zamknięcie Roku (zapomniane koszty)', 1000.00, 'Sprzęt', 'seed-2025'),
  ('Wizytówki', 148.00, 'Marketing', 'seed-2025'),
  ('Skrzynia', 350.00, 'Sprzęt', 'seed-2025'),
  ('Rura do parasola', 250.00, 'Sprzęt', 'seed-2025'),
  ('Skrzynki na kable', 38.00, 'Sprzęt', 'seed-2025'),
  ('Przedłużacz', 50.00, 'Sprzęt', 'seed-2025'),
  ('Przedłużacz (tata kupował action)', 79.00, 'Sprzęt', 'seed-2025'),
  ('Halogeny x 2', 120.00, 'Sprzęt', 'seed-2025'),
  ('Banery x 2', 250.00, 'Marketing', 'seed-2025'),
  ('Liny', 185.00, 'Sprzęt', 'seed-2025'),
  ('Grabie miotły', 70.00, 'Sprzęt', 'seed-2025'),
  ('Organizacja Sesji', 1200.00, 'Marketing', 'seed-2025'),
  ('Kangoo', 10000.00, 'Pojazd', 'seed-2025'),
  ('Allegro zamówienie', 1120.00, 'Sprzęt', 'seed-2025'),
  ('Malowanie kangoo', 450.00, 'Pojazd', 'seed-2025'),
  ('Naklejki kangoo', 500.00, 'Pojazd', 'seed-2025'),
  ('Brico gadżety do kangoo', 196.00, 'Pojazd', 'seed-2025'),
  ('Krzesła', 135.00, 'Sprzęt', 'seed-2025'),
  ('Namiot', 5190.00, 'Sprzęt', 'seed-2025'),
  ('Krzesła', 720.00, 'Sprzęt', 'seed-2025'),
  ('Vito', 28000.00, 'Pojazd', 'seed-2025'),
  ('Lasery', 500.00, 'Sprzęt', 'seed-2025'),
  ('Lasery RGB', 150.00, 'Sprzęt', 'seed-2025'),
  ('Słupki', 400.00, 'Sprzęt', 'seed-2025'),
  ('Szafy', 600.00, 'Sprzęt', 'seed-2025'),
  ('Dywan', 200.00, 'Sprzęt', 'seed-2025'),
  ('Klimatyzator', 2400.00, 'Sprzęt', 'seed-2025'),
  ('Plandeka', 180.00, 'Sprzęt', 'seed-2025'),
  ('Karabińczyki', 30.00, 'Sprzęt', 'seed-2025'),
  ('Śrubokręty', 12.00, 'Sprzęt', 'seed-2025'),
  ('Ubrania firmowe', 450.00, 'Sprzęt', 'seed-2025'),
  ('Ubrania firmowe', 400.00, 'Sprzęt', 'seed-2025'),
  ('JBL', 1900.00, 'Sprzęt', 'seed-2025'),
  ('Mikser', 460.00, 'Sprzęt', 'seed-2025'),
  ('Torby', 280.00, 'Sprzęt', 'seed-2025'),
  ('Walizki', 600.00, 'Sprzęt', 'seed-2025'),
  ('Głowice king kong', 1000.00, 'Sprzęt', 'seed-2025'),
  ('Nagrzewnica', 1600.00, 'Sprzęt', 'seed-2025'),
  ('Webasto', 500.00, 'Pojazd', 'seed-2025');

-- ================= 0027: akcept właściciela dla samo-przypisań =================
-- Pracownik może POPROSIĆ o przypisanie (status REQUESTED); właściciel akceptuje
-- (APPROVED) lub odrzuca (usuwa). Przypisania właściciela są od razu APPROVED.
alter table public.job_assignments add column if not exists status text not null default 'APPROVED';
do $$ begin
  alter table public.job_assignments add constraint job_assignments_status_chk check (status in ('REQUESTED','APPROVED'));
exception when duplicate_object then null; end $$;

-- Insert: właściciel dowolne; pracownik tylko samego siebie i tylko jako REQUESTED.
drop policy if exists job_assignments_insert on public.job_assignments;
create policy job_assignments_insert on public.job_assignments for insert to authenticated
  with check (public.is_owner() or (profile_id = auth.uid() and status = 'REQUESTED' and is_lead = false));

-- Delete: właściciel dowolne; pracownik może wycofać WŁASNĄ prośbę (tylko REQUESTED).
drop policy if exists job_assignments_delete on public.job_assignments;
create policy job_assignments_delete on public.job_assignments for delete to authenticated
  using (public.is_owner() or (profile_id = auth.uid() and status = 'REQUESTED'));

-- ================= 0028: integracja OLX (tokeny + dedup leadów) =================
create table if not exists public.olx_integration (
  id boolean primary key default true,
  refresh_token text,
  access_token text,
  access_expires_at timestamptz,
  olx_user_id text,
  connected_at timestamptz,
  last_sync_at timestamptz,
  constraint olx_singleton check (id)
);
alter table public.olx_integration enable row level security;
drop policy if exists olx_integration_owner on public.olx_integration;
create policy olx_integration_owner on public.olx_integration for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

alter table public.inquiries add column if not exists olx_thread_id text;
alter table public.inquiries add column if not exists olx_last_message_at timestamptz;
create unique index if not exists uq_inquiries_olx_thread on public.inquiries (olx_thread_id) where olx_thread_id is not null;

-- ================= 0029: ogłoszenia OLX (monitoring + statystyki) =================
create table if not exists public.olx_adverts (
  olx_id text primary key,
  title text,
  status text,
  url text,
  valid_to timestamptz,
  olx_created_at timestamptz,
  views integer not null default 0,
  phones integer not null default 0,
  prev_views integer,
  prev_phones integer,
  prev_synced_at timestamptz,
  last_synced_at timestamptz not null default now(),
  raw jsonb
);
alter table public.olx_adverts enable row level security;
drop policy if exists olx_adverts_owner on public.olx_adverts;
create policy olx_adverts_owner on public.olx_adverts for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
create index if not exists idx_olx_adverts_valid_to on public.olx_adverts (valid_to);

-- ================= 0030: leady — aktywność, auto-zamykanie, reaktywacja =================
alter type public.inquiry_status add value if not exists 'REHEATED';

alter table public.inquiries add column if not exists last_activity_at timestamptz;
alter table public.inquiries add column if not exists auto_close_blocked boolean not null default false;
alter table public.inquiries add column if not exists lost_reason text;
alter table public.inquiries add column if not exists reactivation_count integer not null default 0;
alter table public.inquiries add column if not exists reactivated_at timestamptz;
alter table public.inquiries add column if not exists previous_status text;
alter table public.inquiries add column if not exists olx_last_message text;

-- Backfill: ostatnia aktywność = ostatnia zmiana (albo utworzenie).
update public.inquiries set last_activity_at = coalesce(updated_at, created_at) where last_activity_at is null;

-- ================= 0031: wybór namiotu przez typ + wyjątek overbookingu (§10) =================
-- tent_main:  'M' | 'D' | 'D_BACKDOOR'   ·   tent_extra: null | 'M' | 'D' | 'D_BACKDOOR' | 'GASTRO'
alter table public.reservations add column if not exists tent_main text;
alter table public.reservations add column if not exists tent_extra text;
alter table public.reservations add column if not exists overbooking_override boolean not null default false;
alter table public.reservations add column if not exists overbooking_reason text;

-- ================= 0032: transport — odległość w jedną stronę + powrót do bazy (§16) =================
alter table public.transport_calculations add column if not exists one_way_km numeric(7,1);
alter table public.transport_calculations add column if not exists returns_to_base boolean not null default false;

-- ================= 0033: konfigurowalne reguły rozliczenia iClub (§19) =================
alter table public.app_settings add column if not exists iclub_hourly_rate numeric(8,2) not null default 32.40;
alter table public.app_settings add column if not exists iclub_month_threshold integer not null default 4;
alter table public.app_settings add column if not exists iclub_flat_rate numeric(10,2) not null default 500;

-- ================= 0034: pełny magazyn + audyt zmian (§17) =================
-- Rozszerzony model pozycji magazynowej.
alter table public.equipment add column if not exists unit text;
alter table public.equipment add column if not exists location text;
alter table public.equipment add column if not exists set_number text;
alter table public.equipment add column if not exists purchase_date date;
alter table public.equipment add column if not exists supplier text;
alter table public.equipment add column if not exists rental_price numeric(10,2);
alter table public.equipment add column if not exists replacement_value numeric(10,2);
alter table public.equipment add column if not exists is_rentable boolean not null default false;
alter table public.equipment add column if not exists is_addon boolean not null default false;
alter table public.equipment add column if not exists internal_only boolean not null default false;

-- Status „Czyszczenie" (§17: czyszczenie/serwis/uszkodzenia).
alter type public.equipment_status add value if not exists 'CLEANING';

-- §17.3 Pierwszy etap: WSZYSCY pracownicy mogą wprowadzać i edytować magazyn,
-- ale TWARDE usunięcie wiersza zostaje po stronie Szefa (pracownicy „wycofują" = active=false).
drop policy if exists equipment_write on public.equipment;
drop policy if exists equipment_insert on public.equipment;
drop policy if exists equipment_update on public.equipment;
drop policy if exists equipment_delete on public.equipment;
create policy equipment_insert on public.equipment for insert to authenticated with check (true);
create policy equipment_update on public.equipment for update to authenticated using (true) with check (true);
create policy equipment_delete on public.equipment for delete to authenticated using (public.is_owner());

-- §17.3 Audyt każdej zmiany magazynowej (autor, data, stara/nowa wartość).
create table if not exists public.inventory_audit (
  id uuid primary key default gen_random_uuid(),
  item_id uuid,                 -- bez FK cascade: log przetrwa usunięcie pozycji
  item_name text,
  action text not null,         -- create | update | delete | restore
  changes jsonb,                -- { pole: { old, new }, ... }
  actor uuid references public.profiles(id) on delete set null,
  actor_name text,
  created_at timestamptz not null default now()
);
create index if not exists idx_inventory_audit_item on public.inventory_audit (item_id, created_at desc);
alter table public.inventory_audit enable row level security;
drop policy if exists inventory_audit_select on public.inventory_audit;
create policy inventory_audit_select on public.inventory_audit for select to authenticated using (true);
drop policy if exists inventory_audit_insert on public.inventory_audit;
-- Autor wpisu musi zgadzać się z zalogowanym użytkownikiem (albo null dla operacji systemowej),
-- żeby nie dało się sfałszować autora zmiany magazynowej przez bezpośredni API.
create policy inventory_audit_insert on public.inventory_audit for insert to authenticated
  with check (actor is null or actor = auth.uid());

-- ================= 0035: kalkulator rezerwacji — rabat %/kwotowy + transport (§13) =================
alter table public.reservations add column if not exists discount_type text not null default 'AMOUNT';
alter table public.reservations add column if not exists discount_value numeric(10,2);
alter table public.reservations add column if not exists transport_price numeric(10,2);

-- ================= 0036: avatary zespołu =================
alter table public.profiles add column if not exists avatar_url text;

-- ================= 0037: godziny montażu (§9) =================
alter table public.packages add column if not exists assembly_minutes integer not null default 180;
alter table public.app_settings add column if not exists assembly_buffer_minutes integer not null default 30;
alter table public.app_settings add column if not exists assembly_addon_minutes integer not null default 10;
alter table public.app_settings add column if not exists assembly_gastro_minutes integer not null default 60;
alter table public.reservations add column if not exists event_start_time time;
alter table public.reservations add column if not exists assembly_time time;
alter table public.reservations add column if not exists assembly_time_by uuid references public.profiles(id) on delete set null;
alter table public.reservations add column if not exists assembly_time_at timestamptz;

-- ================= 0038: snapshot wyceny rezerwacji (§11.2) =================
alter table public.reservations add column if not exists pricing_snapshot jsonb;

-- ================= 0039: zdjęcia pozycji magazynowych (§17) =================
alter table public.equipment add column if not exists photo_url text;

-- ================= 0040: ilości dodatków w rezerwacji (§12.2) =================
-- Mapa { addon_id: ilość }. addon_ids nadal trzyma listę wybranych dodatków.
alter table public.reservations add column if not exists addon_qty jsonb not null default '{}'::jsonb;

-- ================= 0041: skład pakietu (§11.1) =================
create table if not exists public.package_items (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.packages(id) on delete cascade,
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  quantity integer not null default 1,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  unique (package_id, equipment_id)
);
create index if not exists idx_package_items_pkg on public.package_items (package_id);
alter table public.package_items enable row level security;
drop policy if exists package_items_select on public.package_items;
create policy package_items_select on public.package_items for select to authenticated using (true);
drop policy if exists package_items_write on public.package_items;
create policy package_items_write on public.package_items for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- ================= 0042: konkretne egzemplarze sprzętu (§17.2) =================
create table if not exists public.equipment_instances (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  serial_number text,
  label text,
  status public.equipment_status not null default 'AVAILABLE',
  photo_url text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_equipment_instances_eq on public.equipment_instances (equipment_id);
drop trigger if exists trg_equipment_instances_updated_at on public.equipment_instances;
create trigger trg_equipment_instances_updated_at before update on public.equipment_instances
  for each row execute function public.set_updated_at();
alter table public.equipment_instances enable row level security;
-- §17.3 wszyscy pracownicy dodają/edytują; twarde usunięcie tylko Szef.
drop policy if exists equipment_instances_select on public.equipment_instances;
create policy equipment_instances_select on public.equipment_instances for select to authenticated using (true);
drop policy if exists equipment_instances_insert on public.equipment_instances;
create policy equipment_instances_insert on public.equipment_instances for insert to authenticated with check (true);
drop policy if exists equipment_instances_update on public.equipment_instances;
create policy equipment_instances_update on public.equipment_instances for update to authenticated using (true) with check (true);
drop policy if exists equipment_instances_delete on public.equipment_instances;
create policy equipment_instances_delete on public.equipment_instances for delete to authenticated using (public.is_owner());

-- ================= 0043: tryb rozliczenia iClub per pracownik (§18/§19) =================
-- THRESHOLD = czas wolny za pierwsze N realizacji, potem ryczałt (model „Bartek").
-- FLAT = ryczałt od pierwszej realizacji. Domyślnie FLAT (nie każdy ma umowne dni wolne).
alter table public.employee_rates add column if not exists iclub_settlement_mode text not null default 'FLAT';
-- Liczba realizacji na czas wolny „w ramach umowy" per pracownik (null = próg globalny z Ustawień).
alter table public.employee_rates add column if not exists iclub_threshold integer;

-- ================= 0044: rozliczenie wypożyczalni per rezerwacja (§18) =================
-- Domyślnie godzinowo (null). Gdy ustawione — ryczałt za to zlecenie NADPISUJE godzinówkę.
alter table public.reservations add column if not exists rental_settlement_flat numeric(10,2);

-- ================= 0045: nazwa/kontakt + historia rozmowy zapytania (§6) =================
-- Dla leadów bez klienta (np. z OLX) pokazujemy nick/mail zamiast „bez klienta".
alter table public.inquiries add column if not exists contact_name text;
alter table public.inquiries add column if not exists contact_email text;
-- Pełna historia rozmowy OLX: [{ text, at, mine }]. Analiza „padły dane do umowy".
alter table public.inquiries add column if not exists olx_messages jsonb;
alter table public.inquiries add column if not exists contract_signal boolean not null default false;

-- ================= 0046: surowy sample z OLX (diagnostyka mapowania pól) =================
-- Przechowuje surowy wątek + kilka wiadomości, żeby dostroić wydobywanie nicku/lokalizacji.
alter table public.inquiries add column if not exists olx_raw jsonb;

-- ================= 0047: czas wolny per pracownik (§19) =================
-- Godziny i stawka „czasu wolnego" ustawiane per pracownik (null = wartości globalne z Ustawień).
alter table public.employee_rates add column if not exists iclub_free_hours numeric(5,2);
alter table public.employee_rates add column if not exists iclub_free_hourly numeric(10,2);

-- ================= 0048: zamrożone rozliczenie realizacji (§19) =================
-- Snapshot zarobku pracownika z chwili zakończenia realizacji — zmiana stawek nie
-- zmienia rozliczeń już zakończonych realizacji.
alter table public.job_assignments add column if not exists earnings_snapshot jsonb;

-- ================= 0049: ogrzewanie rezerwacji (§41) =================
-- Opcja „ogrzewanie" rezerwuje nagrzewnicę HT-01 z magazynu (dodatek + pozycja checklisty).
alter table public.reservations add column if not exists heating boolean not null default false;

