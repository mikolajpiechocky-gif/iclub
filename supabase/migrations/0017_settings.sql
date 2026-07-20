-- =====================================================================
-- iClub Management — migracja 0017: ustawienia aplikacji (§51)
-- Pojedynczy wiersz konfiguracji (id=true): adres bazy, ceny paliwa,
-- godziny realizacji iClub, stawka VAT. Nic z tego nie jest zaszyte w kodzie.
-- Odczyt: każdy zalogowany (potrzebne do kalkulacji). Zapis: tylko OWNER.
-- =====================================================================
create table if not exists public.app_settings (
  id boolean primary key default true,
  base_address text not null default 'Południowa 9, Dopiewo',
  fuel_price_petrol numeric(6,2) not null default 6.50,
  fuel_price_diesel numeric(6,2) not null default 6.50,
  fuel_price_lpg numeric(6,2) not null default 3.20,
  iclub_hours numeric(5,2) not null default 8,
  vat_rate numeric(5,2) not null default 23,
  updated_at timestamptz not null default now(),
  constraint app_settings_singleton check (id = true)
);

drop trigger if exists trg_app_settings_updated_at on public.app_settings;
create trigger trg_app_settings_updated_at before update on public.app_settings
  for each row execute function public.set_updated_at();

alter table public.app_settings enable row level security;
drop policy if exists app_settings_select on public.app_settings;
create policy app_settings_select on public.app_settings for select to authenticated using (true);
drop policy if exists app_settings_write on public.app_settings;
create policy app_settings_write on public.app_settings for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- Seed: pojedynczy wiersz konfiguracji z wartościami domyślnymi.
insert into public.app_settings (id) values (true) on conflict (id) do nothing;
