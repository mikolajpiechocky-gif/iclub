-- 0038: po podpisaniu umowy rezerwacja czeka na zadatek — szef potwierdza w kokpicie (✓/✗).
alter table public.reservations add column if not exists awaiting_deposit boolean not null default false;
create index if not exists idx_reservations_awaiting_deposit on public.reservations (awaiting_deposit) where awaiting_deposit = true;
