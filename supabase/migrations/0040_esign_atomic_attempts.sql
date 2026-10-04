-- 0040: atomowy licznik prób kodu OTP — zapobiega obejściu limitu 5 prób przy równoległych żądaniach
-- (brute-force 6-cyfrowego kodu). Inkrementacja + odczyt w jednej instrukcji SQL.
create or replace function public.esign_bump_attempts(p_id uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  update public.esign_contracts
     set code_attempts = coalesce(code_attempts, 0) + 1
   where id = p_id
  returning code_attempts;
$$;

revoke all on function public.esign_bump_attempts(uuid) from public, anon, authenticated;
grant execute on function public.esign_bump_attempts(uuid) to service_role;
