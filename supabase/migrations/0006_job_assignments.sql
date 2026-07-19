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
