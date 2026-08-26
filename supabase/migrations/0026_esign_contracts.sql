-- 0026 Podpis umowy kodem e-mail (forma dokumentowa, art. 77² k.c.).
-- Umowa wisi POD ZLECENIEM (job_id). Osobna tabela od public.contracts (tamta = podpis na miejscu).
do $$ begin
  create type public.esign_status as enum ('draft','sent','signed','expired','cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.esign_contracts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete cascade,   -- zlecenie, którego dotyczy umowa
  reservation_id uuid,                                         -- bez FK (wygoda/odporność migracji)
  inquiry_id uuid,                                             -- bez FK (źródłowy lead)
  order_no text,
  status public.esign_status not null default 'draft',
  -- treść (migawka z chwili wysyłki — niezmienna)
  document_html text,
  document_sha256 text,
  regulamin_version text,
  -- dane do umowy/maila
  signer_email text,
  delivery_hour text,          -- godzina montażu (z pakietu)
  deposit_due text,            -- termin zadatku
  amount_total numeric(10,2),
  amount_deposit numeric(10,2),
  -- adres umowy (token) — ≥32 bajty, URL-safe
  access_token text not null unique,
  token_expires_at timestamptz,
  -- kod jednorazowy (tylko skrót)
  code_hash text,
  code_expires_at timestamptz,
  code_attempts int not null default 0,
  code_sent_at timestamptz,
  code_send_count int not null default 0,
  code_window_start timestamptz,
  -- dowód zawarcia
  signed_at timestamptz,
  signer_ip inet,
  signer_user_agent text,
  regulamin_accepted boolean,
  mail_message_id text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_esign_job on public.esign_contracts (job_id);
create index if not exists idx_esign_token on public.esign_contracts (access_token);

drop trigger if exists trg_esign_updated_at on public.esign_contracts;
create trigger trg_esign_updated_at before update on public.esign_contracts
  for each row execute function public.set_updated_at();

alter table public.esign_contracts enable row level security;
drop policy if exists esign_all_authenticated on public.esign_contracts;
create policy esign_all_authenticated on public.esign_contracts
  for all to authenticated using (true) with check (true);
