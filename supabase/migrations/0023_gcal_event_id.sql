-- =====================================================================
-- iClub Management — migracja 0023: powiązanie rezerwacji z Google Calendar (§53)
-- Zapisujemy identyfikator zewnętrzny wydarzenia, aby edycja/usuwanie w apce
-- trafiały do tego samego wpisu (bez duplikatów). Apka = źródło prawdy.
-- =====================================================================
alter table public.reservations add column if not exists gcal_event_id text;
