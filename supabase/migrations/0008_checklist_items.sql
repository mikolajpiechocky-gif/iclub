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
