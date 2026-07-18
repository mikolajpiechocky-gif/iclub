# Bieżący zakres

## Cel dokumentu

Oddzielić wymagania zatwierdzone, propozycję etapów i funkcje świadomie odłożone.

## Stan obecny

Gotowe są fundament Next.js i dokumentacja. Nie ma jeszcze backendu, logowania ani modułów biznesowych.

## Zatwierdzone wymagania

- Wewnętrzna, responsywna PWA na komputer, Android i iOS.
- Przyszły backend: Supabase; role: `OWNER` i `EMPLOYEE`.
- Linie `ICLUB` i `EQUIPMENT_RENTAL` z osobną analizą finansową.
- Magazyn bazowy: Dopiewo; realizacje iClub mogą odbywać się w całej Polsce.
- Pełny dostęp właściciela. Pracownik widzi wszystkie zlecenia, klientów i wartości zleceń; może uzgodnić godzinę, realizować checklisty, rejestrować czas, dodawać koszty, zdjęcia i szkody, zbierać podpis oraz zgłaszać odbiór gotówki. Nie widzi wynagrodzeń, stawek ani konfiguracji właściciela. Część tych możliwości należy do etapów po MVP 1.
- Rezerwacja tymczasowa domyślnie trwa 48 godzin, może być przedłużona i blokuje zasoby nawet bez zadatku.
- Konflikty dostępności ostrzegają, lecz właściciel może je świadomie zaakceptować.
- Wszystkie kwoty są brutto, a system ma również przechowywać stawkę VAT.

## Propozycja: MVP 1

Minimalny pełny proces operacyjny:

1. Klient i zapytanie z podstawowymi danymi, źródłem, terminem, lokalizacją, potrzebą i statusem.
2. Rezerwacja tymczasowa z terminem wygaśnięcia, informacją o zadatku i blokadą namiotu lub podstawowego sprzętu.
3. Podstawowa kontrola nakładających się rezerwacji i zleceń dla namiotu; ostrzeżenie możliwe do zaakceptowania przez właściciela.
4. Przekształcenie rezerwacji w zlecenie z linią biznesową, terminami realizacji, namiotem i podstawowym sprzętem.
5. Kalendarz zleceń i realizacji.
6. Konto `OWNER` i `EMPLOYEE` z minimalnymi uprawnieniami potrzebnymi do procesu.
7. Widok szczegółów realizacji dla pracownika.
8. Jedna podstawowa, dynamicznie utworzona checklista realizacji z ostrzeżeniem i wyjaśnieniem przy brakach.
9. Zakończenie realizacji.
10. Zapis podstawowej płatności i kosztu przypisanych do zlecenia oraz linii biznesowej.

MVP 1 celowo nie obejmuje pełnego offline, zaawansowanego magazynu, dokumentów, zdjęć ani integracji. Pozwala zweryfikować główny przepływ bez budowania rozwiązań na zapas.

## Propozycja: MVP 2

- Instalowalna PWA, cache aplikacji, lokalne checklisty, komentarze, czas pracy, koszty, kolejka synchronizacji i widoczny status połączenia.
- Rozwinięte etapy realizacji i checklist, obowiązkowe zdjęcia montażu i demontażu.
- Czas pracy, szkody i braki.
- Dokładniejsza ewidencja ilościowa i indywidualna sprzętu oraz obsługa serwisu.
- Płatności częściowe, zaległości, zwroty i weryfikacja gotówki przez właściciela.
- Umowa dla zleceń `ICLUB`, jej generowanie i podstawowa historia.
- Dokładniejsze ostrzeżenia logistyczne uwzględniające przygotowanie, transport i ponowne przygotowanie.

Te funkcje przesunięto, ponieważ wymagają stabilnego modelu procesu, synchronizacji lub bardziej szczegółowych reguł niż podstawowy przepływ MVP 1.

## Dalszy rozwój

Zaawansowany offline dla zdjęć, podpisów i szkód; wersjonowanie dokumentów i podpis palcem; raporty rentowności; SMS, e-mail i push; Google Calendar; import Excela; eksport do InFakt; mapy i trasy; przekazywanie czasu pracy do Taurusa bez bezpośredniego łączenia projektów.

## Kwestie do uzupełnienia

Do ustalenia: dokładne pola MVP 1, kryteria konfliktu, sposób prezentacji kalendarza, minimalny zakres zasobów i moment dodania pierwszej obsługi offline.

## Rozwój iteracyjny

Podział jest propozycją do walidacji. Zakres będzie zmieniany na podstawie decyzji biznesowych i testów.
