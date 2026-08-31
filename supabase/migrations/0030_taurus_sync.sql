-- 0030 Integracja iClub × TAURUS: slad synchronizacji po stronie iClub.
-- taurus_event_job_id  = id wiersza jobs w bazie TAURUS (kalendarz: source='iclub_event').
alter table public.reservations add column if not exists taurus_event_job_id uuid;
