# I tura poprawek — postęp

Źródło: `ICLUB_I_TURA_POPRAWEK_FINAL.md`. Realizacja iteracyjna, deploy po każdej porcji.
Legenda: ✅ zrobione · 🟡 częściowo · ⬜ do zrobienia.

## Kryteria zakończenia (§24)

1. ✅ Kafelki pulpitu prowadzą do przefiltrowanych list — MetricCard klikalny (`href`), filtry `?filter=` w rezerwacjach (bez zadatku / najbliższe 7 dni / do potwierdzenia / nadchodzące / faktura), `?status=` w zapytaniach, banner filtra z „Wyczyść" (§4.2).
2. ✅ „Wymaga uwagi" — każda pozycja linkuje do miejsca rozwiązania (rekord rezerwacji, ustawienia cen paliwa, moduł ogłoszeń) (§4.4).
3. ✅ Overbooking namiotów blokowany — twardy blok przy zapisie (serwer), z wyjątkiem Szefa (checkbox + powód) (§10/§3).
4. ⬜ Mobilny kalendarz pokazuje cały tydzień (§5.2).
5. ⬜ Priorytetowy widok weekendu (§5.2).
6. ✅ Powiadomienia pod ikoną dzwonka w nagłówku (§5.5) — licznik, panel, przejście do rekordu, oznaczanie, „Zobacz wszystkie"; usunięto zakładkę.
7. ✅ Uproszczony formularz rezerwacji — sekcje Klient i lokalizacja → Namiot i pakiet → Dodatki → Informacje dodatkowe → Rozliczenie; status ukryty przy tworzeniu (nadawany automatycznie), widoczny tylko w edycji (§7).
8. ✅ Liczba osób opcjonalna — przeniesiona na dół, nie blokuje zapisu (§7.1).
9. ✅ Daty montażu/demontażu domyślnie ukryte — rozwijana sekcja „Montaż lub demontaż w innym terminie" (§8).
10. ✅ Domyślnie montaż w dniu imprezy, demontaż następnego dnia — logika po stronie serwera (`nextDayIso`), okno overbookingu spójne (§8).
11. ✅ Duże namioty jako pula dwóch egzemplarzy (§10).
12. ✅ Duży z tylnymi drzwiami jako konkretny zasób z tej samej puli (§10).
13. ✅ Dodatkowy namiot jako osobna sekcja (+ gastronomiczny) (§10.2).
14. ⬜ Dodatki korzystają z magazynu (§12).
15. ⬜ Pakiet ma własną cenę niezależną od sumy pozycji (§11).
16. ⬜ Boczne podsumowanie przelicza cenę na żywo (§13).
17. ⬜ Rabat % lub kwotowy, obejmuje całe zamówienie (§13.4).
18. ⬜ Zadatek domyślnie 300 zł + transport (§13.6).
19. ✅ Transport przelicza się z mapy — „Oblicz z mapy" zwraca odległość w jedną stronę + sugerowaną cenę i klasę trasy (§14.3).
20. ✅ Widełki transportowe zgodne z dokumentem — `TRANSPORT_BRACKETS`, cena dla klienta wg odległości w jedną stronę, >400 km → wycena indywidualna (§15).
21. ✅ D×2 / D×4 wpływają tylko na koszt wewnętrzny (paliwo + eksploatacja liczone od planowanych km); cena klienta niezależna od mnożnika (§16).
22. ✅ Dokładnie 100 km = wyjazd bliski (`tripClass`: daleki dopiero >100) (§16.3).
23. ✅ Daleki wyjazd > 100 km w jedną stronę — powrót do bazy zablokowany, wymuszony D×2 (§16.3).
24. 🟡 Flota jednym źródłem danych o pojazdach (istnieje; scalenie transport/paliwo do potwierdzenia, §14).
25. ⬜ Magazyn w pełni edytowalny (§17).
26. ⬜ Audyt każdej zmiany magazynowej (§17.3).
27. ⬜ Pierwsze 4 realizacje Bartka → czas wolny (§19.1).
28. ⬜ Piąta+ → konfigurowalne 500 zł + dodatki (§19.2).
29. ⬜ Koszty i płatności — widoki miesięczne + filtry (§20).
30. ✅ Nowa impreza istniejącego klienta → nowy lead (§6.3) — każde zapytanie to osobny rekord powiązany z klientem; nowy wątek OLX = nowy lead.
31. ✅ Powrót do starego zapytania reaktywuje lead (§6.3) — nowa wiadomość OLX do przegranego = „Odgrzany" (auto), plus ręczny przycisk „Odgrzej leada"; zachowana historia (poprzedni status, licznik i data reaktywacji).
32. ✅ Globalne nazewnictwo poprawione (§23: iClub, zadatek, Szef).
33. ✅ `lint`/typecheck bez błędów.
34. ✅ `build` bez błędów.

## Zrobione dodatkowo z §3–§4
- ✅ §3: usunięto notkę „Konta zakłada… Supabase" z ekranu logowania.
- ✅ §4.1: kolejność pulpitu — Podsumowanie → Wymaga uwagi → Najnowsze zapytania → Najbliższe realizacje.
- ✅ §4.3: usunięto kafelek „Konflikty namiotu" (walidacja ma blokować, nie informować).
- ✅ §5.4: kolory ikon pogody — upał żółty, deszcz niebieski, wiatr pomarańczowy, OK zielony (kalendarz + rezerwacja).
- ✅ §5.5: dzwonek powiadomień w nagłówku; zakładka „Powiadomienia" usunięta z menu.
- ✅ §6 Leady: status „Odgrzany", śledzenie ostatniej aktywności, auto-zamykanie po 21 dniach (`automatic_inactivity`, z blokadą Szefa; trasa /api/leads/auto-close dla crona + przycisk), OLX nie nadpisuje ręcznych danych CRM (tylko treść wiadomości), reaktywacja auto+ręczna. Wymaga migracji 0030.
- ✅ §10 Namioty: wybór przez TYP (Mały/Duży/Duży z drzwiami/Gastro), pule pojemności (mały 1, duży 2 w tym 1 z drzwiami, gastro 1), twardy blok overbookingu przy zapisie z wyjątkiem Szefa (powód). Wymaga migracji 0031.
- ✅ §15–16 Transport: widełki cenowe dla klienta wg odległości w jedną stronę (20/50/100/150/200/250/300/400 km → 200/300/350/400/450/500/600/900 zł; >400 km indywidualnie), mnożnik przejazdu D×2 (auto zostaje) / D×4 (wraca do bazy, tylko ≤100 km) wpływa wyłącznie na koszt wewnętrzny, klasyfikacja bliski ≤100 / daleki >100. Wymaga migracji 0032.
