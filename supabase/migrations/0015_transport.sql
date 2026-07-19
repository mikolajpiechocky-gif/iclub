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
