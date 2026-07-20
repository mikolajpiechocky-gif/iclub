-- =====================================================================
-- iClub Management — migracja 0022: szkielet faktur VAT (§43)
-- Śledzenie wystawienia faktury dla rezerwacji na FV. Architektura pod InFakt
-- (bez atrapy integracji). Dane firmy klienta trzymamy w customers (tax_id).
-- =====================================================================
alter table public.reservations add column if not exists invoice_issued boolean not null default false;
alter table public.reservations add column if not exists invoice_issued_at timestamptz;
alter table public.reservations add column if not exists invoice_number text;
