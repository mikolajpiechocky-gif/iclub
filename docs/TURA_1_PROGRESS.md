# I tura poprawek — postęp

Źródło: `ICLUB_I_TURA_POPRAWEK_FINAL.md`. Realizacja iteracyjna, deploy po każdej porcji.
Legenda: ✅ zrobione · 🟡 częściowo · ⬜ do zrobienia.

## Kryteria zakończenia (§24)

1. ⬜ Kafelki pulpitu prowadzą do przefiltrowanych list (§4.2).
2. 🟡 „Wymaga uwagi" prowadzi do konkretnego rekordu (część linkuje do rekordu, część do list).
3. 🟡 Overbooking namiotów blokowany — jest ostrzeżenie per rozmiar; twardy blok serwer/baza do zrobienia (§10).
4. ⬜ Mobilny kalendarz pokazuje cały tydzień (§5.2).
5. ⬜ Priorytetowy widok weekendu (§5.2).
6. ⬜ Powiadomienia pod ikoną dzwonka w nagłówku (§5.5).
7. ⬜ Uproszczony formularz rezerwacji (§7).
8. ⬜ Liczba osób nie jest wymagana (§7.1).
9. ⬜ Daty montażu/demontażu domyślnie ukryte (§8).
10. ⬜ Domyślnie montaż w dniu imprezy, demontaż następnego dnia (§8).
11. ⬜ Duże namioty jako pula dwóch egzemplarzy (§10).
12. ⬜ Duży z tylnymi drzwiami jako konkretny zasób z tej samej puli (§10).
13. ⬜ Dodatkowy namiot jako osobna sekcja (§10.2).
14. ⬜ Dodatki korzystają z magazynu (§12).
15. ⬜ Pakiet ma własną cenę niezależną od sumy pozycji (§11).
16. ⬜ Boczne podsumowanie przelicza cenę na żywo (§13).
17. ⬜ Rabat % lub kwotowy, obejmuje całe zamówienie (§13.4).
18. ⬜ Zadatek domyślnie 300 zł + transport (§13.6).
19. ⬜ Transport przelicza się po wpisaniu adresu (§14.3).
20. ⬜ Widełki transportowe zgodne z dokumentem (§15).
21. ⬜ D×2 / D×4 wpływają tylko na koszt wewnętrzny (§16).
22. ⬜ Dokładnie 100 km = wyjazd bliski (§16.3).
23. ⬜ Daleki wyjazd > 100 km w jedną stronę (§16.3).
24. 🟡 Flota jednym źródłem danych o pojazdach (istnieje; scalenie transport/paliwo do potwierdzenia, §14).
25. ⬜ Magazyn w pełni edytowalny (§17).
26. ⬜ Audyt każdej zmiany magazynowej (§17.3).
27. ⬜ Pierwsze 4 realizacje Bartka → czas wolny (§19.1).
28. ⬜ Piąta+ → konfigurowalne 500 zł + dodatki (§19.2).
29. ⬜ Koszty i płatności — widoki miesięczne + filtry (§20).
30. ⬜ Nowa impreza istniejącego klienta → nowy lead (§6.3).
31. ⬜ Powrót do starego zapytania reaktywuje lead (§6.3).
32. ✅ Globalne nazewnictwo poprawione (§23: iClub, zadatek, Szef).
33. ✅ `lint`/typecheck bez błędów.
34. ✅ `build` bez błędów.

## Zrobione dodatkowo z §3–§4
- ✅ §3: usunięto notkę „Konta zakłada… Supabase" z ekranu logowania.
- ✅ §4.1: kolejność pulpitu — Podsumowanie → Wymaga uwagi → Najnowsze zapytania → Najbliższe realizacje.
- ✅ §4.3: usunięto kafelek „Konflikty namiotu" (walidacja ma blokować, nie informować).
