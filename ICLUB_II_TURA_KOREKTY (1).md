# iClub Management — II tura poprawek

> Dokument zawiera pełen zakres poprawek do wdrożenia. Uwzględniono wszystkie doprecyzowania i korekty wcześniejszych błędnych interpretacji — obowiązuje wersja opisana poniżej.

---

## 1. Zestawy i uprawnienia

### 1.1. Kolory zestawów

Kolory zestawów miały zostać usunięte, jednak w realizacjach nadal pojawiają się komunikaty typu „Zestaw X (kolor) jest niedostępny”.

- Logika kolorów zestawów ma zniknąć **całkowicie**.
- **Nie ma żadnych wyjątków** — nie tworzymy wyjątku dla Szefa ani żadnej możliwości wymuszenia/ominięcia blokady. Blokada nie istnieje, więc nie ma czego omijać.

### 1.2. Uprawnienia pracownika — magazyn (namioty)

Obecnie pracownik **nie może** dodawać ani edytować namiotów — i to jest błąd.

Zgodnie z wcześniejszymi ustaleniami dotyczącymi pierwszego etapu wdrożenia pracownik **powinien móc**:

- dodawać namioty,
- edytować namioty.

Do naprawy.

---

## 2. Rozliczenie realizacji

Podsumowanie ceny realizacji w każdym zleceniu ma zawsze wyglądać tak:

```
Pakiet
Dodatki
Transport
------------------
Suma

Zadatek
Do zapłaty na miejscu
```

### Logika zadatku

- Kwota zadatku **zaciągana jest z rezerwacji** (faktyczna wartość zapisana w rezerwacji).
- Domyślnie zadatek wynosi: **300 zł + koszty transportu**.
- Aplikacja pobiera kwotę zadatku z rezerwacji, sumuje ją z kwotą transportu i dopiero z tego powstaje prawidłowa wartość zadatku.

### Do zapłaty na miejscu

```
Pakiet
+ Dodatki
+ Transport
− Zadatek
==================
Pozostało do zapłaty
```

---

## 3. Checklisty — generowanie automatyczne

Obecnie checklisty trzeba generować ręcznie.

- Jeżeli dotyczy to **wyłącznie starych, zaimportowanych realizacji** — jest to akceptowalne, zostawiamy.
- Jeżeli dotyczy również **nowych rezerwacji** — należy to zmienić.

**Docelowo:** przy każdej nowej, potwierdzonej realizacji checklista ma tworzyć się **automatycznie**.

---

## 4. Zaimportowane realizacje — przypisanie pracownika

Dotyczy zaimportowanych realizacji, które pozostają do zrealizowania (niezakończone).

- Obecnie **nie da się przypisać pracownika do zlecenia**, choć wcześniej było to możliwe.
- Należy namierzyć przyczynę błędu i go naprawić.

Dodatkowo, jeżeli realizacja nie ma przypisanego pracownika:

- poza powiadomieniem push,
- prośba o przypisanie ma pojawiać się w sekcji **„Wymaga uwagi”**.

---

## 5. Skalowanie aplikacji po zalogowaniu

Po zalogowaniu aplikacja jest automatycznie przybliżona i wystaje poza ekran — trzeba ręcznie ściągać ją palcami (pinch), żeby zmniejszyć.

To błąd. Aplikacja po uruchomieniu ma zawsze poprawnie mieścić się na ekranie.

---

## 6. Wynagrodzenia — reguły rozliczeń

Bartkowi wyświetla się **ryczałt** zamiast **1 dnia wolnego + x zł**.

- Regułę należy zaudytować i poprawić.
- Trzeba **wielokrotnie (10×) upewnić się**, że wdrożone zostały **wszystkie** wcześniejsze wytyczne dotyczące form rozliczeń.
- System ma umożliwiać prawidłowe oznaczanie form rozliczeń oraz poprawne ich przenoszenie i wyświetlanie pracownikowi.

---

## 7. Kafelek „Najbliższa realizacja”

Obecnie wyświetla się **liczba osób** na imprezie. Ma się wyświetlać **ustalona godzina montażu**.

```
Było:     Osób: 30
Ma być:   Montaż: 15:30
```

---

## 8. Checklista Tomasza Brudzińskiego

Realizacja Tomasza Brudzińskiego ma checklistę niezgodną z pakietem.

- Najprawdopodobniej **nie jest to problem generatora** — to po prostu stara, przykładowa checklista.
- Należy zweryfikować jej źródło.
- Jeżeli pochodzi z danych testowych lub starego generatora — wygenerować ją ponownie według aktualnych reguł.
- **Nie przebudowywać generatora**, jeśli działa poprawnie dla nowych realizacji.

### Punkt „Dokumenty”

