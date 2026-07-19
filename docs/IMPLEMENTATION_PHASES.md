# Fazy wdrożenia (status)

Kolejność wg §49 instrukcji master. Każda faza kończy się działającym
fragmentem, testami, lintem, buildem i raportem. Legenda: ✅ gotowe ·
🟡 w toku · ⬜ planowane.

| # | Faza | Status |
|---|---|---|
| 1 | Fundament: Supabase, Auth, profile, role, ochrona tras, warstwa danych, tryb demo | ✅ |
| 2 | Klienci i zapytania | ✅ |
| 3 | Rezerwacja iClub (część 1: zasoby, rezerwacja → auto zlecenie + etapy) | 🟡 |
| 4 | Magazyn i dostępność (część 1: sprzęt w bazie, magazyn na danych, kontrola konfliktu namiotu) | 🟡 |
| 5 | Pracownicy, stawki, premie, dostępność, przypisania, przewidywany zarobek (część 1: stawki/premie; część 2: przypisania do zleceń, samodzielne podjęcie, lider, bonus, przewidywany zarobek) | 🟡 |
| 6 | Kalendarz wspólny i osobisty, automatyczne zadania, powiadomienia (część 1: kalendarz na prawdziwych rezerwacjach + nawigacja miesięcy) | 🟡 |
| 7 | Flota, Google Maps, paliwo, plany transportowe, optymalizacja tras | ⬜ |
| 8 | Pakowanie | ⬜ |
| 9 | Realizacja iClub (część 1: mobilny ekran terenowy na prawdziwych danych, etapy do odhaczania, Zadzwoń/Nawiguj) | 🟡 |
| 10 | Demontaż i rozpakowanie | ⬜ |
| 11 | Wypożyczalnia (odbiór osobisty i dostawa) | ⬜ |
| 12 | Finanse i rentowność (część 1: płatności i koszty przypisane do zleceń, metody/statusy, weryfikacja właściciela) | 🟡 |
| 13 | Umowy, faktury, Google Calendar, SMS, e-mail, pogoda | ⬜ |
| 14 | PWA i offline (wstępnie: ikona aplikacji + manifest do „Dodaj do ekranu głównego") | 🟡 |

## Faza 3 — zakres szczegółowy

**Część 1 (zrobione teraz):**
- Konfigurowalne zasoby: `tents`, `packages`, `addons` (+ seed, ceny w bazie).
- `reservations`, `jobs`, `job_stages` (+ statusy, RLS).
- Tworzenie rezerwacji iClub → automatyczne zlecenie + etapy
  (Przygotowanie → … → Serwis).
- Lista i formularz rezerwacji, powiązanie z klientem, wybór pakietu/namiotu/dodatków.
- Lista zleceń i szczegóły zlecenia z etapami (widok na prawdziwych danych).
- Kalendarz wspólny na prawdziwych rezerwacjach (Faza 6 część 1).

**Część 2 (następne w tej fazie / Faza 4):**
- Automatyczna lista sprzętu z pakietu i dodatków.
- Sprawdzanie dostępności i blokowanie zasobów (okno logistyczne).
- Wykrywanie konfliktów (namiot, auto, pracownik) z możliwością nadpisania.
- Automatyczne wyliczenie ceny, kosztu i transportu.
- Pokazanie rezerwacji/zlecenia w kalendarzu.

## Pierwszy pełny proces pionowy (§50)

Docelowo cienki przepływ: logowanie → role → klienci → zapytania → rezerwacja
→ pakiet/namiot/dodatki → automatyczne zlecenie → kalendarz → przypisanie →
samodzielne podjęcie → blokada odpięcia → przewidywany zarobek → etapy →
architektura transportu. Realizowany etapami wg tabeli powyżej.
