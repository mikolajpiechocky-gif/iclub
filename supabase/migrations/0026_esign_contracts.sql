-- 0026 Podpis umowy kodem e-mail (forma dokumentowa, art. 77² k.c.).
-- Osobna tabela od public.contracts (tamta = umowa przy zleceniu, podpis na miejscu).
do $$ begin
  create type public.esign_status as enum ('draft','sent','signed','expired','cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.esign_contracts (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid references public.inquiries(id) on delete set null,
  order_no text,
  status public.esign_status not null default 'draft',
  -- treść (migawka z chwili wysyłki — niezmienna)
  document_html text,
  document_sha256 text,
  regulamin_version text,
  -- dane do umowy/maila
  signer_email text,
  delivery_hour text,          -- godzina montażu w umowie
  deposit_due text,            -- termin zadatku (np. "3 dni robocze")
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
  code_send_count int not null default 0,   -- rate-limit w oknie
  code_window_start timestamptz,
  -- dowód zawarcia
  signed_at timestamptz,
  signer_ip inet,
  signer_user_agent text,
  regulamin_accepted boolean,
  mail_message_id text,        -- dowód wysłania (id z bramki)
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_esign_token on public.esign_contracts (access_token);
create index if not exists idx_esign_inquiry on public.esign_contracts (inquiry_id);

drop trigger if exists trg_esign_updated_at on public.esign_contracts;
create trigger trg_esign_updated_at before update on public.esign_contracts
  for each row execute function public.set_updated_at();

alter table public.esign_contracts enable row level security;
-- Zalogowani (owner/employee) zarządzają w apce; publiczny podpis idzie przez service_role (omija RLS).
drop policy if exists esign_all_authenticated on public.esign_contracts;
create policy esign_all_authenticated on public.esign_contracts
  for all to authenticated using (true) with check (true);
