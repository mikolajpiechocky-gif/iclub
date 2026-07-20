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
- **Pulpit** i **ekran pracownika** na prawdziwych danych
- **Ikona/PWA** (dodanie do ekranu głównego)

## 🔑 Gotowe w kodzie — wymagają Twojego klucza/decyzji
- **Google Maps — auto-dystans** — działa lokalnie; na produkcji potrzebna zmienna `GOOGLE_MAPS_API_KEY` na Vercelu.

## ⬜ Jeszcze nie napisane (kolejne etapy)
- **Cennik pakietów/dodatków** — edycja cen pakietów i dodatków z panelu (dziś w bazie, bez ekranu edycji). Rozszerzenie Ustawień.
- **Zdjęcia z realizacji do chmury (Supabase Storage)** — teraz miejsca na zdjęcia działają lokalnie na urządzeniu; wysyłka i podgląd u właściciela to osobny etap.
- **Google Maps: Places Autocomplete** (podpowiadanie adresów) i **Route Optimization** (optymalizacja wielu dostaw) — §37.
- **Faktury (InFakt)** — §43.
- **Push / SMS / e-mail** — dostawcy — §8.
- **Google Calendar** — synchronizacja — §53.
- **PWA offline** — kolejka synchronizacji, praca bez zasięgu — §14.
- **Potwierdzenie klienta 7 dni przed**, **pogoda**, **rankingi/oceny** — §41, §42, §24.

## Wymagane do pełnych testów (kolejność)
1. **Uruchom komplet SQL** w Supabase: otwórz `supabase/setup_all.sql` (migracje 0001–0016, 24 tabele), skopiuj całość, wklej w SQL Editor, Run. Idempotentne. **To odblokowuje Magazyn, Pracowników, Flotę, Płatności, Koszty, Serwis itd.**
2. **Rola OWNER** dla Twojego konta (zrobione).
3. **Zmienne env na hostingu** (Supabase + opcjonalnie Google Maps) — najlepiej na **własnym projekcie Vercel** (iClub niezależny od Taurusa).
