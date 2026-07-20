-- =====================================================================
-- iClub Management — migracja 0024: pola pod format wydarzeń kalendarza (§53)
-- iClub: drugi (opcjonalny) namiot → kody M/D/MD/DD/MM w tytule.
-- Wypożyczalnia: pozycje sprzętu (tytuł), godzina dostawy, sposób płatności.
-- =====================================================================
alter table public.reservations add column if not exists tent_id_2 uuid references public.tents(id) on delete set null;
alter table public.reservations add column if not exists rental_items text;
alter table public.reservations add column if not exists delivery_time text;         -- "HH:MM" (opcjonalnie)
alter table public.reservations add column if not exists payment_upfront boolean not null default false; -- wypożyczalnia: opłacone z góry?
