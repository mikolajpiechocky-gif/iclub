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
- **Ustawienia** (tylko właściciel) — adres bazy, ceny paliwa (benzyna/diesel/LPG), godziny realizacji iClub, VAT. Wartości nie są zaszyte w kodzie — transport, prefill paliwa i wyliczenia zarobku czytają z ustawień.
- **Cennik** (tylko właściciel) — ceny pakietów (Standard/Premium/VIP) i dodatków; rezerwacja podpowiada wartość z cennika (pakiet + dodatki).
- **Pulpit** i **ekran pracownika** na prawdziwych danych
- **Ikona/PWA** (dodanie do ekranu głównego)

## 🔑 Gotowe w kodzie — wymagają Twojego klucza/decyzji
- **Google Maps — auto-dystans** — działa lokalnie; na produkcji potrzebna zmienna `GOOGLE_MAPS_API_KEY` na Vercelu.
- **Podpowiadanie adresów (Places Autocomplete)** — gotowe w kodzie; wymaga włączenia **„Places API (New)"** na kluczu Google + `GOOGLE_MAPS_API_KEY` na Vercelu. Bez tego pole adresu działa jak zwykły input (bez podpowiedzi).
- **Planer tras / optymalizacja (Route Optimization)** — wybór dnia + pojazdu → optymalna kolejność realizacji + dystans/czas/koszt wewnętrzny. Używa Routes API (klucz masz ustawiony). Bez klucza pokazuje komunikat, nie liczy.

## ⬜ Jeszcze nie napisane (kolejne etapy)
- **Faktury (InFakt)** — §43.
- **Push / SMS / e-mail** — dostawcy — §8.
- **Google Calendar** — synchronizacja — §53.
- **PWA offline** — kolejka synchronizacji, praca bez zasięgu — §14.
- **Potwierdzenie klienta 7 dni przed**, **pogoda**, **rankingi/oceny** — §41, §42, §24.

## Wymagane do pełnych testów (kolejność)
1. **Uruchom komplet SQL** w Supabase: otwórz `supabase/setup_all.sql` (migracje 0001–0016, 24 tabele), skopiuj całość, wklej w SQL Editor, Run. Idempotentne. **To odblokowuje Magazyn, Pracowników, Flotę, Płatności, Koszty, Serwis itd.**
2. **Rola OWNER** dla Twojego konta (zrobione).
3. **Zmienne env na hostingu** (Supabase + opcjonalnie Google Maps) — najlepiej na **własnym projekcie Vercel** (iClub niezależny od Taurusa).
