# iClub Management — kompletna instrukcja wdrożeniowa dla Claude Code

> Plik główny projektu. Przeczytaj go w całości przed rozpoczęciem prac.
>
> Projekt: `C:\Projekty\iclub`
>
> Port developerski: `3001`
>
> Nie twórz nowego projektu. Rozwijaj istniejące repozytorium i zachowaj wdrożony DESIGN_HANDOFF.

---

## 1. Zasada współpracy

Właściciel projektu nie jest programistą i nie chce wykonywać ręcznych czynności technicznych. Claude Code ma samodzielnie analizować repozytorium, edytować pliki, instalować zależności, przygotowywać migracje, uruchamiać polecenia, naprawiać błędy, wykonywać lint i build, testować trasy oraz aktualizować dokumentację.

Właściciel podejmuje decyzje biznesowe, testuje efekt i zatwierdza kolejne moduły. Nie wymagaj korzystania z terminala, ręcznego kopiowania kodu ani wykonywania migracji. Zatrzymaj się wyłącznie wtedy, gdy konieczne jest logowanie do zewnętrznej usługi, utworzenie projektu, przekazanie klucza API albo podjęcie decyzji biznesowej, której nie można bezpiecznie założyć.

Nie wykonuj commita bez wyraźnego polecenia.

---

## 2. Sposób realizacji

Aplikację rozwijamy moduł po module. Nie próbuj tworzyć całego systemu w jednym chaotycznym wdrożeniu.

Najpierw:

1. przeczytaj całą dokumentację,
2. przeanalizuj aktualny kod,
3. sprawdź zgodność repozytorium z DESIGN_HANDOFF,
4. zaktualizuj model domenowy,
5. przygotuj plan etapów,
6. rozpocznij implementację pierwszego kompletnego pionowego procesu.

Nie zatrzymuj się na samym planie, chyba że brakuje dostępu do Supabase lub innej niezbędnej usługi.

Każdy etap kończy się działającym fragmentem, testem tras i uprawnień, testem mobile i desktop, lintem, buildem, raportem po polsku oraz wskazaniem następnego modułu.

---

## 3. Cel aplikacji

iClub Management ma być systemem operacyjnym dla:

- wynajmu namiotów iClub,
- wypożyczalni sprzętu,
- zapytań, klientów i rezerwacji,
- kalendarza i dostępności,
- przypisywania pracowników,
- pakowania, realizacji, demontażu i rozpakowania,
- magazynu,
- floty,
- transportu i optymalizacji tras,
- kosztów, płatności i rentowności,
- umów i faktur,
- serwisu,
- zgłoszeń,
- powiadomień,
- pogody,
- statystyk i rankingów.

Aplikacja ma ograniczać ryzyko double bookingu, braku sprzętu, pomylenia zestawów, nieprzypisanej realizacji, konfliktu pracownika lub auta, braku potwierdzenia klienta, braku zdjęć, szkód, pominięcia serwisu, złego odłożenia sprzętu oraz błędnego planowania transportu.

---

## 4. Technologia i architektura

Docelowo:

- Next.js 16,
- React 19,
- TypeScript,
- App Router,
- Tailwind CSS v4,
- Supabase,
- Supabase Auth,
- PostgreSQL,
- PWA w późniejszym etapie.

Nie używaj React Native, Expo ani Dockera. Zachowaj obecny layout, design system, responsywność, trasy z handoffu, fonty Manrope i Space Grotesk przez `next/font` oraz port 3001.

Wprowadź czytelną strukturę, np.:

- `lib/data/`
- `lib/services/`
- `lib/domain/`
- `lib/validation/`
- `lib/notifications/`
- `lib/permissions/`
- `lib/workflows/`
- `lib/integrations/`

Oddziel UI, reguły biznesowe, dane, integracje, finanse, uprawnienia, powiadomienia i maszyny stanów. Nie importuj klienta Supabase bezpośrednio w przypadkowych komponentach.

---

## 5. UX

### Pracownik

Panel pracownika jest głównie mobilny. Ma być prosty, obsługiwany jedną ręką, z dużymi przyciskami, czytelny w terenie, pokazujący aktualny etap oraz stale dostępne akcje „Zadzwoń” i „Nawiguj”.

