# Otwarte pytania

## Cel dokumentu

Przechowywać niewiadome bez zamieniania ich w fikcyjne wymagania.

## Stan obecny

Kierunek i propozycja MVP są opisane. Poniższe odpowiedzi są potrzebne przed lub podczas projektowania poszczególnych etapów.

## Pytania priorytetowe przed MVP 1

- Czy zaproponowane granice MVP 1 są zaakceptowane?
- Jakie minimalne dane klienta i zapytania są obowiązkowe?
- Jakie statusy zapytania, rezerwacji, zlecenia i realizacji są naprawdę używane?
- Kiedy rezerwacja ma wygasać automatycznie i czy właściciel potrzebuje wcześniejszego przypomnienia?
- Co dokładnie oznacza „podstawowy sprzęt” przypisywany w MVP 1?
- Jakie przedziały czasu mają blokować namiot w pierwszej wersji?
- Czy akceptacja konfliktu wymaga komentarza właściciela?
- Jakie minimalne punkty zawiera podstawowa checklista?
- Które dane pracownik może edytować poza godziną realizacji?
- Jakie dane płatności i kosztu są obowiązkowe w MVP 1?

## Pytania o ofertę i logistykę

- Jakie są dokładne, edytowalne zawartości pakietów i zasady dziedziczenia między nimi?
- Jak rozliczać transport, kilometry i ręczne korekty?
- Który sprzęt śledzić indywidualnie, a który ilościowo?
- Jakie czasy przygotowania i ponownego przygotowania obowiązują dla namiotów i sprzętu?
- Jak klasyfikować konflikt twardy, ostrzeżenie logistyczne i ryzyko operacyjne w przypadkach granicznych?

## Pytania o pracę i rozliczenia

- Kto może korygować czas pracy i czy korekta wymaga uzasadnienia?
- Jak pracownik potwierdza gotówkę, a właściciel ją weryfikuje?
- Jak obsługiwać płatności częściowe, zwroty i zaległości?
- Jakie wersje umów obowiązują w obu liniach biznesowych?

## Pytania o offline i integracje

- Jakie dane mają być automatycznie pobierane na urządzenie i jak długo przechowywane?
- Jak rozwiązywać konflikty synchronizacji i utratę uprawnień?
- Jak obsługiwać i ograniczać miejsce na zdjęcia offline?
- Jaki hosting będzie użyty docelowo?
- Jakie dane zostaną zaimportowane z Excela?
- Jaki ma być kontrakt przyszłego przekazywania czasu pracy do Taurusa, bez dostępu do jego projektu?
- Jakie są priorytety Google Calendar, InFakt, map, SMS, e-mail i push?

## Dług techniczny do domknięcia

- **Czyszczenie Storage przy usuwaniu:** gdy powstanie funkcja usuwania rezerwacji/zlecenia lub pojedynczego zdjęcia, trzeba usuwać też pliki z bucketu `realizations` (dziś `job_photos` kasuje się kaskadowo, ale obiekty w Storage zostają). Upload z realizacji ma już rollback przy błędzie zapisu metadanych.

## Pytania o interfejs — do późniejszego etapu

- Jak powinien wyglądać główny ekran właściciela?
- Jak powinien wyglądać główny ekran pracownika?

## Rozwój iteracyjny

Pytania będą rozstrzygane tuż przed etapem, którego dotyczą; nie wszystkie blokują start MVP 1.
