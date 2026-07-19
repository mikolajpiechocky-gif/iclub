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
