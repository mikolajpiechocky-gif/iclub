-- =====================================================================
-- iClub Management — migracja 0020: przypomnienie o aktualizacji cen paliwa
-- Znacznik ostatniej zmiany cen paliwa. Pulpit pokazuje przypomnienie, gdy
-- minęły 2 tygodnie (ceny są ręczne — brak darmowego API cen w PL).
-- =====================================================================
alter table public.app_settings add column if not exists fuel_updated_at timestamptz not null default now();