### Właściciel

Panel właściciela ma być dopracowany na desktopie i telefonie. Powinien umożliwiać szybkie przyjmowanie rezerwacji podczas rozmowy, kontrolę kalendarza, zleceń, pracowników, magazynu, floty, finansów, wyjątków i konfliktów.

Mobile nie może być tylko zmniejszonym desktopem.

---

## 6. Role

Role:

- `OWNER`
- `EMPLOYEE`

### OWNER

Pełny dostęp do klientów, zapytań, rezerwacji, realizacji, kalendarza, pracowników, stawek, premii, wynagrodzeń, kosztów, zysków, magazynu, floty, umów, faktur, raportów, serwisu, checklist, ustawień, powiadomień i audytu.

### EMPLOYEE

Dostęp do wspólnego i osobistego kalendarza, dostępności, wolnych zleceń, swoich realizacji, pakowania, checklist, realizacji, demontażu, rozpakowania, kosztów zadania, zgłoszeń, własnych zarobków, premii, rankingów, telefonu klienta, telefonu właściciela i nawigacji.

Pracownik nie widzi stawek i wynagrodzeń innych osób, pełnych finansów firmy, marży i poufnych ustawień.

---

## 7. Kalendarz wspólny i kalendarz pracownika

Wszyscy uprawnieni użytkownicy widzą wszystkie rezerwacje i realizacje potrzebne do koordynacji.

Wspólny kalendarz pokazuje:

- zapytania,
- rezerwacje tymczasowe i potwierdzone,
- pakowania,
- montaże,
- wynajmy,
- demontaże,
- rozpakowania,
- dostawy,
- odbiory,
- zwroty,
- serwis,
- niedostępności,
- pojazdy,
- zadania nieprzypisane,
- konflikty.

Kalendarz pracownika pokazuje również wszystkie wydarzenia operacyjne, ale jego własne zadania są mocno wyróżnione. Nie bazuj wyłącznie na kolorze. Użyj etykiety „Twoje”, ikony, mocniejszej ramki, kontrastu i sekcji „Moje zadania”. Pozostałe zadania mają słabszy akcent.

Filtry:

- Wszystkie,
- Moje,
- Nieprzypisane,
- iClub,
- Wypożyczalnia,
- Dostawy,
- Odbiory,
- Pakowanie,
- Montaż,
- Demontaż,
- Serwis,
- Konflikty.

Pełne dane klienta, dokładny adres, umowa i płatności są dostępne po przypisaniu albo ręcznym przyznaniu dostępu. Dla wolnej realizacji pracownik widzi miejscowość, termin, zakres, przewidywany czas i zarobek.

---

## 8. Powiadomienia

Pracownik otrzymuje powiadomienia o nowej rezerwacji do podjęcia, przypisaniu, zmianie zakresu, terminu, checklisty, pojazdu, planu trasy, zbliżającym się zadaniu, konflikcie, zaległym etapie i serwisie.

Kanały docelowe:

- in-app,
- push,
- e-mail,
- SMS.

Każde powiadomienie ma typ, odbiorcę, priorytet, kanał, treść, powiązany obiekt, status, datę wysłania i odczytu.

---

## 9. Przypisywanie realizacji

Właściciel może przypisać pracownika, dodać kolejną osobę, oznaczyć lidera, zmienić lub anulować przypisanie i podać powód.

Pracownik może sam przypisać się do wolnej realizacji. Po przypisaniu nie może sam się odpiąć. Tylko właściciel może to zmienić. Przypisanie jest wiążące i trafia do historii.

Po przypisaniu wszystkie powiązane zadania automatycznie pojawiają się w osobistym kalendarzu. Po zmianie poprzedni i nowy pracownik otrzymują powiadomienia.

---

## 10. Stawki, zarobki i premie

Dla każdego pracownika ustaw:

- model rozliczenia,
- ryczałt za iClub,
- stawkę godzinową,
- premię za daleki wyjazd,
- premię za namiot gastronomiczny,
- premię za opinię,
- premię za rolkę,
- premię za dosprzedaż,
- inne premie konfigurowalne.

Modele:

- ryczałt,
- godzinowo,
- ryczałt + premie,
- godzinowo + premie,
- mieszany.

