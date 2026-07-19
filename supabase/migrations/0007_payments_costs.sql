-- =====================================================================
-- iClub Management — migracja 0007: płatności i koszty (§21, §45)
-- Płatność: metoda, status (zgłoszenie gotówki → weryfikacja właściciela).
-- Koszt: kategoria, kwota, przypisany do zlecenia; status weryfikacji.
-- =====================================================================

do $$ begin
  create type public.payment_method as enum ('CASH', 'TRANSFER', 'BLIK', 'CARD');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('PLANNED', 'REPORTED', 'PAID', 'OVERDUE', 'REFUNDED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.cost_status as enum ('PENDING', 'VERIFIED');
exception when duplicate_object then null; end $$;

-- --- Płatności ---
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete cascade,
  title text,
  method public.payment_method not null default 'TRANSFER',
  amount numeric(10,2) not null default 0,
  status public.payment_status not null default 'PLANNED',
  note text,
  reported_by uuid references public.profiles(id) on delete set null,
  verified_by uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payments_job on public.payments (job_id);
create index if not exists idx_payments_status on public.payments (status);

drop trigger if exists trg_payments_updated_at on public.payments;
create trigger trg_payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- --- Koszty ---
create table if not exists public.costs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete set null,
  category text not null default 'Inne',
  amount numeric(10,2) not null default 0,
  spent_on date,
  note text,
  status public.cost_status not null default 'PENDING',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_costs_job on public.costs (job_id);
create index if not exists idx_costs_status on public.costs (status);

drop trigger if exists trg_costs_updated_at on public.costs;
create trigger trg_costs_updated_at before update on public.costs
  for each row execute function public.set_updated_at();

-- --- RLS: CRUD dla zalogowanych (pracownik dodaje koszty i zgłasza gotówkę;
--     weryfikację wymusza aplikacja po stronie właściciela) ---
alter table public.payments enable row level security;
alter table public.costs    enable row level security;

drop policy if exists payments_all on public.payments;
create policy payments_all on public.payments for all to authenticated using (true) with check (true);

drop policy if exists costs_all on public.costs;
create policy costs_all on public.costs for all to authenticated using (true) with check (true);
