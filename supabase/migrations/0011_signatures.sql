-- =====================================================================
-- iClub Management — migracja 0011: podpis klienta (§21)
-- Podpis zapisywany jako obraz (data URL) przy zleceniu.
-- =====================================================================

create table if not exists public.signatures (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete cascade,
  data_url text not null,          -- podpis jako obraz PNG (base64)
  signer_name text,
  signed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_signatures_job on public.signatures (job_id);

alter table public.signatures enable row level security;

drop policy if exists signatures_all on public.signatures;
create policy signatures_all on public.signatures for all to authenticated using (true) with check (true);