iClub może być rozliczany jako 1 realizacja = 8 godzin. Wypożyczalnia najczęściej według czasu rzeczywistego. Niezależnie od wypłaty system mierzy rzeczywisty czas dla statystyk i rentowności.

Przed podjęciem zlecenia pracownik widzi podstawowy zarobek, możliwe premie i ręczny bonus właściciela. Właściciel może dodać bonus do trudnego lub obciążonego terminu.

---

## 11. Dostępność pracowników

Pracownik może oznaczyć niedostępność całodniową lub godzinową z opcjonalnym opisem. Niedostępność blokuje automatyczne przypisanie i generuje ostrzeżenie. Właściciel może ją nadpisać po potwierdzeniu i z zapisem wyjątku.

---

## 12. Klienci i zapytania

Profil klienta:

- osoba prywatna / firma,
- imię i nazwisko lub firma,
- telefon,
- e-mail,
- miejscowość,
- adres,
- NIP,
- notatki,
- historia zapytań,
- rezerwacje,
- płatności,
- umowy,
- incydenty,
- szkody,
- opinie,
- ustalenia.

Statusy zapytania:

- `NEW`
- `CONTACTED`
- `OFFER_SENT`
- `WAITING`
- `WON`
- `LOST`

UI po polsku.

---

## 13. Rezerwacja iClub

Formularz obejmuje klienta, wydarzenie, datę, montaż, demontaż, adres, liczbę osób, pakiet Standard/Premium/VIP, dodatki, konkretny namiot i zestaw, godziny, rabat kwotowy lub procentowy, prywatnie/FV, zaliczkę, płatność, ustalenia, źródło, pracowników, pojazd i plan transportu.

Wybór pakietu i dodatków ma automatycznie:

- wygenerować listę sprzętu,
- sprawdzić dostępność,
- zablokować zasoby,
- wykryć konflikty,
- wygenerować checklistę,
- wygenerować etapy,
- policzyć cenę,
- policzyć koszt,
- policzyć transport.

---

## 14. Namioty i zestawy

Namioty:

- mały 5,4 × 5,4, zestaw żółty,
- duży 6 × 8, zestaw niebieski,
- duży 6 × 8, zestaw żółty.

Jeden duży namiot ma drzwi w tylnej ścianie. Ta cecha musi być zapisana.

Każdy namiot może mieć własne oświetlenie, nagłośnienie, przewody, konstrukcję i akcesoria. Elementy uniwersalne to m.in. logo, strefa VIP, pałeczki fluo, szampan, stoły, krzesła i stoliki koktajlowe.

Obsłuż elementy zestawowe, uniwersalne, ilościowe, pojedyncze, zestawy, podzestawy, czasowe pobranie z innego zestawu i wynajem samego namiotu. Element z innego zestawu musi być przypomniany przy rozpakowaniu.

---

## 15. Magazyn i blokowanie

Dla sprzętu zapisuj nazwę, kategorię, zdjęcie, ilość, dostępność, zestaw, numer seryjny, koszt zakupu, datę zakupu, serwis, przychód, realizacje, zysk, rentowność, stan, lokalizację i historię.

Blokada zasobów obejmuje przygotowanie, pakowanie, transport, montaż, wynajem, demontaż, powrót, rozpakowanie i czyszczenie.

Ostrzegaj o rezerwacji, braku ilości, serwisie, uszkodzeniu, zbyt późnym powrocie, konflikcie auta, pracownika i logistyki. Właściciel może nadpisać z uzasadnieniem.

---

## 16. Rentowność sprzętu

Scoring ma uwzględniać koszt zakupu, serwis, liczbę realizacji, przychód, zysk, czas bez wynajmu i awaryjność. Pokazuj sposób obliczenia, a nie tylko jedną liczbę.

---

## 17. Pakowanie

Każda realizacja iClub ma zadanie Pakowanie z checklistą generowaną z typu zlecenia, namiotu, pakietu, dodatków, liczby osób, sprzętu, elementów z innych zestawów, pojazdu i ustaleń.

Właściciel może tworzyć szablony i edytować checklistę konkretnego zlecenia. Po kliknięciu „Rozpocznij pakowanie” licz czas widoczny właścicielowi.

