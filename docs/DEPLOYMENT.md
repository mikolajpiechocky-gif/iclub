# Wdrożenie: Vercel + domena app.iclubevent.pl

Aplikacja (Next.js 16) działa na **Vercel**. Baza i logowanie na **Supabase**
(patrz `SUPABASE_SETUP.md`). Domena docelowa: **app.iclubevent.pl**.

Legenda: 🧑 robisz Ty (wymaga Twojego konta/dostępu) · 🤖 robię ja.

---

## A. Kod na GitHub (Vercel wdraża z repozytorium)

- 🧑 **Załóż konto GitHub** (https://github.com) — jeśli jeszcze nie masz.
- 🧑 **Utwórz puste repozytorium**: New repository → nazwa `iclub` → **Private** →
  **bez** README/gitignore → Create. Skopiuj adres, np.
  `https://github.com/twojlogin/iclub.git`.
- 🤖 Ja zrobię commit i wypchnę kod do tego repozytorium (po Twoim „zrób commit"
  i podaniu adresu repo). Jeśli GitHub poprosi o autoryzację z tego komputera,
  poproszę Cię o jedno kliknięcie/token.

## B. Projekt na Vercel

- 🧑 **Załóż konto Vercel** (https://vercel.com) — zaloguj się **przez GitHub**.
- 🧑 **Add New… → Project** → wybierz repozytorium `iclub` → **Import**.
- 🧑 W kroku konfiguracji **Environment Variables** dodaj dwie zmienne
  (te same co lokalnie z Supabase):
  - `NEXT_PUBLIC_SUPABASE_URL` = `https://twoj-projekt.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `eyJ...`
- 🧑 Kliknij **Deploy**. Po ~1–2 min dostaniesz adres testowy
  `https://iclub-xxxx.vercel.app`.

> Framework wykryje się automatycznie (Next.js). Nic nie zmieniaj w Build/Output.
> Plik `.env.local` **nie** jest wysyłany do Vercela — dlatego zmienne wpisujemy
> w panelu Vercel.

## C. Domena app.iclubevent.pl

- 🧑 W Vercel: **Project → Settings → Domains → Add** → wpisz
  **`app.iclubevent.pl`** → **Add**.
- Vercel pokaże rekord DNS do dodania. Zwykle:
  - **Typ:** `CNAME`
  - **Nazwa/Host:** `app`
  - **Wartość/Target:** `cname.vercel-dns.com` (użyj dokładnie tego, co pokaże Vercel)
- 🧑 Zaloguj się do panelu, gdzie kupiłeś **iclubevent.pl** (np. home.pl, nazwa.pl,
  OVH, cyberFolks) → sekcja **DNS / Strefa DNS** → **dodaj rekord CNAME** z
  powyższymi wartościami → zapisz.
- Odczekaj od kilku minut do kilku godzin (propagacja DNS). Vercel sam wystawi
  certyfikat **HTTPS**. Status „Valid Configuration" = gotowe.

> Nie ruszaj rekordu głównego `iclubevent.pl` (strony firmowej). Dodajemy tylko
> **subdomenę `app`**.

## D. Podłącz domenę do logowania Supabase

Aby logowanie działało na domenie produkcyjnej:

- 🧑 Supabase → **Authentication → URL Configuration**:
  - **Site URL:** `https://app.iclubevent.pl`
  - **Redirect URLs:** dodaj `https://app.iclubevent.pl/**`
- 🤖 W razie potrzeby dostosuję kod (adresy przekierowań) — na razie logowanie
  e-mail/hasło działa bez dodatkowej konfiguracji.

## E. Kolejne wdrożenia (automatyczne)

Po połączeniu z GitHub **każdy commit** na gałąź główną = automatyczne
wdrożenie na Vercel. 🤖 Ja przygotowuję zmiany i (po Twojej zgodzie) commituję;
Vercel sam publikuje nową wersję na `app.iclubevent.pl`.

---

## Kolejność (skrót)

1. 🧑 GitHub: konto + puste repo `iclub` → podaj mi adres.
2. 🤖 Ja: commit + push kodu.
3. 🧑 Vercel: konto → Import repo → dodaj 2 zmienne Supabase → Deploy.
4. 🧑 Vercel: Domains → `app.iclubevent.pl` → skopiuj rekord CNAME.
5. 🧑 Rejestrator domeny: dodaj rekord CNAME `app → cname.vercel-dns.com`.
6. 🧑 Supabase: Site URL + Redirect URL na `https://app.iclubevent.pl`.
7. Gotowe — aplikacja pod `https://app.iclubevent.pl`.

## Uwagi

- Sekrety (klucze) trzymamy w zmiennych środowiskowych (Vercel/Supabase), nie w kodzie.
- Port 3001 dotyczy tylko pracy lokalnej; na Vercel nie ma znaczenia.
- Darmowy plan Vercel (Hobby) wystarcza na start; do użytku firmowego rozważ plan Pro.
