-- =====================================================================
-- iClub Management — migracja 0021: potwierdzenie klienta przed realizacją (§42)
-- Znacznik potwierdzenia szczegółów przez klienta (zwykle ~7 dni przed).
-- Pulpit pokazuje realizacje ≤7 dni, które czekają na potwierdzenie.
-- =====================================================================
alter table public.reservations add column if not exists client_confirmed boolean not null default false;
alter table public.reservations add column if not exists client_confirmed_at timestamptz;
