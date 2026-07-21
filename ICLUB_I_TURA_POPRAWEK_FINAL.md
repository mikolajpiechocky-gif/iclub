# iClub Management — I tura poprawek po ustaleniach

> Finalny dokument wdrożeniowy dla Claude Code  
> Wersja po omówieniu i zatwierdzeniu logiki biznesowej  
> Pracuj na istniejącym projekcie. Nie przebudowuj aplikacji od zera.

---

# 1. Zasady pracy

Przed rozpoczęciem zmian:

1. Przeanalizuj aktualne komponenty, modele danych, routing, migracje Supabase i dokumentację projektu.
2. Wykorzystuj istniejące komponenty i logikę, jeśli są poprawne.
3. Nie twórz równoległych, dublujących się systemów.
4. Nie pozostawiaj atrap wyglądających jak działające funkcje.
5. Wszystkie istotne reguły biznesowe zabezpieczaj również po stronie serwera i bazy, a nie tylko w interfejsie.
6. Po każdej większej części:
   - uruchom lint,
   - uruchom build,
   - usuń błędy,
   - sprawdź wersję desktopową,
   - sprawdź wersję mobilną.

---

# 2. Decyzja architektoniczna: magazyn, oferta i kalkulacja

Moduł cennika pozostaje, ale powinien zostać połączony z magazynem.

Potrzebne są trzy odrębne warstwy.

## 2.1. Magazyn

Odpowiada za to, co fizycznie znajduje się w firmie:

- sprzęt,
- ilości,
- konkretne egzemplarze,
- zdjęcia,
- ceny zakupu,
- ceny wynajmu,
- stan techniczny,
- dostępność,
- czyszczenie,
- serwis,
- lokalizację,
- przypisanie do zestawu.

## 2.2. Oferta i cennik

Odpowiada za to, co sprzedajemy klientowi:

- Pakiet Podstawowy,
- Pakiet Premium,
- Pakiet VIP,
- skład pakietów,
- ceny pakietów,
- ceny dodatków,
- widełki transportowe,
- zasady rabatowe,
- domyślny zadatek.

Moduł powinien nazywać się:

> Oferta i cennik

## 2.3. Kalkulator rezerwacji

Odpowiada za cenę konkretnego zamówienia:

```text
Pakiet
+ dodatki
+ transport
- rabat
= cena końcowa
```

Zadatek jest częścią należności, a nie dodatkowym kosztem.

---

# 3. Logowanie

Usuń ze strony logowania informację:

> Konta zakłada właściciel w panelu Supabase — patrz docs/SUPABASE_SETUP.md

Ta informacja może pozostać wyłącznie w dokumentacji technicznej.

Nie dodawaj publicznej rejestracji kont.

---

# 4. Pulpit

## 4.1. Kolejność sekcji

Ustaw kolejność:

1. Podsumowanie
2. Wymaga uwagi
3. Najnowsze zapytania
4. Najbliższe realizacje

Najnowsze zapytania muszą znajdować się wyżej niż najbliższe realizacje.

## 4.2. Klikalne kafelki

Każdy kafelek podsumowania musi być klikalny.

Kliknięcie ma prowadzić do odpowiednio przefiltrowanej listy rekordów, których dotyczy liczba.

Przykład:

```text
Rezerwacje bez zadatku: 3
```

Kliknięcie:

```text
/rezerwacje?paymentStatus=deposit_missing
```

i wyświetlenie dokładnie tych trzech rezerwacji.

Dotyczy to między innymi:

- nowych zapytań,
- zapytań bez opiekuna,
- rezerwacji bez zadatku,
- rezerwacji wymagających działania,
- nieopłaconych rezerwacji,
- zadań do wykonania,
- brakujących danych,
- realizacji z dodatkami.

## 4.3. Konflikty namiotów

Usuń kafelek:

> Konflikty namiotu

System ma uniemożliwiać overbooking, a nie tylko informować o nim po fakcie.

Walidacja dostępności musi działać:

- przed zapisaniem rezerwacji,
- przy zmianie terminu,
- przy zmianie namiotu,
- przy dodaniu drugiego namiotu,
- przy przypisaniu konkretnego egzemplarza,
- przy konwersji zapytania w rezerwację.

Walidacja ma działać także po stronie serwera i bazy.

## 4.4. Wymaga uwagi

Każdy element w sekcji „Wymaga uwagi” musi prowadzić bezpośrednio do konkretnego rekordu:

