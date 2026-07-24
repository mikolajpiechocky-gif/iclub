# iClub Management -- Korekty do II tury wdrożenia

## 1. Zestawy

Logika kolorów zestawów miała zostać całkowicie usunięta. Nadal
pojawiają się komunikaty o niedostępności koloru zestawu. **Usuń całą
logikę kolorów zestawów. Nie dodawaj wyjątków.**

## 2. Uprawnienia pracownika

Obecnie pracownik nie może dodawać ani edytować namiotów. To jest błąd.
Na obecnym etapie pracownik **powinien móc** dodawać oraz edytować
namioty.

## 3. Kafelek „Najbliższa realizacja"

Zamiast liczby osób wyświetlaj **ustaloną godzinę montażu**.

## 4. Tomasz Brudziński

Najprawdopodobniej realizacja posiada starą przykładową checklistę.
Zweryfikuj źródło i wygeneruj checklistę ponownie zgodnie z aktualnymi
regułami.

## 5. Rozładunek

Przebieg: Rozpocznij → Sprzęt rozpakowany → Samochód posprzątany →
Koszty dodane → Zakończ realizację

Przycisk **Dodaj koszt**: - nazwa - kwota - komentarz

Przycisk **Dodaj zgłoszenie**: - Uwaga - Incydent - Pomysł

## 6. Telefon do klienta

Dodaj potwierdzenie: - pakiet - dodatki - sztuczna trawa - godzina
montażu - miejsce - podłoże

## 7. Architektura nowych modułów

### Koszty

Każdy koszt posiada: - autora - datę - realizację - kategorię -
akceptację - historię zmian - możliwość odrzucenia - wpływ na
rozliczenie realizacji - wpływ na rentowność - eksport

### Zgłoszenia

Każde zgłoszenie posiada: - typ (Uwaga / Incydent / Pomysł) - autora -
datę - realizację - status - odpowiedź Szefa - historię zmian -
możliwość zamknięcia - możliwość przekształcenia w zadanie serwisowe lub
rozwojowe

## 8. Demontaż

Podczas demontażu wykorzystuj tę samą checklistę sprzętową.

Dla każdego elementu: - OK - wymaga czyszczenia - uszkodzony - brakuje

Możliwość dodania zdjęć i opisu.

Uwagi z demontażu i rozładunku zapisuj do wspólnej bazy zgłoszeń
serwisowych.
