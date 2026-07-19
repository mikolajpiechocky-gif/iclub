# Plan realizacji

## Cel dokumentu

Połączyć etapy produktu z powtarzalnym cyklem dostarczania małych, sprawdzalnych funkcji.

## Stan obecny

Rozpoczęto budowę MVP 1. Zrealizowano fundament techniczny i pierwszy pionowy
moduł.

Zrobione:
- Supabase, klienci serwer/przeglądarka, ochrona tras (`proxy.ts`), tryb demo jako fallback.
- Model danych MVP 1: `profiles`, `customers`, `inquiries` (migracja `0001`).
- Logowanie e-mail/hasło, role `OWNER`/`EMPLOYEE`, wylogowanie.
- Warstwa danych `lib/data/*`.
- Moduł **Klienci** (lista, dodawanie, edycja, walidacja).
- Moduł **Zapytania** (lista, dodawanie, edycja, powiązanie z klientem, statusy).
- Moduł **Rezerwacje iClub** (część 1): zasoby konfigurowalne, rezerwacja →
  automatyczne zlecenie i etapy.

Pełny status faz: `docs/IMPLEMENTATION_PHASES.md`. Następny krok to dokończenie
Fazy 3 / Faza 4: automatyczna lista sprzętu, dostępność, blokady i konflikty.

## Proponowana kolejność MVP 1

1. Potwierdzenie pól, statusów i kryteriów akceptacji podstawowego procesu.
2. Projekt modelu danych bez funkcji dodatkowych.
3. Supabase i minimalne uwierzytelnianie dla `OWNER` oraz `EMPLOYEE`.
4. Klient i zapytanie.
5. Rezerwacja tymczasowa i podstawowa dostępność namiotu.
6. Zlecenie, przypisanie zasobów i realizacja.
7. Kalendarz.
8. Szczegóły dla pracownika i podstawowa checklista.
9. Zakończenie, płatność i koszt.
10. Test całego procesu na rzeczywistym przykładowym zleceniu.

Każdy punkt wymaga osobnego zadania i nie jest autoryzacją do rozpoczęcia implementacji.

## Cykl realizacji każdej funkcji

1. Doprecyzowanie problemu biznesowego i kryteriów akceptacji.
2. Ustalenie minimalnego zakresu.
3. Krótki plan Codexa.
4. Automatyczna implementacja.
5. Lint i build.
6. Testy automatyczne, gdy istnieją.
7. Test ręczny użytkownika.
8. Zebranie uwag i aktualizacja dokumentacji.
9. Commit dopiero po akceptacji.
10. Kolejna iteracja.

## Warunki zakończenia MVP 1

- Właściciel przechodzi od klienta i zapytania do zakończonej realizacji.
- System ostrzega o podstawowym konflikcie namiotu.
- Pracownik widzi realizację i kończy checklistę zgodnie z regułą braków.
- Płatność i co najmniej jeden koszt są zapisane przy zleceniu i linii biznesowej.
- Pełny proces przechodzi test na komputerze i telefonie w trybie online.

## Kwestie do uzupełnienia

Do ustalenia: szczegółowe kryteria akceptacji, dane testowe, zakres testów automatycznych i kolejność wdrażania minimalnych uprawnień.

## Rozwój iteracyjny

MVP 2 rozpocznie się dopiero po testach głównego procesu i potwierdzeniu, że model nie wymaga istotnej korekty.
