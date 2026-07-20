-- =====================================================================
-- iClub Management — migracja 0019: eksploatacja auta w koszcie transportu
-- Stawka eksploatacji (zł/km) w ustawieniach (bez paliwa — paliwo liczone osobno).
-- Koszt wewnętrzny transportu = koszt paliwa + eksploatacja (km × stawka).
-- =====================================================================
alter table public.app_settings add column if not exists amortization_per_km numeric(6,2) not null default 0.05;
alter table public.transport_calculations add column if not exists amortization numeric(10,2);
