# Rejestr decyzji

## Cel dokumentu

Zapewnić trwały zapis ważnych decyzji, powodów i konsekwencji.

## Stan obecny

Zapisano decyzje kierunkowe i nowe wymagania biznesowe. Podział MVP pozostaje propozycją do zatwierdzenia.

## Zatwierdzone decyzje

### 1. PWA jako pierwsza forma aplikacji

Data: 2026-07-18  
Decyzja: Projekt będzie tworzony najpierw jako responsywna PWA.  
Powód: Ma działać przez przeglądarkę na komputerze, Androidzie i iOS.  
Konsekwencje: Aplikacje natywne nie należą do bieżącego planu.  
Status: zatwierdzona

### 2. Supabase jako przyszły backend

Data: 2026-07-18  
Decyzja: Docelowym backendem będzie Supabase.  
Powód: To ustalony kierunek dalszego rozwoju.  
Konsekwencje: Integracja nastąpi w osobnym etapie.  
Status: zatwierdzona

### 3. Niezależność od Taurusa

Data: 2026-07-18  
Decyzja: iClub pozostaje niezależnym projektem.  
Powód: Ma własne repozytorium, zależności i przyszłą bazę.  
Konsekwencje: Przyszłe przekazanie czasu pracy będzie osobną integracją; nie wolno korzystać z projektu Taurus.  
Status: zatwierdzona

### 4. Iteracyjny i zautomatyzowany rozwój

Data: 2026-07-18  
Decyzja: Funkcje będą rozwijane małymi iteracjami, a techniczne kroki wykona Codex.  
Powód: Wymagania będą weryfikowane w testach, a użytkownik skupia się na biznesie.  
Konsekwencje: Nie budujemy funkcji na zapas; commit następuje po akceptacji.  
Status: zatwierdzona

### 5. Wewnętrzny system i dwie linie biznesowe

Data: 2026-07-18  
Decyzja: System jest narzędziem wewnętrznym i rozróżnia `ICLUB` oraz `EQUIPMENT_RENTAL`.  
Powód: Firma prowadzi dwa rodzaje działalności wymagające osobnych analiz.  
Konsekwencje: Przychody, koszty i rentowność muszą być przypisywalne do linii.  
Status: zatwierdzona

### 6. Początkowe role

Data: 2026-07-18  
Decyzja: Początkowe role to `OWNER` i `EMPLOYEE`. Pracownik widzi operacyjne zlecenia, klientów i wartości, ale nie wynagrodzenia, stawki ani konfigurację właściciela.  
Powód: Taki podział odpowiada ustalonemu sposobowi pracy.  
Konsekwencje: Uprawnienia muszą rozdzielać dane operacyjne i poufne dane pracownicze.  
Status: zatwierdzona

### 7. Rezerwacja tymczasowa

Data: 2026-07-18  
Decyzja: Domyślnie trwa 48 godzin, może być przedłużona i blokuje zasób także bez zadatku.  
Powód: Firma potrzebuje czasowej blokady podczas ustaleń z klientem.  
Konsekwencje: System pokazuje brak zadatku oraz obsługuje potwierdzenie, anulowanie i wygaśnięcie.  
Status: zatwierdzona

### 8. Konflikt jako ostrzeżenie

Data: 2026-07-18  
Decyzja: System ostrzega o konflikcie, ale `OWNER` może świadomie zatwierdzić zlecenie.  
Powód: Ocena wykonalności wymaga wiedzy operacyjnej właściciela.  
Konsekwencje: Dostępność musi uwzględniać pełne okno logistyczne, a nie tylko wydarzenie.  
Status: zatwierdzona

### 9. Konfigurowalne pakiety

Data: 2026-07-18  
Decyzja: Pakiety Podstawowy, Premium i VIP oraz ich zawartość mają być zmieniane bez zmian kodu; ceny nie będą stałymi w aplikacji.  
Powód: Oferta może się zmieniać.  
Konsekwencje: Model pakietów i wyceny wymaga konfiguracji w późniejszym etapie.  
Status: zatwierdzona

### 10. Etapowanie offline

Data: 2026-07-18  
Decyzja: Najpierw proste dane terenowe i kolejka, później zdjęcia, podpisy, szkody i trudniejsze konflikty.  
Powód: Pliki i zaawansowana synchronizacja znacząco zwiększają ryzyko techniczne.  
Konsekwencje: Offline nie blokuje walidacji procesu online w MVP 1.  
Status: zatwierdzona kierunkowo

## Propozycja wymagająca zatwierdzenia

MVP 1 obejmuje podstawowy proces od klienta do płatności i kosztu. MVP 2 dodaje pierwszy etap offline, rozbudowę magazynu, checklist, czasu pracy, płatności i dokumentów. Szczegóły znajdują się w `CURRENT_SCOPE.md`.

## Kwestie do uzupełnienia

Należy zatwierdzić granice MVP 1 i odpowiedzieć na pytania blokujące z `OPEN_QUESTIONS.md`.

## Szablon wpisu

Data:  
Tytuł:  
Decyzja:  
Powód:  
Konsekwencje:  
Status:

## Rozwój iteracyjny

Rejestr będzie aktualizowany po każdej ważnej decyzji produktowej lub technicznej.
