-- 0039: HARDENING — esign_contracts dostępne tylko dla OWNER do ODCZYTU; ZAPIS wyłącznie service_role.
-- Dotąd każdy zalogowany (w tym EMPLOYEE) mógł przez klient Supabase podmienić zamrożoną treść umowy,
-- ustawić status='signed' bez klienta, odczytać code_hash/signer_ip — obchodząc logikę e-podpisu.
-- Aplikacja i tak czyta/zapisuje esign_contracts wyłącznie przez service_role (lib/data/esign.ts),
-- więc zamknięcie dostępu authenticated NIE psuje żadnej funkcji.
drop policy if exists esign_all_authenticated on public.esign_contracts;
drop policy if exists esign_select on public.esign_contracts;
drop policy if exists esign_insert on public.esign_contracts;
drop policy if exists esign_update on public.esign_contracts;
drop policy if exists esign_delete on public.esign_contracts;

create policy esign_owner_select on public.esign_contracts
  for select to authenticated using (public.is_owner());
-- Brak polityk insert/update/delete dla authenticated → zapis możliwy wyłącznie przez service_role.
