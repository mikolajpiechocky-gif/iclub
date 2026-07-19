-- =====================================================================
-- iClub Management — migracja 0005: stawki i premie pracowników (§10)
-- Dane poufne — dostęp tylko dla OWNER (RLS). Pracownik nie widzi stawek innych.
-- Pracownik = profil (profiles). Tu przechowujemy jego model rozliczenia.
-- =====================================================================

do $$ begin
  create type public.rate_model as enum ('FLAT', 'HOURLY', 'FLAT_PLUS_BONUS', 'HOURLY_PLUS_BONUS', 'MIXED');
exception when duplicate_object then null; end $$;

create table if not exists public.employee_rates (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  rate_model public.rate_model not null default 'FLAT',
  hourly_rate numeric(10,2),          -- stawka godzinowa
  iclub_flat numeric(10,2),           -- ryczałt za realizację iClub
  far_bonus numeric(10,2),            -- premia za daleki wyjazd
  gastro_bonus numeric(10,2),         -- premia za namiot gastronomiczny
  review_bonus numeric(10,2),         -- premia za opinię
  reel_bonus numeric(10,2),           -- premia za rolkę
  upsell_percent numeric(5,2) default 15, -- % premii za dosprzedaż (§18)
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_employee_rates_updated_at on public.employee_rates;
create trigger trg_employee_rates_updated_at before update on public.employee_rates
  for each row execute function public.set_updated_at();

alter table public.employee_rates enable row level security;

-- Tylko właściciel widzi i edytuje stawki.
drop policy if exists employee_rates_owner on public.employee_rates;
create policy employee_rates_owner on public.employee_rates for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