- zapytania,
- klienta,
- rezerwacji,
- zadania,
- płatności,
- realizacji,
- elementu magazynu.

Nie pokazuj komunikatów bez możliwości przejścia do rekordu i rozwiązania problemu.

## 4.5. Najbliższe realizacje

Pokaż:

- czy realizacja zawiera dodatki,
- liczbę pozycji dodatkowych,
- skrót najważniejszych dodatków.

Przykład:

```text
Dodatki: 4
Stoły, krzesła, ogrzewanie +1
```

---

# 5. Kalendarz

## 5.1. Desktop

Obecny widok desktopowy może pozostać, jeśli jest funkcjonalny.

## 5.2. Mobile

Przebuduj widok mobilny na wzór mobilnego Google Calendar.

Wymagania:

- cały tydzień mieści się na ekranie,
- brak konieczności poziomego przewijania tylko po to, aby zobaczyć niedzielę,
- krótkie nazwy dni,
- kompaktowe oznaczenia wydarzeń,
- kliknięcie dnia otwiera agendę,
- weekend piątek–niedziela ma większy priorytet,
- dodaj widok „Weekend”,
- liczba wydarzeń nie może rozpychać całego tygodnia.

Przykładowy układ:

```text
PN  WT  ŚR  CZ  PT  SB  ND
15  16  17  18  19  20  21
 •   •       •   3   5   2
```

Pod spodem:

```text
Sobota, 20 lipca

08:00 Pakowanie — Leszno
11:30 Montaż — Gniezno
17:00 Dostawa krzeseł — Poznań
```

## 5.3. Kolory

Zastosuj mapowanie kolorów zgodne z wcześniejszą instrukcją dotyczącą Google Calendar.

Nie twórz nowej przypadkowej palety.

Jeśli instrukcji nie ma w repozytorium, zgłoś jej brak zamiast wymyślać znaczenie kolorów.

Kolor nie może być jedynym nośnikiem informacji. Stosuj również:

- ikony,
- etykiety,
- tekst,
- obramowania.

## 5.4. Pogoda

Kolory ikon pogodowych:

- słońce i upał — żółty lub pomarańczowy,
- deszcz — niebieski,
- burza — fioletowy lub czerwony,
- silny wiatr — pomarańczowy lub czerwony,
- mróz — błękitny,
- bezpieczne warunki — neutralny lub zielony,
- ostrzeżenie IMGW — zgodnie ze stopniem ostrzeżenia.

## 5.5. Powiadomienia

Usuń powiadomienia jako osobną zakładkę głównego menu.

Dodaj ikonę dzwonka w nagłówku:

- licznik nieprzeczytanych,
- rozwijany panel,
- możliwość przejścia do konkretnego rekordu,
- oznaczanie jako przeczytane,
- opcja „Zobacz wszystkie”.

---

# 6. Zapytania i leady

Moduł zapytań ma działać jako wspólna skrzynka leadów z wielu źródeł.

Źródła:

- OLX,
- telefon,
- formularz strony,
- e-mail,
- Facebook,
- Instagram,
- ręczne dodanie,
- polecenie.

Integrację SMS i rejestru połączeń wstrzymaj w tej turze. Zostanie omówiona i wdrożona jako osobny moduł.

## 6.1. Integracja OLX — etap pierwszy

System ma:

- pobierać wiadomości z OLX,
- tworzyć nowe leady,
- dopisywać kolejne wiadomości do istniejących leadów,
- zachowywać oryginalną treść,
- nie duplikować wiadomości,
- pozwalać ręcznie nadpisywać dane CRM,
- nie nadpisywać ręcznych danych kolejną synchronizacją,
- zachowywać historię kontaktu,
- pozwalać prowadzić lead do rezerwacji, umowy, wygranej lub przegranej.

Na tym etapie nie wdrażaj jeszcze:

- automatycznych odpowiedzi,
- podpowiadanych odpowiedzi,
- wysyłania odpowiedzi z aplikacji.

Architektura ma jednak umożliwiać ich późniejsze dodanie.

## 6.2. Automatyczne zamykanie leadów

Lead może zostać automatycznie oznaczony jako przegrany po 21 dniach braku aktywności.

Nie licz tego wyłącznie od daty pierwszego zapytania.

Termin ma być liczony od ostatniej istotnej aktywności, np.:

