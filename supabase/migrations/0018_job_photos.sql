-- =====================================================================
-- iClub Management — migracja 0018: zdjęcia z realizacji
-- Zdjęcia gotowego ustawienia robione w terenie. Pliki w prywatnym buckecie
-- Storage ('realizations'), metadane w job_photos. Podgląd przez signed URL.
-- =====================================================================
create table if not exists public.job_photos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  path text not null,
  caption text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_job_photos_job on public.job_photos (job_id);

alter table public.job_photos enable row level security;
drop policy if exists job_photos_select on public.job_photos;
create policy job_photos_select on public.job_photos for select to authenticated using (true);
drop policy if exists job_photos_insert on public.job_photos;
create policy job_photos_insert on public.job_photos for insert to authenticated with check (true);
drop policy if exists job_photos_delete on public.job_photos;
create policy job_photos_delete on public.job_photos for delete to authenticated using (true);

-- Prywatny bucket na zdjęcia realizacji.
insert into storage.buckets (id, name, public) values ('realizations', 'realizations', false)
on conflict (id) do nothing;

-- Dostęp do plików bucketu tylko dla zalogowanych.
drop policy if exists "realizations read" on storage.objects;
create policy "realizations read" on storage.objects for select to authenticated using (bucket_id = 'realizations');
drop policy if exists "realizations insert" on storage.objects;
create policy "realizations insert" on storage.objects for insert to authenticated with check (bucket_id = 'realizations');
drop policy if exists "realizations delete" on storage.objects;
create policy "realizations delete" on storage.objects for delete to authenticated using (bucket_id = 'realizations');
