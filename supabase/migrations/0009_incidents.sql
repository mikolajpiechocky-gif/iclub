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