- ostatniej wiadomości klienta,
- ostatniej wiadomości wychodzącej,
- ostatniej ręcznej aktualizacji,
- daty wykonania ostatniego działania sprzedażowego.

Nie zamykaj automatycznie leada, jeśli:

- ma przyszłe zadanie kontaktowe,
- ma aktywną rezerwację tymczasową,
- ma podpisaną umowę,
- jest oznaczony jako wygrany,
- Szef zablokował automatyczne zamknięcie,
- rozmowa jest aktywna.

Powód automatycznej przegranej:

```text
automatic_inactivity
```

## 6.3. Powrót klienta

Rozróżnij dwa przypadki.

### Powrót do tego samego zapytania

Jeśli klient pisze ponownie w tym samym wątku lub wraca do tej samej imprezy:

```text
Przegrany → Odgrzany
```

Zachowaj:

- poprzedni status,
- poprzedni powód przegrania,
- liczbę reaktywacji,
- datę reaktywacji,
- pełną historię.

### Nowa impreza tego samego klienta

Nowa impreza tworzy nowy lead powiązany z istniejącym klientem.

Przykład:

```text
Klient: Jan Kowalski

Lead 1:
18. urodziny — przegrany

Lead 2:
Impreza firmowa — nowy
```

Nie rozciągaj jednego leada na kilka niezależnych imprez.

---

# 7. Dodawanie rezerwacji iClub

Formularz jest obecnie zbyt rozbudowany. Uprość pierwszy widok i zastosuj sekcje rozwijane.

## 7.1. Usuń z formularza

### Status

Użytkownik nie wybiera statusu podczas tworzenia rezerwacji.

Status ma być nadawany automatycznie na podstawie procesu.

### Liczba osób jako pole wymagane

Liczba osób może być zapisana, ale nie może blokować utworzenia rezerwacji.

### Dwie równorzędne daty imprezy i montażu

W podstawowym widoku pokazuj tylko:

> Data imprezy

## 7.2. Układ formularza

### 1. Klient i lokalizacja

- klient,
- telefon,
- e-mail,
- adres realizacji,
- miejscowość,
- data imprezy.

### 2. Namiot i pakiet

- namiot główny,
- dodatkowy namiot,
- pakiet.

### 3. Dodatki

Osobna rozwijana sekcja.

### 4. Ustalenia czasowe

- godzina rozpoczęcia imprezy,
- godzina montażu według pakietu,
- sugerowana godzina montażu,
- opcjonalny termin demontażu,
- opcjonalne ręczne nadpisanie ustaleń.

### 5. Informacje dodatkowe

Na dole:

- rodzaj imprezy,
- liczba osób,
- dodatkowe informacje,
- ustalenia,
- notatki.

### 6. Boczne podsumowanie

- pakiet,
- zawartość pakietu,
- dodatki,
- transport,
- rabat,
- cena końcowa,
- zadatek,
- pozostało do zapłaty.

---

# 8. Daty montażu i demontażu

Podstawowe pole:

> Data imprezy

Domyślna logika:

```text
data montażu = data imprezy
data demontażu = następny dzień
```

Dodatkowe daty są niewymagane.

Dodaj rozwijaną opcję:

> Montaż lub demontaż w innym terminie

Po jej rozwinięciu pokaż:

- data montażu,
- data demontażu,
- opcjonalnie godzina demontażu.

Pozwala to obsłużyć:

- montaż dzień wcześniej,
- demontaż tego samego dnia,
- demontaż dwa dni później,
- nietypowe wydarzenia.

W bazie zachowaj osobne pola dla daty imprezy, montażu i demontażu.

---

# 9. Godziny montażu

Wymagane informacje:

## 9.1. Godzina rozpoczęcia imprezy

Wpisywana ręcznie.

## 9.2. Godzina montażu według pakietu

Wyliczana automatycznie na podstawie standardowego czasu montażu wybranego pakietu.

Każdy pakiet ma własny standardowy czas montażu.

## 9.3. Sugerowana godzina montażu

Wyliczana po uwzględnieniu:

- czasu montażu pakietu,
- dodatków,
- dodatkowego namiotu,
- dodatkowego czasu przygotowania,
- bufora bezpieczeństwa.

Sugerowana godzina może zostać ręcznie zmieniona.

Po ręcznej zmianie:

- zapisz kto zmienił,
- zapisz kiedy,
- zachowaj wartość automatyczną,
- nie nadpisuj ręcznego ustalenia bez ostrzeżenia.

