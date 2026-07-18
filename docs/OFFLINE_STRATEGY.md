# Strategia offline

## Cel dokumentu

Rozdzielić zatwierdzone potrzeby terenowe od etapów przyszłej implementacji.

## Stan obecny

Nie zainstalowano manifestu, service workera, IndexedDB ani bibliotek PWA. Offline nie należy do MVP 1.

## Zatwierdzone wymagania

- Docelowo offline mają działać: lista zleceń, dane klientów, szczegóły realizacji, checklisty, czas pracy, komentarze, koszty, zdjęcia, podpisy i szkody.
- Użytkownik musi widzieć stan online/offline, liczbę oczekujących zmian, błędy i potwierdzenie pełnej synchronizacji.
- Operacje offline trafiają do kolejki i synchronizują się po odzyskaniu połączenia oraz przy otwarciu aplikacji; system nie może polegać wyłącznie na synchronizacji w tle.
- Lokalnych danych nie wolno usuwać przed potwierdzeniem synchronizacji. Zdjęcia muszą być kompresowane.
- IndexedDB lub rozwiązanie równoważne jest kierunkiem, nie zatwierdzonym jeszcze wyborem implementacyjnym.

## Pierwszy etap offline — propozycja MVP 2

- instalowalna PWA i cache aplikacji,
- lokalne checklisty, koszty, komentarze i czas pracy,
- kolejka synchronizacji,
- status online/offline, licznik zmian i podstawowa obsługa błędów.

Ten zakres ogranicza pierwsze ryzyko synchronizacji do danych tekstowych i prostych operacji.

## Drugi etap offline — dalszy rozwój

- zdjęcia, podpisy i szkody,
- kompresja i kolejka plików,
- zaawansowane wykrywanie i rozwiązywanie konfliktów.

Te elementy przesunięto ze względu na rozmiar danych, wymagania bezpieczeństwa i trudniejsze konflikty.

## Kwestie do uzupełnienia

Do ustalenia: dane pobierane automatycznie, okres przechowywania, limity urządzenia, zabezpieczenie danych, polityka konfliktów, ponawianie błędów i zachowanie po utracie dostępu pracownika.

## Rozwój iteracyjny

Przed implementacją powstanie osobny projekt techniczny i testy scenariuszy utraty połączenia.
