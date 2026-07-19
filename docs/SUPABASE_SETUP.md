# Konfiguracja Supabase (krok po kroku)

Ten dokument opisuje, jak włączyć logowanie i prawdziwą bazę danych. Dopóki
tego nie zrobisz, aplikacja działa w **TRYBIE DEMO** (dane przykładowe,
logowanie wyłączone) — możesz spokojnie testować interfejs.

Część kroków wymaga Twojego logowania do Supabase i skopiowania kluczy —
tego nie mogę zrobić za Ciebie. Reszta jest po mojej stronie.

---

## Co musisz zrobić Ty (kroki wymagające Twojego konta)

### 1. Załóż projekt Supabase
1. Wejdź na https://supabase.com i zaloguj się (lub załóż darmowe konto).
2. Kliknij **New project**.
3. Podaj nazwę (np. `iclub`), hasło do bazy (zapisz je) i region **Europe** (np. Frankfurt).
4. Poczekaj ~1–2 minuty, aż projekt się utworzy.

### 2. Skopiuj klucze API
1. W projekcie wejdź w **Project Settings** (koło zębate) → **API**.
2. Skopiuj dwie wartości:
   - **Project URL** (np. `https://abcdxyz.supabase.co`)
   - **anon public** (długi klucz zaczynający się od `eyJ...`)
3. Przekaż mi te dwie wartości **albo** wpisz je samodzielnie do pliku `.env.local`
   (patrz niżej). Klucz `anon` jest przeznaczony do użytku publicznego, więc jest bezpieczny w aplikacji.

> Jeśli podasz mi te dwie wartości, ja utworzę plik `.env.local` i wykonam resztę.

### 3. Utwórz tabele (migracja)
1. W projekcie Supabase wejdź w **SQL Editor** → **New query**.
2. Otwórz plik **`supabase/setup_all.sql`** z tego repozytorium, skopiuj **całą**
   jego treść i wklej do edytora SQL.
3. Kliknij **Run**. Powinno pojawić się „Success”.

> `setup_all.sql` łączy migracje 0001+0002+0003 (profiles, customers, inquiries,
> tents, packages, addons, reservations, jobs, job_stages) wraz z RLS, triggerami
> i danymi startowymi (namioty, pakiety, dodatki). Można go uruchomić raz.

### 4. Utwórz konto właściciela
1. W Supabase wejdź w **Authentication** → **Users** → **Add user** → **Create new user**.
2. Podaj swój e-mail i hasło (zaznacz „Auto Confirm User”, aby nie było potrzeby potwierdzania mailem).
3. Nadaj sobie rolę właściciela — wróć do **SQL Editor** i uruchom (podmień e-mail):
   ```sql
   update public.profiles
   set role = 'OWNER'
   where id = (select id from auth.users where email = 'twoj@email.pl');
   ```
4. Kolejnych pracowników dodajesz tak samo (krok 1–2); domyślnie dostają rolę `EMPLOYEE`.

---

## Co robię ja (po otrzymaniu kluczy)

1. Tworzę plik `.env.local` z Twoimi wartościami:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://twoj-projekt.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
2. Restartuję serwer. Od tego momentu:
   - wejście na dowolny ekran przekierowuje do **/login**,
   - po zalogowaniu widać prawdziwe dane,
   - moduły **Klienci** i **Zapytania** zapisują dane do Supabase.

---

## Samodzielne wpisanie kluczy (opcjonalnie)

Jeśli wolisz nie przekazywać kluczy w rozmowie, możesz sam utworzyć plik
`.env.local` w katalogu `C:\Projekty\iclub` (skopiuj `.env.example`) i wpisać
wartości. Potem daj znać — zrestartuję serwer.

Plik `.env.local` **nie trafia do repozytorium** (jest w `.gitignore`), więc
klucze pozostają lokalne.

---

## Częste pytania

- **Czy muszę używać terminala?** Nie. Migrację wklejasz w edytorze SQL w
  przeglądarce, konta zakładasz w panelu Supabase. Resztę robię ja.
- **Czy stracę dane demo?** Nie. Ekrany jeszcze niepodłączone dalej pokazują
  dane przykładowe. Podłączone (Klienci, Zapytania) po konfiguracji pokazują
  prawdziwe dane.
- **Czy to kosztuje?** Darmowy plan Supabase w zupełności wystarcza na start.
