# Gotowość do testów — co jest, czego brakuje

Stan na teraz. Legenda: ✅ gotowe i działa · 🔑 gotowe w kodzie, wymaga klucza/decyzji · ⬜ jeszcze nie napisane.

## ✅ Zbudowane i działające (po uruchomieniu SQL)
- **Logowanie, role OWNER/EMPLOYEE, ochrona tras**
- **Klienci** (lista, dodawanie, edycja)
- **Zapytania** (lista, dodawanie, edycja, statusy)
- **Rezerwacje = realizacje** — jedno wydarzenie w jednym miejscu. Hub rezerwacji (`/reservations/[id]`) łączy sprzedaż + operacje: etapy, zespół, przewidywany zarobek, bonus, pojazdy, transport, umowa. Osobna zakładka „Zlecenia” zniesiona.
- **Kalendarz** (na prawdziwych rezerwacjach, nawigacja miesięcy)
- **Magazyn** (namioty + sprzęt)
- **Pracownicy** (stawki, premie — tylko OWNER)
- **Użytkownicy** (tylko OWNER) — lista, zmiana ról (Właściciel/Pracownik) i imion, ochrona „musi zostać właściciel", **dodawanie nowych kont** (nowe konto = Pracownik, panel pokazuje hasło tymczasowe do przekazania). Wymaga `SUPABASE_SERVICE_ROLE_KEY` na serwerze (ustawione na Vercel).
- **Dostępność** pracowników (+ ostrzeżenie przy przypisaniu)
- **Flota** (pojazdy, przypisanie do zleceń, konflikt pojazdu)
- **Transport + koszt paliwa** (wzór; ręczny dystans lub „Oblicz z mapy")
- **Realizacje mobilne** — osobne bloki: Pakowanie + kroki z własnymi czynnościami (W drodze / Montaż / Szkolenie klienta / Zdjęcia / Rozliczenie / Demontaż), Zadzwoń/Nawiguj, zgłoszenie odbioru płatności
- **Zdjęcia z realizacji** — pracownik robi zdjęcia w terenie, zapisują się do chmury (Supabase Storage, prywatny bucket), właściciel widzi je w rezerwacji
- **Checklisty pakowania** (generowane z konfiguracji, zakończenie mimo braków)
- **Zgłoszenia i szkody / incydenty**
- **Serwis** (zadania serwisowe)
- **Podpis klienta** (protokół, podpis palcem)
- **Umowy iClub** (generator + druk/PDF + status)
- **Płatności** (metody, weryfikacja gotówki przez OWNER)
- **Koszty** (kategorie, weryfikacja)
- **Raporty / rentowność** (przychód − koszty, per zlecenie i per linia)
- **Powiadomienia in-app** (+ badge, powiadomienie przy przypisaniu)
- **Potwierdzenie klienta przed realizacją** — pulpit pokazuje realizacje ≤7 dni czekające na potwierdzenie; oznaczanie „potwierdzone" w rezerwacji (wysyłkę SMS/e-mail dołożymy przy dostawcach)
- **Pogoda w rezerwacji** — prognoza (Open-Meteo, darmowe) + ostrzeżenia (wiatr >20 km/h, opady, temp >25°C) dla dat w zasięgu ~14 dni. Współrzędne z geokodowania Google (klucz Map).
- **Faktury VAT (szkielet)** — rezerwacje na FV: status „do wystawienia / wystawiona" (+ numer), rozbicie brutto/netto/VAT, wymóg NIP klienta, przypomnienie na pulpicie po realizacji. Automatyczne wystawianie w InFakt — po podaniu klucza API.
- **Ustawienia** (tylko właściciel) — adres bazy, ceny paliwa (benzyna/diesel/LPG), godziny realizacji iClub, VAT. Wartości nie są zaszyte w kodzie — transport, prefill paliwa i wyliczenia zarobku czytają z ustawień.
- **Cennik** (tylko właściciel) — ceny pakietów (Standard/Premium/VIP) i dodatków; rezerwacja podpowiada wartość z cennika (pakiet + dodatki).
- **Pulpit** i **ekran pracownika** na prawdziwych danych
- **Ikona/PWA** (dodanie do ekranu głównego)

## 🔑 Gotowe w kodzie — wymagają Twojego klucza/decyzji
- **Google Maps — auto-dystans** — działa lokalnie; na produkcji potrzebna zmienna `GOOGLE_MAPS_API_KEY` na Vercelu.
- **Podpowiadanie adresów (Places Autocomplete)** — gotowe w kodzie; wymaga włączenia **„Places API (New)"** na kluczu Google + `GOOGLE_MAPS_API_KEY` na Vercelu. Bez tego pole adresu działa jak zwykły input (bez podpowiedzi).
- **Planer tras / optymalizacja (Route Optimization)** — wybór dnia + pojazdu → optymalna kolejność realizacji + dystans/czas/koszt wewnętrzny. Używa Routes API (klucz masz ustawiony). Bez klucza pokazuje komunikat, nie liczy.
- **Dodawanie użytkowników z panelu** — gotowe; wymaga `SUPABASE_SERVICE_ROLE_KEY` na hostingu (ustawione na Vercel). Lokalnie bez tej zmiennej panel pokazuje komunikat zamiast formularza.
- **Google Calendar (synchronizacja)** — apka = źródło prawdy; zapis/edycja rezerwacji tworzy/aktualizuje wydarzenie (anulowana/wygasła znika). Konto usługi zweryfikowane lokalnie. **Na produkcji wymaga 3 zmiennych na Vercel:** `GOOGLE_SA_CLIENT_EMAIL`, `GOOGLE_SA_PRIVATE_KEY`, `GOOGLE_CALENDAR_ID`. Bez nich sync jest po prostu pomijany.

## ⬜ Jeszcze nie napisane (kolejne etapy)
- **Faktury — pełna integracja InFakt** (automatyczne wystawianie/wysyłka; szkielet już gotowy — patrz ✅) — wymaga konta i klucza API InFakt — §43.
- **Push / SMS / e-mail** — dostawcy (w tym wysyłka próśb o potwierdzenie do klienta) — §8, §42.
- **PWA offline** — kolejka synchronizacji, praca bez zasięgu — §14.
- **Rankingi/oceny** (§24).

## Wymagane do pełnych testów (kolejność)
1. **Uruchom komplet SQL** w Supabase: otwórz `supabase/setup_all.sql` (migracje 0001–0024), skopiuj całość, wklej w SQL Editor, Run. Idempotentne. **To odblokowuje Magazyn, Pracowników, Flotę, Płatności, Koszty, Serwis, Ustawienia, Cennik, zdjęcia, faktury, Kalendarz itd.**
2. **Rola OWNER** dla Twojego konta (zrobione).
3. **Zmienne env na hostingu** (Supabase + opcjonalnie Google Maps) — najlepiej na **własnym projekcie Vercel** (iClub niezależny od Taurusa).