Stałe akcje:

- Zadzwoń do klienta,
- Zadzwoń do szefa.

Pracownik oznacza kontakt i potwierdzenie szczegółów. Wpisuje godzinę montażu. Reguły dozwolonych godzin zależne od pakietu są konfigurowalne. Wcześniejsza godzina wymaga ostrzeżenia i akceptacji właściciela.

Nie pozwalaj zakończyć z nieodznaczonymi obowiązkowymi pozycjami bez powodu i uzasadnienia. Po zakończeniu wyślij właścicielowi powiadomienie z czasem, brakami, wyjątkami i pojazdem.

---

## 18. Dosprzedaż

Przy kontakcie pokaż komunikat o 15% premii za dosprzedaż.

Na start:

- mikrofony karaoke – 100 zł,
- strefa VIP – 200 zł,
- ogrzewanie – 250 zł,
- stoły,
- krzesła,
- stoliki koktajlowe.

Lista, ceny i procent są konfigurowalne. Pracownik zapisuje propozycję, decyzję klienta i sprzedaż. Premia wymaga akceptacji właściciela.

---

## 19. Realizacja iClub

Etapy:

1. Wyjazd z bazy.
2. Trasa.
3. Jestem na miejscu.
4. Rozpoczęcie montażu.
5. Zakończenie montażu.
6. Zdjęcia.
7. Szkolenie klienta.
8. Rozliczenie.
9. Uwagi.
10. Zamknięcie przekazania.

Mierz czasy. Stałe akcje: Nawiguj, Zadzwoń do klienta, Zadzwoń do szefa. Zdjęcia są obowiązkowe przed szkoleniem.

---

## 20. Szkolenie klienta

Checklista: bezpieczeństwo, obsługa namiotu i dmuchawy, zakaz palenia, zakaz spuszczania powietrza, awaria, rozliczenie i odpowiedzialność za sprzęt. Brak punktu wymaga powodu i komentarza.

---

## 21. Rozliczenie

Pokaż wartość, zaliczkę, pozostałą kwotę, płatność, rabaty, dodatki, dosprzedaż, fakturę i status. Dodaj skróty do umowy i podsumowania.

Metody: gotówka, BLIK, przelew, karta, częściowa, brak. Właściciel weryfikuje rozliczenie.

---

## 22. Incydenty

Kategorie: awaria, pogoda, uszkodzenie, klient, obiekt, zasilanie, dmuchawa, brak sprzętu, palenie, inne.

Pola: kategoria, opis, priorytet, zdjęcia, zgłaszający, czas, status, osoba, rozwiązanie. Wysoki priorytet natychmiast powiadamia właściciela.

---

## 23. Demontaż

Etapy: dojazd, telefon, przyjazd, zdjęcia stanu, szkody, demontaż, zakończenie, ankieta, powrót. Zdjęcia stanu są obowiązkowe. Można zgłosić bałagan, palenie, szkody, brak sprzętu, uszkodzenie, zastrzeżenia i czyszczenie.

„Nawiguj do bazy” prowadzi do skonfigurowanej bazy, domyślnie Południowa 9, Dopiewo.

---

## 24. Podsumowanie i rankingi

Po zleceniu pokaż zarobek, premie, dosprzedaż, czasy, incydenty, ocenę, opinię, rolkę i checklisty.

Rankingi: czas montażu, pakowania, zadowolenie, opinie, rolki, dosprzedaż, bezbłędne checklisty, liczba realizacji, terminowość. Właściciel zatwierdza premie.

---

## 25. Rozpakowanie

Mierz czas. Checklista pokazuje zabrane elementy, pożyczone zestawy, dodatki, braki i szkody.

Oznaczenia: namiot do czyszczenia, dywan, sprzęt, uszkodzenie, brak, serwis, inne. Można dodać opis, zdjęcie, priorytet, termin i osobę. Wpisy tworzą zadania serwisowe.

Koszty: hotel, parking, autostrada, paliwo, zakup awaryjny, inne.

---

## 26. Wypożyczalnia — odbiór osobisty

Proces: czyszczenie, przygotowanie, checklista, ustawienie, kontakt, odbiór klienta, płatność, zwrot, kontrola ilości i stanu, braki/szkody, czyszczenie, odłożenie, zakończenie.

