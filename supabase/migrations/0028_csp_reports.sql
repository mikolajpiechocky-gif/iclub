-- 0028 Zbieranie naruszeń CSP (tryb Report-Only) do późniejszego dostrojenia polityki.
-- Zapis wyłącznie przez endpoint (service_role); RLS bez polityk = nikt inny nie czyta/pisze.
create table if not exists public.csp_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  document_uri text,
  violated_directive text,
  effective_directive text,
  blocked_uri text,
  disposition text,
  raw jsonb
);
create index if not exists idx_csp_reports_created on public.csp_reports (created_at desc);
create index if not exists idx_csp_reports_blocked on public.csp_reports (blocked_uri);
alter table public.csp_reports enable row level security;
