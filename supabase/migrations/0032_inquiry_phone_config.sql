-- 0032: telefon i pełna konfiguracja przy leadzie z konfiguratora + naprawa historycznej „zaliczki".
-- Telefon jako pole (kliknij, by zadzwonić), config_json = strukturalne dane do czytelnej karty.
alter table public.inquiries add column if not exists contact_phone text;
alter table public.inquiries add column if not exists config_json jsonb;

-- W iClub obowiązuje „zadatek" (art. 394 k.c.), nie „zaliczka" — porządkujemy dotychczasowe notatki.
update public.inquiries
  set notes = replace(replace(notes, 'zaliczka', 'zadatek'), 'Zaliczka', 'Zadatek')
  where notes ilike '%zaliczk%';