Nowo generowane checklisty są poprawne, ale zawierają dziwny punkt o **dokumentach**. Ten punkt należy **usunąć** z checklist.

---

## 9. Walidacja zakończenia zadania

Zadania nie da się zakończyć, jeżeli coś nie zostało odhaczone lub nie podano powodu.

Logika:

1. System sprawdza, czy wszystkie pozycje są odhaczone.
2. **TAK** → pozwala zakończyć zadanie (np. pakowanie).
3. **NIE** → prosi o podanie powodu.
4. Po podaniu powodu → pozwala zakończyć zadanie.

---

## 10. Dodatkowa pozycja w checklistach

Do każdej checklisty w sekcji **dodatków** dodać pozycję:

```
☐ Zapasowe nagłośnienie (jeśli dostępne)
```

---

## 11. Status realizacji w zleceniach zaplanowanych

W zleceniach zaplanowanych krok **„Realizacja”** jest oznaczony jako zakończony.

To błąd — realizacja zaplanowana nie może być zakończona.

---

## 12. Zadanie: Telefon do klienta (przed pakowaniem)

Przed zadaniem **Pakowanie** dodać nowe zadanie: **Telefon do klienta**.

**Treść zadania:**

> Zadzwoń, aby potwierdzić pakiet i dodatki. Ustal godzinę, miejsce i podłoże, na jakim będziemy montowali namiot.

### Do potwierdzenia z klientem

- pakiet,
- dodatki,
- **sztuczna trawa**,
- godzina,
- miejsce,
- podłoże.

### Po rozpoczęciu zadania wyświetla się

- godzina montażu obowiązująca w danym pakiecie,
- podsumowanie pakietu,
- lista dodatków.

### Pracownik uzupełnia

- godzinę montażu potwierdzoną z klientem,
- godzinę rozpoczęcia imprezy,
- odklikuje potwierdzenie zakresu rezerwacji,
- wpisuje ewentualne nowe dodatki.

**Premia za dosprzedaż: +15%** — za odsprzedaż dodatków pracownikowi nalicza się premia w wysokości 15%.

---

## 13. Nagłówek realizacji

Brakuje szczegółów realizacji w nagłówku. Nagłówek ma zawierać:

- wielkość namiotu (**Duży / Mały**),
- pakiet,
- listę dodatków.

Informacje mają być widoczne **w nagłówku**, a nie dopiero pod nim.

---

## 14. Przypisanie pojazdu

Pracownik musi przypisać pojazd do realizacji w szczegółach realizacji.

- Bez przypisanego pojazdu aplikacja **nie pozwala rozpocząć realizacji**.
- Jest to wymagane do prawidłowego rozliczania kosztów paliwa.

---

## 15. Zadanie: Realizacja

**Przebieg:**

```
Rozpocznij realizację
   ↓
Status: W drodze
   ↓
Jestem na miejscu
   ↓
Montaż (checklista)
   ↓
Zdjęcia (zapisują się w zleceniu jako "przed")
   ↓
Szkolenie klienta (checklista)
   ↓
Rozliczenie
   ↓
Zakończ montaż
```

Po odklikaniu zakończenia montaż jest zakończony:

- status zmienia się na **Wynajem trwa**,
- na ekranie pracownika wyświetla się informacja, że wynajem trwa,
- pracownik może **dodać incydent** (np. informację o awarii, uszkodzeniu, problemie z klientem).

### Checklista montażu

```
☐ Rozstaw namiot
☐ Zakotwienie
☐ Test nagłośnienia
☐ Test oświetlenia
☐ Wytwornica uzupełniona płynem
```

### Checklista szkolenia klienta

```
☐ Zakaz palenia
☐ Nie wyłączać dmuchawy (kaucja przepada)
☐ Zachowanie przy silnym wietrze
☐ Jeżeli namiot zacznie tracić ciśnienie — najpierw bezpiecznie wyprowadzamy
   wszystkich, a dopiero potem szukamy przyczyny
```

### Rozliczenie

Wyświetla całe rozliczenie:

- pakiet,
- dodatki,
- transport,
- suma,
- zapłacono,
- pozostało do zapłaty,
- **kaucja: 1000 zł**.

---

## 16. Zadanie: Demontaż

**Przebieg:**

```
Rozpocznij demontaż
   ↓
Czy są uszkodzenia lub sprzęt wymaga czyszczenia?
   ↓
Checklista sprzętowa (ta sama co z montażu/pakowania)
   ↓
Zwrot kaucji
   ↓
Zakończ demontaż
   ↓
W drodze na bazę
   ↓
Zakończ realizację
```

### Checklista przy demontażu

**Nie tworzymy drugiej, niezależnej checklisty.** Wykorzystujemy **tę samą checklistę sprzętową**, która została użyta podczas montażu/pakowania — jest tam każdy element, więc będzie to najwygodniejsze.

