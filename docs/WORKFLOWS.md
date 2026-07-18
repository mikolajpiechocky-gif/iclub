# Procesy robocze

## Cel dokumentu

Opisać uzgodniony przebieg pracy na poziomie wystarczającym do zaplanowania MVP, bez przesądzania ekranów i encji.

## Stan obecny

Proces główny jest znany kierunkowo. Statusy, wyjątki i szczegółowe odpowiedzialności nadal wymagają ustalenia.

## Proces główny

### 1. Zapytanie klienta

`OWNER` zapisuje lub wybiera klienta, źródło, wydarzenie, termin, lokalizację, liczbę osób, interesujący namiot lub sprzęt, oczekiwany zakres, notatki, kontakt i status. Ostateczny zestaw pól: do ustalenia.

### 2. Rezerwacja tymczasowa

Z zapytania powstaje blokada wybranych zasobów, domyślnie na 48 godzin. Właściciel może ją przedłużyć. Brak zadatku jest widoczny, ale nie znosi blokady. Rezerwacja może zostać potwierdzona, anulowana lub wygasnąć.

### 3. Kontrola dostępności

System sprawdza zajętość zasobu w pełnym oknie operacyjnym, nie tylko podczas wydarzenia. Rozróżnia konflikt twardy, ostrzeżenie logistyczne i ryzyko operacyjne. Właściciel może zatwierdzić plan mimo ostrzeżenia; sposób zapisania uzasadnienia jest do ustalenia.

### 4. Potwierdzenie zlecenia

Rezerwacja staje się zleceniem handlowym z linią biznesową, zakresem, konfigurowalnym pakietem lub sprzętem, transportem, korektami i wartością brutto oraz stawką VAT. Dla `ICLUB` umowa będzie obowiązkowa, ale dokumenty są poza MVP 1.

### 5. Planowanie realizacji

Ustalane są etapy i czasy: przygotowanie, załadunek, wyjazd, transport, montaż, odbiór klienta, wydarzenie, serwis, demontaż, powrót, rozładunek, kontrola i rozliczenie. Nie każde zlecenie musi korzystać ze wszystkich etapów.

### 6. Przygotowanie i przekazanie pracy

System przypisuje namiot, sprzęt i pracowników oraz generuje checklisty na podstawie konfiguracji realizacji. Pracownik widzi zlecenia, dane klienta, wartość i informacje operacyjne; może po uzgodnieniu zmienić godzinę realizacji.

### 7. Wykonanie checklisty

Etapy mogą obejmować magazyn, załadunek, montaż, test, przekazanie, demontaż, powrót i kontrolę. Checklistę można zakończyć z brakami dopiero po ostrzeżeniu, pokazaniu brakujących punktów i podaniu jednego końcowego wyjaśnienia. Zdjęcia po montażu i podczas demontażu są wymaganiem późniejszego etapu.

### 8. Zakończenie i rozliczenie

Po powrocie następuje kontrola sprzętu, zapis szkód lub braków, zakończenie realizacji, płatność i koszty. Pracownik może zgłosić odbiór gotówki, a właściciel potwierdza go osobno.

## Procesy wspierające

- Czas pracy: start, stop, przypisanie do zlecenia oraz ręczna korekta z odpowiednim uprawnieniem.
- Magazyn: przygotowanie, wydanie, zwrot, kontrola, uszkodzenie, serwis i brak.
- Umowy: obowiązkowe dla `ICLUB`, opcjonalne dla `EQUIPMENT_RENTAL`; wersjonowanie, generowanie i podpis są poza MVP 1.
- Rentowność: przyszłe zestawienie przychodu i kosztów zlecenia oraz osobna analiza linii biznesowych.

## Kwestie do uzupełnienia

Do ustalenia: statusy procesu, warunki przejść, sposób wygaśnięcia rezerwacji, odpowiedzialność za etapy, obsługa anulowania i zmian w trakcie realizacji oraz minimalne dane wymagane do zamknięcia zlecenia.

## Rozwój iteracyjny

Najpierw zostanie zweryfikowany prosty przebieg MVP 1, a wyjątki będą dodawane na podstawie realnego użycia.
