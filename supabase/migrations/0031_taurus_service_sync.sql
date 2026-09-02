-- 0031 Integracja iClub × TAURUS: slad zadania serwisowego po evencie.
-- taurus_service_job_id = id wiersza jobs w TAURUS (source='iclub_service').
alter table public.reservations add column if not exists taurus_service_job_id uuid;