Pracownik przechodzi po wszystkich elementach i dla każdego może oznaczyć:

- **OK**,
- **wymaga czyszczenia**,
- **uszkodzony**,
- **brakuje**.

Dodatkowo może:

- dodać zdjęcia (uszkodzeń, zabrudzeń),
- dodać opis.

Informacje zapisują się do realizacji, żeby ekipa czyszcząca wiedziała, co robić. Docelowo posłużą do generowania **zadań serwisowych**.

### Zwrot kaucji

- Domyślnie: **pełny zwrot** (do szybkiego odklikania).
- Pracownik może wpisać kwotę potrącenia za ewentualne uszkodzenia.

---

## 17. Zadanie: Rozładunek

Dotychczasowy etap **„Rozpakowanie i koszty”** rozdzielamy na osobne kroki.

**Przebieg:**

```
Rozpocznij
   ↓
Sprzęt rozpakowany
   ↓
Samochód posprzątany
   ↓
Koszty dodane
   ↓
Zakończ realizację
```

### Przyciski „Dodaj koszt” i „Dodaj zgłoszenie”

**Nie są stałe pod nagłówkiem.** Mają być dostępne w odpowiednim miejscu procesu.

**Dodaj koszt** — po kliknięciu rozwija się formularz:

- nazwa kosztu (co),
- kwota (za ile),
- komentarz (opcjonalnie).

**Dodaj zgłoszenie** — po kliknięciu wybór typu:

- **Uwaga**,
- **Incydent**,
- **Pomysł**.

Każdy typ zapisuje się jako inny rodzaj zgłoszenia.

W rozładunku również musi być możliwość zgłoszenia usterki lub konieczności czyszczenia. **Uwagi trafiają dokładnie w to samo miejsce co zgłoszenia z demontażu** — na tej podstawie będą później generowane zadania serwisowe.

### Koszty realizacji

Koszty zapisują się do zlecenia. Automatycznie zapisują się również:

- wynagrodzenie pracownika,
- koszt paliwa.

**Koszt paliwa liczony jest z faktycznej liczby przejechanych kilometrów**, a nie ze stawki za transport, którą płaci klient.

---

## 18. Pełna architektura nowych bytów

**Bardzo ważne.** Nie chcemy prostych formularzy. Każdy nowy byt powstający w aplikacji musi mieć od razu **pełną infrastrukturę z regułami** umożliwiającą odpowiednie zapisywanie i rozliczanie — łącznie z odpowiedziami Szefa na zgłoszenia, akceptacją kosztów i rozliczaniem realizacji z pracownikami.

### Koszty — wymagane elementy modelu

- autor,
- data,
- realizacja,
- kategoria,
- możliwość akceptacji,
- możliwość odrzucenia,
- historia zmian,
- wpływ na rozliczenie realizacji,
- wpływ na rentowność,
- możliwość późniejszego eksportu.

### Zgłoszenia — wymagane elementy modelu

- typ (uwaga / incydent / pomysł),
- autor,
- data,
- realizacja,
- status,
- odpowiedź Szefa,
- możliwość zamknięcia,
- historia zmian,
- możliwość późniejszego przekształcenia (np. w zadanie serwisowe lub zadanie rozwojowe).

**To nie mogą być zwykłe notatki.**

---

## 19. Podsumowanie realizacji dla pracownika

Po zakończeniu rozładunku pracownikowi wyświetla się podsumowanie. Przykład:

```
Czas pracy
6 h 25 min

Przejechano
186 km

Premie
Daleki wyjazd    +150
Opinia           +20
Rolka            +50

Łącznie
720 zł
```

---

## 20. Kilka realizacji w jeden weekend

**Bardzo ważna rzecz.** Czasami wynajem jest w piątek i sobotę, więc pracownik musi spakować się na dwa wynajmy.

- W module **Najbliższe realizacje** mają wyskakiwać **wszystkie realizacje danego pracownika na najbliższy weekend**.
- Odświeżenie następuje **w każdy poniedziałek** — wtedy w najbliższych rezerwacjach odpalają się rezerwacje na kolejny weekend.
- Od poniedziałku na wszystkich tych realizacjach można już działać (rozpocząć przygotowania).

---

## 21. Paski postępu

Każdy z kroków ma swój własny pasek postępu. Dotyczy to:

- telefonu do klienta,
- pakowania,
- wyjazdu,
- realizacji,
- demontażu,
- rozładunku,
- zakończenia realizacji.

Pracownik w każdej chwili ma widzieć:

- na jakim etapie znajduje się realizacja,
- które kroki zostały ukończone,
- które kroki pozostały do wykonania.