Przykład:

```text
Rozpoczęcie imprezy: 18:00
Montaż według pakietu: 15:00
Sugerowany montaż po dodatkach: 14:15
Ustalono ręcznie: 14:45
```

## 9.4. Ostrzeżenie o dodatkach

Jeśli realizacja zawiera dodatki:

- pokaż ostrzeżenie w szczegółach realizacji,
- uwzględnij je w pakowaniu,
- dzień wcześniej wyślij push przypisanemu pracownikowi.

Przykład:

> Realizacja zawiera dodatkowy sprzęt. Uwzględnij większy czas pakowania i montażu.

---

# 10. Logika namiotów

Posiadamy:

- jeden mały namiot,
- dwa duże namioty,
- jeden z dużych ma drzwi w tylnej ścianie.

## 10.1. Namiot główny

Opcje:

### Mały

Rezerwuje konkretny mały namiot.

Pula:

```text
1
```

### Duży

Rezerwuje jeden namiot z puli dwóch dużych, bez natychmiastowego przypisania konkretnego egzemplarza.

Pula:

```text
2
```

### Duży z drzwiami w tylnej ścianie

Rezerwuje konkretny egzemplarz.

Jednocześnie zajmuje jedno miejsce z puli dużych namiotów.

Nie traktuj puli „Duży” oraz egzemplarza „Duży z drzwiami” jako niezależnych zasobów.

## 10.2. Dodatkowy namiot

Sekcja powinna nazywać się:

> Dodatkowy namiot

Opcje:

- brak,
- Mały,
- Duży,
- Duży z drzwiami w tylnej ścianie,
- Namiot gastronomiczny.

Namiot gastronomiczny jest konkretnym zasobem magazynowym.

Jego wybór:

- sprawdza dostępność,
- trafia na checklistę,
- zwiększa przewidywany czas montażu,
- uruchamia premię dla przypisanego pracownika.

## 10.3. Przykłady dostępności

Jedna rezerwacja „Duży” i jedna „Duży z drzwiami”:

```text
Dozwolone.
Oba duże namioty są zajęte.
```

Dwie rezerwacje „Duży”:

```text
Dozwolone.
Oba duże namioty są zajęte.
Konkretny egzemplarz zostanie przypisany później.
```

Dwie rezerwacje „Duży” i trzecia „Duży z drzwiami”:

```text
Zablokowane.
Brak wolnego dużego namiotu.
```

---

# 11. Pakiety

Pakiet ma własną cenę.

Cena pakietu nie jest sumą cen pojedynczych przedmiotów magazynowych.

Przykład:

```text
Pakiet Premium: 1799 zł brutto
```

Może zawierać sprzęt, którego suma indywidualnych cen wynajmu jest inna.

Każdy pakiet powinien mieć:

- nazwę,
- opis,
- cenę brutto,
- listę zawartych pozycji,
- ilość każdej pozycji,
- standardowy czas montażu,
- zdjęcia lub materiały prezentacyjne,
- status aktywny/nieaktywny,
- wersję obowiązującą od określonej daty.

Pozycje pakietu:

- rezerwują sprzęt,
- trafiają na checklistę,
- nie są drugi raz doliczane do ceny.

## 11.1. Dodatkowa ilość pozycji z pakietu

Jeśli pakiet zawiera:

```text
50 pałeczek fluo
```

a klient chce 100:

- 50 sztuk jest zawarte w pakiecie,
- dodatkowe 50 sztuk jest płatnym dodatkiem.

## 11.2. Snapshot

Po zapisaniu rezerwacji zapisz kopię:

- ceny pakietu,
- składu pakietu,
- cen dodatków,
- ceny transportu,
- rabatu,
- zadatku.

Późniejsza zmiana cennika nie może automatycznie zmienić zawartej rezerwacji.

---

# 12. Dodatki

Dodatki są osobnym rozwijanym modułem dostępnym:

- podczas tworzenia rezerwacji,
- podczas edycji rezerwacji,
- po potwierdzeniu,
- przed realizacją,
- na późniejszym etapie rozmowy z klientem.

## 12.1. Źródło danych

Wyniki wyszukiwania ogranicz do aktywnych pozycji magazynowych.

Pozycja może mieć flagi:

- możliwa do wynajęcia,
- widoczna jako dodatek,
- posiada cenę wynajmu,
- tylko do użytku wewnętrznego.