Przycisk telefonu zawsze dostępny. Różne osoby mogą wykonywać etapy. Właściciel może wydać, potwierdzić płatność i przyjąć zwrot.

---

## 27. Wypożyczalnia — dostawa

Proces: przygotowanie, pakowanie, wyjazd, transport, rozładunek, przekazanie, powrót, trasa po odbiór, odbiór, kontrola, powrót, czyszczenie, odłożenie, zakończenie.

Stałe akcje: Nawiguj, Zadzwoń do klienta, Zadzwoń do szefa. Dodawaj koszty, np. parking. Ustalenia są widoczne na każdym etapie.

---

## 28. Automatyczne zadania

Po dodaniu rezerwacji automatycznie generuj zadania.

Dla iClub: przygotowanie, pakowanie, montaż, przekazanie, demontaż, powrót, rozpakowanie, serwis.

Dla wypożyczalni z dostawą: przygotowanie, czyszczenie, pakowanie, dostawa, rozładunek, powrót, odbiór, kontrola, czyszczenie, odłożenie.

Dla odbioru osobistego: przygotowanie, czyszczenie, ustawienie, wydanie, zwrot, kontrola, czyszczenie, odłożenie.

Szablony są konfigurowalne i aktualizują się po zmianie zakresu.

---

## 29. Serwis

Oznaczenie sprzętu jako do czyszczenia, naprawy, sprawdzenia, uszkodzony lub brakujący tworzy zadanie serwisowe.

Każdy wtorek generuj zbiorcze zadanie. Niewykonane przenosi się na kolejny dzień roboczy i codziennie o 15:00 wysyła push wykonawcy oraz właścicielowi. Zadanie pozostaje aktywne do zamknięcia lub anulowania z uzasadnieniem.

---

## 30. Zgłoszenia pracownika

Kategorie: uwaga, niedostępność, zapotrzebowanie, awaria, brak sprzętu, pomysł, organizacja, pojazd, inne.

Pola: kategoria, opis, zdjęcie, priorytet, zlecenie, sprzęt, pojazd, status, komentarze.

---

## 31. Flota

Pojazd: nazwa, rejestracja, typ, spalanie, paliwo, pojemność, koszty, przebieg, serwisy, badania, ubezpieczenie, dostępność, historia.

Przypisuj do pakowania, dostawy, montażu, demontażu i odbioru. Wykrywaj konflikty.

---

## 32. Google Maps i adresy

Docelowo użyj:

- Places Autocomplete,
- Geocoding API,
- Routes API Compute Routes,
- Routes API Compute Route Matrix,
- Route Optimization API.

Nie używaj starszych Directions API i Distance Matrix API bez potrzeby.

Domyślna baza: Południowa 9, Dopiewo. Przechowuj ją w konfiguracji i przygotuj możliwość wielu baz.

Dla adresów zapisuj pełny adres, ulicę, numer, kod, miasto, kraj, latitude, longitude i place_id. Nie polegaj tylko na polu tekstowym. Adres niejednoznaczny wymaga ostrzeżenia i ręcznego potwierdzenia.

---

## 33. Automatyczne liczenie transportu

Po wyborze adresu, pojazdu i planu trasy oblicz dystans, czas, kilometry, paliwo, koszt paliwa, koszt wewnętrzny, cenę transportu klienta i marżę.

Standard iClub domyślnie: baza → klient → baza przy montażu oraz baza → klient → baza przy demontażu. Nie zapisuj mnożnika 4 jako sztywnej reguły.

Obsłuż jeden kurs, brak powrotu, nocleg, przejazd między klientami, dodatkowe punkty, kilka pojazdów, inny start, odbiór sprzętu po drodze i łączenie dostaw.

---

## 34. Koszt paliwa

Wzór:

`koszt = (kilometry / 100) × spalanie × cena paliwa`

Zapisuj odcinki, dystans, pojazd, spalanie, paliwo, cenę, litry, koszt planowany, koszt rzeczywisty, korektę, powód, autora i datę.

Zmiana adresu, auta, trasy, spalania, ceny lub kursów oznacza kalkulację jako nieaktualną.

Cena paliwa jest konfigurowalna dla benzyny, diesla, LPG i konkretnego zlecenia.

