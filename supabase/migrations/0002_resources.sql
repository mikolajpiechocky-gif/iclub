-- =====================================================================
-- iClub Management — migracja 0002: zasoby konfigurowalne
-- Namioty, pakiety i dodatki. Ceny i skład są w BAZIE (nie w kodzie) —
-- zgodnie z zasadą konfigurowalności (§51 instrukcji master).
-- =====================================================================

do $$ begin
  create type public.business_line as enum ('ICLUB', 'EQUIPMENT_RENTAL');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tent_status as enum ('AVAILABLE', 'RESERVED', 'ON_SITE', 'SERVICE', 'DAMAGED');
exception when duplicate_object then null; end $$;

-- --- Namioty ---
create table if not exists public.tents (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  size text,                       -- np. "6×8", "5,4×5,4"
  set_color text,                  -- zestaw: "Niebieski" / "Żółty"
  has_back_door boolean not null default false,  -- drzwi w tylnej ścianie (§14)
  status public.tent_status not null default 'AVAILABLE',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_tents_updated_at on public.tents;
create trigger trg_tents_updated_at before update on public.tents
  for each row execute function public.set_updated_at();

-- --- Pakiety (Standard / Premium / VIP) ---
create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  base_price numeric(10,2) not null default 0,  -- cena brutto, konfigurowalna
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_packages_updated_at on public.packages;
create trigger trg_packages_updated_at before update on public.packages
  for each row execute function public.set_updated_at();

-- --- Dodatki / dosprzedaż ---
create table if not exists public.addons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  price numeric(10,2) not null default 0,
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_addons_updated_at on public.addons;
create trigger trg_addons_updated_at before update on public.addons
  for each row execute function public.set_updated_at();

-- --- RLS: odczyt dla zalogowanych; edycja (konfiguracja) tylko OWNER ---
alter table public.tents    enable row level security;
alter table public.packages enable row level security;
alter table public.addons   enable row level security;

drop policy if exists tents_select on public.tents;
create policy tents_select on public.tents for select to authenticated using (true);
drop policy if exists tents_write on public.tents;
create policy tents_write on public.tents for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

drop policy if exists packages_select on public.packages;
create policy packages_select on public.packages for select to authenticated using (true);
drop policy if exists packages_write on public.packages;
create policy packages_write on public.packages for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

drop policy if exists addons_select on public.addons;
create policy addons_select on public.addons for select to authenticated using (true);
drop policy if exists addons_write on public.addons;
create policy addons_write on public.addons for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- =====================================================================
-- SEED — dane startowe (edytowalne później w panelu / ustawieniach)
-- =====================================================================
insert into public.tents (code, name, size, set_color, has_back_door, status) values
  ('TENT-01', 'Namiot 6×8 Niebieski', '6×8', 'Niebieski', true,  'AVAILABLE'),
  ('TENT-02', 'Namiot 6×8 Żółty',     '6×8', 'Żółty',     false, 'AVAILABLE'),
  ('TENT-03', 'Namiot 5,4×5,4 Żółty', '5,4×5,4', 'Żółty', false, 'AVAILABLE')
on conflict (code) do nothing;

insert into public.packages (code, name, description, base_price, sort) values
  ('STANDARD', 'Standard', 'Namiot iClub, montaż, oświetlenie LED, laser, dym, serwis, nagłośnienie.', 0, 1),
  ('PREMIUM',  'Premium',  'Standard + parkiet ze sztucznej trawy, laser animacyjny, 50 pałeczek fluo.', 0, 2),
  ('VIP',      'VIP',      'Premium + 100 pałeczek fluo, oświetlenie UV, strefa VIP, karaoke.', 0, 3)
on conflict (code) do nothing;

insert into public.addons (code, name, price, sort) values
  ('KARAOKE',      'Mikrofony karaoke', 100, 1),
  ('VIP_ZONE',     'Strefa VIP',        200, 2),
  ('HEATING',      'Ogrzewanie',        250, 3),
  ('TABLES',       'Stoły',             0,   4),
  ('CHAIRS',       'Krzesła',           0,   5),
  ('COCKTAIL',     'Stoliki koktajlowe', 0,  6)
on conflict (code) do nothing;
