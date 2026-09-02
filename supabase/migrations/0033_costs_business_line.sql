-- 0033: ręczne przypisanie kosztu do linii biznesowej (iClub / wypożyczalnia) niezależnie od zlecenia.
-- Dotychczas koszt trafiał do linii tylko pośrednio przez job_id → jobs.business_line, więc koszt
-- ogólny (bez zlecenia) nie liczył się do żadnej linii. Teraz można przypisać wprost.
alter table public.costs add column if not exists business_line text
  check (business_line in ('ICLUB','EQUIPMENT_RENTAL'));