Rozróżnij plan i wykonanie. Po realizacji można wpisać licznik przed/po, kilometry, paragon, litry i koszty drogowe.

---

## 35. Wiele pojazdów

Jedno zlecenie może mieć kilka pojazdów z osobnymi odcinkami, pracownikami i kosztami. Sumuj koszty w zleceniu.

---

## 36. Terminy dostaw wypożyczalni

Domyślnie:

- dostawy: czwartek i piątek,
- odbiory: poniedziałek i wtorek.

To wartości domyślne, nie sztywne. Każda rezerwacja może mieć indywidualny dzień, okno godzinowe, kontakt przed przyjazdem i instrukcje.

Po zapisaniu automatycznie utwórz zadania i dodaj je do kalendarza. Zmiana terminu aktualizuje zadania, powiadamia pracowników i oznacza trasę do ponownego przeliczenia.

---

## 37. Optymalizacja wielu dostaw i odbiorów

Jeżeli na weekend jest kilka dostaw lub odbiorów, przygotuj rekomendację optymalnej trasy.

Uwzględnij adresy, okna czasowe, czas obsługi, auta, pracowników, niedostępności, pojemność auta, sprzęt, załadunek, rozładunek, bazę, godziny pracy, ustalenia klientów, korki, czas, kilometry i koszt.

Rekomendacja pokazuje kolejność punktów, pojazd, pracownika, godzinę wyjazdu, ETA, powrót, dystans, czas i koszt.

Właściciel wybiera priorytet:

- najkrótszy czas,
- najmniej kilometrów,
- najniższy koszt,
- najmniej pojazdów,
- równomierne obciążenie,
- zachowanie godzin klientów.

Domyślnie balansuj terminowość, koszt, kilometry i wykonalność.

Nie łącz dostaw, jeśli sprzęt nie mieści się w aucie, zasoby są w konflikcie, pracownik lub pojazd są niedostępni albo nie da się zachować okien. Nadpisanie wymaga uzasadnienia.

---

## 38. Plany transportowe

Plan transportowy zawiera nazwę, datę, typ, pojazd, pracowników, zlecenia, kolejność, start, koniec, status, dystans, koszt i notatki.

Jedno zlecenie może mieć kilka etapów transportowych. Jedna trasa może obejmować kilka zleceń.

Rekomendacja wymaga akceptacji właściciela. Może on zmienić kolejność, auto, pracownika, rozdzielić lub połączyć trasy, dodać/usunąć punkt, zablokować godzinę i przeliczyć.

Po akceptacji aktualizuj zadania, kalendarze, powiadomienia i finanse.

---

## 39. Nawigacja

„Nawiguj” korzysta ze współrzędnych/place_id, otwiera Google Maps i prowadzi do aktualnego punktu. Po zakończeniu punktu prowadzi do kolejnego, a przy powrocie do bazy do skonfigurowanego adresu.

Przy trasie wielopunktowej pracownik widzi kolejność, godzinę, adres, telefon, sprzęt, ustalenia i status.

---

## 40. Bezpieczeństwo integracji Google

Klucze trzymaj w zmiennych środowiskowych, nie w repo. Ogranicz je do API i środowiska. Routes i Route Optimization wywołuj serwerowo.

Przygotuj `.env.example`, `lib/integrations/google-maps/`, adapter geokodowania, tras, optymalizacji, serwis kosztów i fallback demo bez fikcyjnego klucza.

Nie odpytywać API przy każdym renderze. Zapisuj wyniki i przeliczaj po zmianach.

---

## 41. Pogoda

Sprawdzaj pogodę dla lokalizacji. Ostrzeżenia: wiatr >20 km/h, opady, temperatura >25°C. Progi są konfigurowalne. Pokazuj alert w rezerwacji, kalendarzu, realizacji, dashboardzie i powiadomieniach. Nie blokuj automatycznie, ale przy wysokim ryzyku wymagaj decyzji właściciela.

---

## 42. Potwierdzenie klienta 7 dni przed

Wyślij e-mail i SMS z datą, lokalizacją, pakietem, namiotem, dodatkami, godzinami, kwotą, płatnością i prośbą o potwierdzenie.

