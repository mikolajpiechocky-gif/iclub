-- =====================================================================
-- iClub Management — migracja 0025: ochrona pola role w profiles
-- 1) Role zmienia tylko wlasciciel (bez tego pracownik moglby sam podniesc
--    sobie role przez bezposrednie API — polityka RLS pozwala edytowac wlasny
--    wiersz dla imienia).
-- 2) Musi zostac przynajmniej jeden wlasciciel — atomowo (advisory lock), zeby
--    dwie rownolegle degradacje nie zredukowaly liczby wlascicieli do zera.
-- =====================================================================
create or replace function public.guard_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and not public.is_owner() then
    raise exception 'Tylko wlasciciel moze zmieniac role uzytkownika';
  end if;
  if old.role = 'OWNER' and new.role <> 'OWNER' then
    perform pg_advisory_xact_lock(hashtext('iclub_owner_role'));
    if (select count(*) from public.profiles where role = 'OWNER') <= 1 then
      raise exception 'Musi zostac przynajmniej jeden wlasciciel';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_profile_role on public.profiles;
create trigger trg_guard_profile_role before update on public.profiles
  for each row execute function public.guard_profile_role();
