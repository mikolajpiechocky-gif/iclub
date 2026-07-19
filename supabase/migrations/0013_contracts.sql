-- =====================================================================
-- iClub Management — migracja 0013: umowy (§44)
-- Status umowy przy zleceniu (treść generowana z rezerwacji z szablonu).
-- Wersjonowanie i podpis elektroniczny — kolejny etap.
-- =====================================================================

do $$ begin
  create type public.contract_status as enum ('DRAFT', 'SENT', 'SIGNED');
exception when duplicate_object then null; end $$;

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references public.jobs(id) on delete cascade,
  status public.contract_status not null default 'DRAFT',
  sent_at timestamptz,
  signed_at timestamptz,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_contracts_updated_at on public.contracts;
create trigger trg_contracts_updated_at before update on public.contracts
  for each row execute function public.set_updated_at();

alter table public.contracts enable row level security;

drop policy if exists contracts_all on public.contracts;
create policy contracts_all on public.contracts for all to authenticated using (true) with check (true);