Zapisuj datę, kanał, dostarczenie, odpowiedź i potwierdzenie. Brak potwierdzenia tworzy zadanie kontaktu.

---

## 43. Prywatnie / faktura VAT

Rezerwacja ma przełącznik prywatnie/FV. Uwzględniaj brutto, netto, VAT, koszt i marżę. Przy fakturze wymagaj danych firmy, twórz zadanie wystawienia i przypomnienie. Przygotuj architekturę pod InFakt, ale nie implementuj atrapy.

---

## 44. Generator umów

Każda rezerwacja iClub kończy się umową. Obsłuż szablony, wersjonowanie, placeholdery, dane klienta, pakiet, dodatki, terminy, lokalizację, płatności, zakazy i odpowiedzialność.

Właściciel może podejrzeć, edytować, wygenerować PDF, pobrać, oznaczyć wysłanie/podpisanie i przechować podpisaną wersję. Na początku podpis odbywa się zewnętrznie.

---

## 45. Finanse

Pokazuj przychody, koszty, zysk, marżę, płatności, zaległości, zaliczki, faktury, koszty pracowników, pojazdów, serwisu, sprzętu i zleceń.

Widoki łączne oraz osobno iClub i wypożyczalnia.

Koszty mogą dotyczyć zlecenia, sprzętu, pojazdu, pracownika lub firmy. Kategorie: paliwo, hotel, parking, autostrada, wynagrodzenie, premia, serwis, czyszczenie, zakup, materiały, inne.

---

## 46. Audyt

Zapisuj kto, co, kiedy, poprzednią wartość, nową wartość i komentarz dla przypisań, cen, rabatów, pakietu, konfliktów, checklist, płatności, statusów, pojazdów, sprzętu, terminów, umów, faktur i korekt transportu.

---

## 47. Model domenowy

Przeanalizuj co najmniej:

- profiles,
- employees,
- employee_rates,
- employee_bonuses,
- employee_availability,
- customers,
- inquiries,
- reservations,
- jobs,
- job_stages,
- job_assignments,
- job_time_entries,
- job_notes,
- job_incidents,
- job_sales,
- locations,
- tents,
- equipment,
- equipment_sets,
- equipment_set_items,
- inventory_reservations,
- inventory_movements,
- vehicles,
- vehicle_assignments,
- transport_plans,
- transport_routes,
- transport_route_stops,
- transport_calculations,
- checklists,
- checklist_templates,
- checklist_items,
- checklist_responses,
- packing_sessions,
- unpacking_sessions,
- payments,
- costs,
- contracts,
- contract_templates,
- invoices,
- service_tasks,
- service_task_items,
- notifications,
- weather_forecasts,
- customer_confirmations,
- ratings,
- reviews,
- rankings,
- audit_logs.

Najpierw model koncepcyjny, potem migracje etapami. Nie twórz wszystkich tabel bezmyślnie.

---

## 48. Statusy

Zaproponuj statusy dla zapytania, rezerwacji, zlecenia, etapów, pakowania, realizacji, demontażu, rozpakowania, wypożyczenia, płatności, umowy, faktury, incydentu, serwisu i planu transportowego.

Nie opieraj całego procesu na jednym statusie. Etapy mają własne stany i historię.

---

## 49. Kolejność wdrożenia

1. Fundament: Supabase, Auth, profile, role, ochrona tras, warstwa danych, audyt, ustawienia.
2. Klienci i zapytania.
3. Rezerwacja iClub.
4. Magazyn i dostępność.
5. Pracownicy, stawki, premie, dostępność i przypisania.
6. Kalendarz wspólny, osobisty, automatyczne zadania i powiadomienia.
7. Flota, Google Maps, paliwo, plany transportowe i optymalizacja.
8. Pakowanie.
9. Realizacja.
10. Demontaż i rozpakowanie.
11. Wypożyczalnia.
12. Finanse i rentowność.
13. Umowy, faktury, Google Calendar, SMS, e-mail, pogoda.
14. PWA i offline.

---

## 50. Pierwszy pionowy proces

Po analizie rozpocznij od:

1. logowania,
2. ról OWNER/EMPLOYEE,
3. profili,
4. klientów,
5. zapytań,
6. podstawowej rezerwacji iClub,
7. wyboru pakietu,
8. wyboru namiotu,
9. dodatków,
10. automatycznego utworzenia zlecenia,
11. pokazania w kalendarzu,
12. przypisania pracownika,
13. samodzielnego podjęcia wolnego zlecenia,
14. blokady samodzielnego odpięcia,
15. przewidywanego zarobku,
16. wygenerowania podstawowych etapów,
17. przygotowania architektury transportu.

Nie wdrażaj pełnego pakowania i realizacji, zanim ten proces nie będzie stabilny.

---

## 51. Konfiguracja

Nie zapisuj na stałe w komponentach cen, stawek, premii, progów pogody, godzin montażu, reguł pakietów, przypomnień, VAT, cen paliwa, kategorii kosztów, adresu bazy, domyślnych dni dostaw/odbiorów i priorytetów optymalizacji.

Dane startowe mogą być seedem.

---

## 52. Supabase

Sprawdź zmienne środowiskowe, klienta Supabase, migracje, projekt, Auth i klientów serwerowych/przeglądarkowych.

Jeśli brakuje projektu lub kluczy, przygotuj strukturę, `.env.example`, migracje i instrukcję. Zatrzymaj się tylko przy czynności wymagającej właściciela. Nie wpisuj fikcyjnych sekretów.

---

## 53. Google Calendar

Docelowo synchronizuj rezerwacje z Google Calendar. iClub Management ma być źródłem prawdy. Zapisuj identyfikatory zewnętrzne, unikaj duplikatów, pozwól na ponowną synchronizację, zmianę i usunięcie. Nie implementuj atrapy.

---

## 54. Testy

Po każdym etapie:

- lint,
- build,
- test tras,
- test uprawnień,
- test pustych stanów,
- test błędów,
- test mobile,
- test desktop,
- test całego procesu.

Nie pozostawiaj błędów TypeScript i nie wyłączaj lint tylko po to, aby ukryć problem.

---

## 55. Dokumentacja

Zaktualizuj:

- README.md,
- START_HERE.md,
- docs/CURRENT_SCOPE.md,
- docs/IMPLEMENTATION_PLAN.md,
- docs/DECISIONS.md.

Utwórz lub rozbuduj:

- docs/FULL_PRODUCT_SCOPE.md
- docs/EMPLOYEE_PANEL.md
- docs/OWNER_PANEL.md
- docs/WORKFLOW_ICLUB.md
- docs/WORKFLOW_EQUIPMENT_RENTAL.md
- docs/INVENTORY_MODEL.md
- docs/EMPLOYEE_COMPENSATION.md
- docs/NOTIFICATION_RULES.md
- docs/SERVICE_WORKFLOW.md
- docs/FINANCIAL_MODEL.md
- docs/DATA_MODEL.md
- docs/IMPLEMENTATION_PHASES.md
- docs/INTEGRATIONS.md
- docs/PERMISSIONS.md
- docs/TRANSPORT_AND_ROUTE_OPTIMIZATION.md
- docs/SUPABASE_SETUP.md

Dokumentacja ma odpowiadać kodowi.

---

## 56. Niejasności

Nie przerywaj przez drobne braki. Jeśli wartość nie jest ustalona, zrób ją konfigurowalną, zastosuj wartość demo i oznacz do zatwierdzenia.

Jeśli brak decyzji blokuje fundament, opisz problem, podaj rekomendację, maksymalnie dwie alternatywy i konsekwencje.

---

## 57. Raport końcowy

Po każdym etapie podaj po polsku:

1. Co przeanalizowano.
2. Co zmieniono w dokumentacji.
3. Jak wygląda architektura.
4. Co zaimplementowano.
5. Jakie pliki zmieniono.
6. Jak działa proces.
7. Jak działają role.
8. Jak działają kalendarze.
9. Jak działają przypisania.
10. Jak działa przewidywany zarobek.
11. Jak działa transport.
12. Jakie trasy są gotowe.
13. Co nadal jest demo.
14. Wynik lint.
15. Wynik build.
16. Co wymaga działania właściciela.
17. Jaki jest następny moduł.

Nie wykonuj commita.

Najpierw przedstaw krótki plan, następnie rozpocznij pracę.
