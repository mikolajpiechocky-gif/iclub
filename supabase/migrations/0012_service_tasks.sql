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
