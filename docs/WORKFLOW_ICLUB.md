# Proces iClub — przepływ rezerwacji i realizacji

Opis stanu wdrożonego oraz kierunku. Zakres docelowy: §13, §17–§25, §28 instrukcji master.

## Wdrożone (Faza 3, część 1)

### Od zapytania do zlecenia
1. **Klient** (moduł Klienci) i **Zapytanie** (moduł Zapytania) — Faza 2.
2. **Rezerwacja iClub** (`/reservations/new`): wybór klienta, wydarzenia,
   terminów (impreza / montaż / demontaż), lokalizacji, liczby osób,
   **namiotu**, **pakietu** (Standard/Premium/VIP), **dodatków** (dosprzedaż),
   wartości, rabatu, zaliczki, trybu prywatnie/FV, źródła i notatek.
3. **Status rezerwacji**: `TEMPORARY` (domyślnie, z terminem wygaśnięcia +48h),
   `CONFIRMED`, `CANCELLED`, `EXPIRED`.
4. **Automatyzacja przy zapisie**: powstaje **zlecenie** (`jobs`) oraz
   **podstawowe etapy** (`job_stages`) z szablonu domenowego:
   Przygotowanie → Pakowanie → Montaż → Przekazanie → Demontaż → Powrót →
   Rozpakowanie → Serwis.

Szablon etapów: `lib/domain/stages.ts`. Zasoby (namioty/pakiety/dodatki) są
konfigurowalne w bazie (migracja `0002`), nie zaszyte w kodzie.

## Następne kroki (kolejne części)

- Automatyczna lista sprzętu z pakietu i dodatków, dostępność, blokady, konflikty.
- Wycena (pakiet + dodatki + transport + korekty), koszt, marża.
- Kalendarz (wspólny/osobisty) i przypisania pracowników.
- Pakowanie, realizacja, szkolenie klienta, rozliczenie, demontaż, rozpakowanie.
- Umowa iClub, potwierdzenie klienta 7 dni przed, pogoda.

## Statusy (kierunek, §48)

Docelowo osobne stany i historia dla: zapytania, rezerwacji, zlecenia, każdego
etapu, płatności, umowy, faktury, incydentu, serwisu i planu transportowego.
Obecnie wdrożone: statusy zapytania, rezerwacji, zlecenia i etapu.