Nie każdy przedmiot magazynowy musi być oferowany klientowi osobno.

## 12.2. Dodawanie dodatku

Pokaż:

- zdjęcie,
- nazwę,
- dostępną ilość,
- cenę jednostkową brutto,
- ilość w rezerwacji,
- przycisk minus,
- przycisk plus,
- ręczne wpisanie ilości,
- sumę pozycji.

Zmiana ilości natychmiast aktualizuje:

- cenę,
- dostępność,
- podsumowanie,
- wymagania magazynowe,
- sugerowany czas montażu.

## 12.3. Brak dostępności

Jeżeli sprzętu brakuje:

- pokaż dokładny brak,
- nie pozwalaj bezrefleksyjnie potwierdzić rezerwacji,
- kontrolowany wyjątek Szefa wymaga uzasadnienia.

---

# 13. Boczne podsumowanie rezerwacji

Cała kalkulacja ma znajdować się w przyklejonym panelu bocznym na desktopie i rozwijanym panelu na urządzeniu mobilnym.

## 13.1. Pakiet

- nazwa,
- cena,
- rozwijana zawartość.

## 13.2. Dodatki

- pozycja,
- ilość,
- cena jednostkowa,
- suma.

## 13.3. Transport

- odległość w jedną stronę,
- widełki,
- cena dla klienta,
- planowane kilometry,
- koszt wewnętrzny,
- marża transportowa.

## 13.4. Rabat

Rabat może być:

- procentowy,
- kwotowy.

Rabat obejmuje całą wartość zamówienia:

```text
pakiet
+ dodatki
+ transport
```

Zapisuj:

- typ rabatu,
- wartość wprowadzoną,
- faktyczną kwotę rabatu,
- osobę przyznającą,
- opcjonalny powód.

## 13.5. Cena końcowa

```text
Pakiet
+ dodatki
+ transport
- rabat
= razem
```

## 13.6. Zadatek

Domyślnie:

```text
300 zł + cena transportu dla klienta
```

Zadatek jest edytowalny.

Zasady:

- nie może przekroczyć całej wartości rezerwacji,
- zmiana transportu aktualizuje go automatycznie tylko wtedy, gdy nie został ręcznie zmieniony,
- po ręcznej zmianie nie nadpisuj go automatycznie.

Pokaż:

- sugerowany zadatek,
- ustalony zadatek,
- zapłacony zadatek,
- datę wpłaty,
- pozostało do zadatku,
- pozostało do całkowitej zapłaty.

---

# 14. Transport, flota i paliwo

Nie twórz osobnych, dublujących się modułów:

- pojazdy,
- paliwo,
- transport.

## 14.1. Flota

Moduł Flota przechowuje:

- markę i model,
- numer rejestracyjny,
- spalanie,
- rodzaj paliwa,
- pojemność,
- koszt kilometra,
- przeglądy,
- ubezpieczenia,
- awarie,
- dostępność.

## 14.2. Transport w rezerwacji

Korzysta z danych floty i zawiera:

- adres,
- trasę,
- odległość,
- pojazd,
- planowane kilometry,
- koszt wewnętrzny,
- cenę transportu dla klienta,
- marżę.

## 14.3. Po wpisaniu adresu

System automatycznie:

1. Pobiera trasę z Google Maps.
2. Oblicza odległość w jedną stronę.
3. Klasyfikuje wyjazd jako bliski lub daleki.
4. Ustala cenę transportu dla klienta.
5. Oblicza planowane kilometry.
6. Oblicza koszt wewnętrzny.
7. Aktualizuje zadatek.
8. Aktualizuje marżę.

---

# 15. Widełki transportowe

Odległość liczona jest w jedną stronę od bazy do klienta.

Wszystkie ceny są brutto.

| Odległość w jedną stronę | Cena dla klienta |
|---:|---:|
| 0–20 km | 200 zł |
| 21–50 km | 300 zł |
| 51–100 km | 350 zł |
| 101–150 km | 400 zł |
| 151–200 km | 450 zł |
| 201–250 km | 500 zł |
| 251–300 km | 600 zł |
| 301–400 km | 900 zł |

Powyżej 400 km:

> Wycena indywidualna

System nadal oblicza koszt wewnętrzny, ale cena klienta wymaga decyzji Szefa.

Widełki muszą być edytowalne w module Oferta i cennik.

---

# 16. Logika D × 2 i D × 4

Niech:

```text
D = odległość drogowa w jedną stronę od bazy do klienta
```

## 16.1. Domyślnie pracownik zostaje na miejscu

Przełącznik:

> Wracam do bazy między montażem a demontażem

jest domyślnie wyłączony.

Trasa:

```text
baza → klient
klient → baza po demontażu
```

Koszt wewnętrzny:

```text
D × 2
```

## 16.2. Pracownik wraca do bazy

Po włączeniu przełącznika:

```text
baza → klient → baza
baza → klient → baza
```

Koszt wewnętrzny:

```text
D × 4
```

## 16.3. Zasady

Opcja jest automatycznie dostępna, gdy:

```text
D ≤ 100 km
```

Dokładnie 100 km nadal oznacza realizację bliską.

Daleki wyjazd zaczyna się dopiero powyżej 100 km w jedną stronę.

Decyzja pracownika zmienia wyłącznie:

- koszt wewnętrzny,
- planowane kilometry,
- spalanie,
- czas transportu,
- marżę.

Nie zmienia ceny transportu dla klienta.

Szef może:

- zmienić klasyfikację bliski/daleki,
- włączyć możliwość powrotu dla dalszego wyjazdu,
- zablokować możliwość powrotu,
- nadpisać mnożnik przejazdu,
- dodać dodatkowy przejazd.

Ręczne nadpisanie wymaga zapisania autora i powodu.

---

# 17. Magazyn

Zbuduj pełny moduł zarządzania magazynem.

## 17.1. Funkcje

- dodawanie pozycji,
- edycja pozycji,
- zdjęcia,
- kategorie,
- ilość,
- jednostka,
- lokalizacja magazynowa,
- numer zestawu,
- przypisanie do namiotu,
- cena zakupu brutto,
- data zakupu,
- dostawca,
- cena wynajmu brutto,
- wartość odtworzeniowa,
- dostępność,
- status,
- czyszczenie,
- serwis,
- uszkodzenia,
- wycofanie.

## 17.2. Typy pozycji

### Pozycje ilościowe

Np.:

- krzesła,
- stoły,
- pałeczki fluo,
- obciążniki.

### Konkretne egzemplarze

Np.:

- namiot,
- laser,
- nagłośnienie,
- nagrzewnica.

Każdy egzemplarz może posiadać:

- numer,
- zdjęcie,
- historię,
- stan,
- przypisanie do zestawu.

## 17.3. Uprawnienia na pierwszym etapie

Na pierwszym etapie wszyscy pracownicy mają pełny dostęp do wprowadzania i edycji magazynu.

Mogą:

- dodawać sprzęt,
- dodawać zdjęcia,
- zmieniać nazwy,
- zmieniać opisy,
- wpisywać ilości,
- wpisywać ceny zakupu,
- wpisywać ceny wynajmu,
- przypisywać kategorie,
- zmieniać status,
- oznaczać uszkodzenia,
- oznaczać czyszczenie,
- przypisywać lokalizację.

Każda zmiana musi zapisywać:

- autora,
- datę,
- starą wartość,
- nową wartość.

Ograniczenia uprawnień zostaną dodane później, po wprowadzeniu magazynu.

---

# 18. Pracownicy i rozliczenia

Zbuduj jeden silnik rozliczeń z dwiema liniami biznesowymi:

- iClub,
- Wypożyczalnia.

W interfejsie mogą być osobne zakładki, ale logika bazowa powinna być wspólna.

Każdy pracownik ma osobne reguły dla każdej linii biznesowej.

## 18.1. Standard przypisania

Standardowo:

```text
jedna realizacja → jeden przypisany pracownik
```

Wynagrodzenie i premie naliczaj per przypisany pracownik.

Nie buduj teraz rozbudowanej logiki podziału premii między kilkuosobową ekipę.

W wyjątkowym przypadku Szef może dodać premię ręczną drugiej osobie.

---

# 19. Bartek — zasady rozliczenia iClub

Nie koduj danych Bartka na stałe. Zbuduj edytowalne reguły, a następnie ustaw poniższą konfigurację początkową.

## 19.1. Pierwsze cztery realizacje w miesiącu

Każda z pierwszych czterech zakończonych realizacji iClub:

```text
1 realizacja = 8 godzin czasu wolnego w Taurus
```

Wartość rozliczeniowa:

```text
8 h × 32,40 zł = 259,20 zł
```

System zapisuje:

- 8 godzin czasu wolnego,
- wartość rozliczeniową 259,20 zł,
- brak podstawowej wypłaty gotówkowej.

## 19.2. Piąta i każda kolejna realizacja

Za piątą i każdą kolejną zakończoną realizację iClub w danym miesiącu:

```text
500 zł brutto za realizację
```

Kwota musi być konfigurowalna.

Może zostać zmieniona przez Szefa na inną wartość bez zmiany kodu.

Do tej kwoty doliczane są należne premie.

## 19.3. Premie

- daleki wyjazd powyżej 100 km w jedną stronę: 150 zł,
- dodatkowy namiot gastronomiczny: 150 zł,
- pozyskana opinia: 20 zł,
- zaakceptowana i opublikowana rolka: 50 zł,
- premia ręczna Szefa: dowolna kwota.

Premia za dodatkowy namiot gastronomiczny:

- jest jedna na realizację,
- trafia w całości do przypisanego pracownika.

## 19.4. Co liczy się jako realizacja

Realizacja liczy się do miesięcznego limitu, gdy:

- została zakończona,
- nie została anulowana,
- ma przypisanego pracownika.

Jedno zlecenie liczy się jako jedna realizacja, nawet jeśli obejmuje montaż i demontaż w różnych dniach.

## 19.5. Rezerwacje do zgarnięcia

Pracownik musi widzieć:

- formę wynagrodzenia,
- przewidywaną wartość,
- premie gwarantowane,
- premie możliwe do uzyskania,
- warunki naliczenia.

Przykład dla pierwszych czterech realizacji:

```text
Do zgarnięcia:

8 godzin czasu wolnego
Wartość rozliczeniowa: 259,20 zł
Premia za daleki wyjazd: +150 zł
Premia za dodatkowy namiot: +150 zł
```

Przykład dla piątej realizacji:

```text
Do zgarnięcia:

Ryczałt za realizację: 500 zł
Premia za daleki wyjazd: +150 zł
Premia za dodatkowy namiot: +150 zł

Potencjalna wartość: 800 zł
```

Rozróżnij:

- wynagrodzenie przewidywane,
- wynagrodzenie naliczone,
- wynagrodzenie zatwierdzone,
- wynagrodzenie rozliczone.

---

# 20. Koszty i płatności

Obecna jedna długa lista jest niewystarczająca.

## 20.1. Domyślny widok

Po wejściu pokazuj aktualny miesiąc.

Dodaj:

- poprzedni miesiąc,
- następny miesiąc,
- zakres dat,
- cały rok.

## 20.2. Filtry kosztów

- miesiąc,
- linia biznesowa,
- kategoria,
- realizacja,
- pracownik,
- pojazd,
- dostawca,
- status,
- metoda płatności,
- koszt planowany/rzeczywisty.

## 20.3. Filtry płatności

- miesiąc,
- klient,
- rezerwacja,
- zapłacona,
- niezapłacona,
- częściowa,
- zadatek,
- płatność końcowa,
- termin płatności,
- metoda płatności.

Dodaj podsumowanie przefiltrowanego widoku:

- suma kosztów,
- suma wpływów,
- niezapłacone,
- zadatki,
- pozostało do zapłaty.

---

# 21. Edycja istniejącej rezerwacji

Widok edycji musi używać tej samej logiki co tworzenie rezerwacji.

Współdziel:

- komponenty,
- walidację,
- kalkulator ceny,
- wybór namiotów,
- wybór dodatków,
- transport,
- zadatek,
- rabat,
- ustalenia czasowe.

Zmiana rezerwacji musi ponownie sprawdzać:

- dostępność namiotów,
- dostępność dodatków,
- transport,
- wynagrodzenie pracownika,
- sugerowany czas montażu.

Nie zmieniaj automatycznie ceny istniejącej rezerwacji bez potwierdzenia Szefa.

---

# 22. Ceny i wartości

Wszystkie kwoty użytkowe w aplikacji są brutto.

Dotyczy to:

- pakietów,
- dodatków,
- transportu,
- rabatów,
- zadatków,
- płatności,
- kosztów,
- wynagrodzeń,
- premii.

Model danych może później zostać rozbudowany o:

- stawkę VAT,
- wartość netto,
- wartość VAT,

ale nie komplikuj tym obecnych formularzy.

---

# 23. Zmiany globalne

W całej aplikacji zmień:

```text
iClub (namioty)
```

na:

```text
iClub
```

Zmień:

