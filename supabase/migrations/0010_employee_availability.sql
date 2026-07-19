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
