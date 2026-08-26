-- 0027 BEZPIECZEŃSTWO: zamknięcie wycieku RLS.
-- customer_satisfaction_history / _requests miały politykę dla roli {public} (czyli także anon —
-- publiczny klucz z przeglądarki) z pełnym ALL using(true). To pozwalało każdemu w internecie
-- czytać i zapisywać te tabele (customer_id + notatki) bez logowania. Żaden kod apki z nich nie
-- korzysta. Ograniczamy dostęp wyłącznie do zalogowanych (jak reszta tabel CRM).

alter table public.customer_satisfaction_history enable row level security;
drop policy if exists sat_hist_all on public.customer_satisfaction_history;
drop policy if exists sat_hist_authenticated on public.customer_satisfaction_history;
create policy sat_hist_authenticated on public.customer_satisfaction_history
  for all to authenticated using (true) with check (true);

alter table public.customer_satisfaction_requests enable row level security;
drop policy if exists sat_req_all on public.customer_satisfaction_requests;
drop policy if exists sat_req_authenticated on public.customer_satisfaction_requests;
create policy sat_req_authenticated on public.customer_satisfaction_requests
  for all to authenticated using (true) with check (true);
