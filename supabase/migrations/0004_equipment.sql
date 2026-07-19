-- =====================================================================
-- iClub Management — migracja 0004: sprzęt (magazyn, część 1)
-- Sprzęt liczony ilościowo. Pełny model (numery seryjne, serwis, rentowność,
-- ruchy magazynowe) dojdzie w kolejnych częściach Fazy 4.
-- =====================================================================

do $$ begin
  create type public.equipment_status as enum ('AVAILABLE', 'SERVICE', 'DAMAGED');
exception when duplicate_object then null; end $$;

create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category text,
  quantity integer not null default 0,     -- ilość na stanie
  tracking text not null default 'QUANTITY', -- QUANTITY | INDIVIDUAL (na razie QUANTITY)
  unit_cost numeric(10,2),                  -- koszt zakupu (do rentowności)
  status public.equipment_status not null default 'AVAILABLE',
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_equipment_category on public.equipment (category);

drop trigger if exists trg_equipment_updated_at on public.equipment;
create trigger trg_equipment_updated_at before update on public.equipment
  for each row execute function public.set_updated_at();

alter table public.equipment enable row level security;

drop policy if exists equipment_select on public.equipment;
create policy equipment_select on public.equipment for select to authenticated using (true);
drop policy if exists equipment_write on public.equipment;
create policy equipment_write on public.equipment for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- SEED
insert into public.equipment (code, name, category, quantity, unit_cost) values
  ('EQ-01', 'Kolumny aktywne',   'Nagłośnienie', 8,   1200),
  ('EQ-02', 'Głowice LED',       'Oświetlenie',  12,  450),
  ('EQ-03', 'Wytwornice dymu',   'Efekty',       4,   600),
  ('EQ-04', 'Stoły koktajlowe',  'Meble',        20,  120),
  ('EQ-05', 'Krzesła',           'Meble',        120, 35),
  ('EQ-06', 'Parasole grzewcze', 'Ogrzewanie',   6,   500)
on conflict (code) do nothing;