```text
zaliczka
```

na:

```text
zadatek
```

Zmień użytkową nazwę roli:

```text
właściciel
```

na:

```text
Szef
```

Techniczny identyfikator `owner` może pozostać w bazie.

Przeszukaj:

- komponenty,
- formularze,
- powiadomienia,
- dane testowe,
- seedy,
- walidację,
- dokumenty,
- instrukcje,
- etykiety,
- teksty pomocnicze.

---

# 24. Kryteria zakończenia pierwszej tury

Pierwsza tura nie jest zakończona, dopóki:

1. Kafelki pulpitu prowadzą do konkretnych rekordów lub filtrów.
2. „Wymaga uwagi” prowadzi do konkretnego problemu.
3. Overbooking namiotów jest blokowany.
4. Mobilny kalendarz pokazuje cały tydzień.
5. Dostępny jest priorytetowy widok weekendu.
6. Powiadomienia są pod ikoną dzwonka.
7. Formularz rezerwacji jest uproszczony.
8. Liczba osób nie jest wymagana.
9. Daty montażu i demontażu są domyślnie ukryte.
10. Domyślnie montaż przypada w dniu imprezy, a demontaż następnego dnia.
11. Duże namioty działają jako pula dwóch egzemplarzy.
12. Duży namiot z tylnymi drzwiami jest konkretnym zasobem.
13. Dodatkowy namiot działa jako osobna sekcja.
14. Dodatki korzystają z magazynu.
15. Pakiet ma własną cenę niezależną od sumy przedmiotów.
16. Boczne podsumowanie przelicza cenę na żywo.
17. Rabat działa procentowo lub kwotowo i obejmuje całe zamówienie.
18. Zadatek domyślnie wynosi 300 zł plus cena transportu.
19. Transport przelicza się po wpisaniu adresu.
20. Widełki transportowe działają zgodnie z tym dokumentem.
21. D × 2 i D × 4 wpływają tylko na koszt wewnętrzny.
22. Dokładnie 100 km jest wyjazdem bliskim.
23. Daleki wyjazd zaczyna się powyżej 100 km w jedną stronę.
24. Flota jest jednym źródłem danych o pojazdach.
25. Magazyn można w pełni edytować.
26. Każda zmiana magazynowa jest audytowana.
27. Pierwsze cztery realizacje Bartka naliczają czas wolny.
28. Piąta i każda kolejna nalicza konfigurowalne 500 zł plus dodatki.
29. Koszty i płatności mają widoki miesięczne i filtry.
30. Nowa impreza istniejącego klienta tworzy nowy lead.
31. Powrót do starego zapytania reaktywuje stary lead.
32. Globalne nazewnictwo zostało poprawione.
33. `npm run lint` kończy się bez błędów.
34. `npm run build` kończy się bez błędów.

---

# 25. Funkcje wyłączone z tej tury

Nie wdrażaj teraz:

- integracji SMS,
- odczytu historii połączeń,
- aplikacji pomocniczej Android,
- automatycznych odpowiedzi OLX,
- podpowiadanych odpowiedzi AI,
- pełnej telefonii internetowej,
- rozbudowanego dzielenia wynagrodzenia między kilkuosobową ekipę,
- ograniczania uprawnień pracowników w magazynie.

Te elementy zostaną zaprojektowane osobno.

---

# 26. Decyzje końcowe

1. Cennik pozostaje jako moduł „Oferta i cennik”.
2. Magazyn, oferta i kalkulator rezerwacji są trzema osobnymi warstwami.
3. Namiot gastronomiczny znajduje się w sekcji „Dodatkowy namiot”.
4. Rabat obejmuje całą wartość zamówienia.
5. Wszystkie ceny są brutto.
6. Cena transportu klienta zależy od odległości w jedną stronę.
7. Powrót pracownika D × 4 zmienia wyłącznie koszt wewnętrzny.
8. Dokładnie 100 km jest wyjazdem bliskim.
9. Daleki wyjazd zaczyna się powyżej 100 km.
10. Pierwsze cztery realizacje Bartka oznaczają po 8 godzin czasu wolnego.
11. Piąta i każda kolejna realizacja Bartka oznacza 500 zł lub inną konfigurowalną wartość plus premie.
12. Premie są naliczane per przypisany pracownik.
13. Nowa impreza istniejącego klienta tworzy nowy lead.
14. Integracja SMS zostaje odłożona do osobnego modułu.
