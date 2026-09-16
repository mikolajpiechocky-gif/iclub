-- 0036: powiązanie powiadomienia z zapytaniem → obsłużone/przegrane leady znikają z powiadomień.
alter table public.notifications add column if not exists inquiry_id uuid references public.inquiries(id) on delete cascade;
create index if not exists idx_notifications_inquiry on public.notifications (inquiry_id) where inquiry_id is not null;
