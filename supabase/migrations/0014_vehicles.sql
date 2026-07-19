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
