-- 0041: least-privilege na operacjach destrukcyjnych/spoofingu (obrona w głąb; apka i tak gole owner-only).

-- Usuwanie klientów i zapytań tylko dla OWNER (dotąd każdy zalogowany mógł kasować).
drop policy if exists customers_delete on public.customers;
create policy customers_delete on public.customers for delete to authenticated using (public.is_owner());

drop policy if exists inquiries_delete on public.inquiries;
create policy inquiries_delete on public.inquiries for delete to authenticated using (public.is_owner());

-- Zdjęcia realizacji: usuwa autor albo OWNER (nie dowolny pracownik).
drop policy if exists job_photos_delete on public.job_photos;
create policy job_photos_delete on public.job_photos for delete to authenticated
  using (created_by = auth.uid() or public.is_owner());

-- Powiadomienia: zalogowany może wstawić tylko DLA SIEBIE lub jako OWNER (anty-spoofing);
-- powiadomienia systemowe dla innych idą przez service_role (createNotification).
drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications for insert to authenticated
  with check (recipient = auth.uid() or public.is_owner());
