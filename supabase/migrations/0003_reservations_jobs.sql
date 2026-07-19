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
