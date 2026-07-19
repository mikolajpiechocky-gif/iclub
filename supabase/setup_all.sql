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

-- seed: jeden pojazd startowy
insert into public.vehicles (name, registration, type, fuel_type, consumption, capacity)
values ('Iveco Daily', 'PO 00000', 'Bus', 'Diesel', 11.5, 'do 3.5 t')
on conflict do nothing;

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

