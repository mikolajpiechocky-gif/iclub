-- 0037: rozliczenie PER ZLECENIE (przycisk „Rozlicz" + kwota), zamiast narastającego paid_out.
alter table public.job_assignments add column if not exists settled_at timestamptz;
alter table public.job_assignments add column if not exists settled_amount numeric(10,2);
create index if not exists idx_job_assignments_settled on public.job_assignments (profile_id, settled_at);
