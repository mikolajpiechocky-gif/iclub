-- 0034: przypisanie zadania serwisowego do pracownika (domyślnie Bartek).
alter table public.service_tasks add column if not exists assigned_to uuid references public.profiles(id) on delete set null;
create index if not exists idx_service_tasks_assigned on public.service_tasks (assigned_to) where assigned_to is not null;
