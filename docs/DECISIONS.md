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

### 11. Fonty self-hostowane

Data: 2026-07-18  
Decyzja: Manrope i Space Grotesk trzymamy jako lokalne pliki `.woff2` w `public/fonts/` (nie przez `next/font`).  
Powód: `next/font` pobiera fonty w trakcie kompilacji, co blokuje build w środowisku offline; lokalne pliki działają zawsze.  
Konsekwencje: Font ładuje się także offline; aktualizacja fontu = ponowne pobranie plików.  
Status: zatwierdzona

### 12. Supabase jako backend MVP 1 i logowanie e-mail/hasło

Data: 2026-07-19  
Decyzja: Backendem jest Supabase (Auth + Postgres). Logowanie e-mail/hasło; konta zakłada właściciel w panelu Supabase (brak otwartej rejestracji).  
Powód: Narzędzie wewnętrzne — prostota i kontrola dostępu.  
Konsekwencje: Nowych pracowników dodaje właściciel; ról nie zmienia się z poziomu aplikacji (na razie).  
Status: zatwierdzona

### 13. Tryb demo jako fallback

Data: 2026-07-19  
Decyzja: Przy braku konfiguracji Supabase aplikacja działa w TRYBIE DEMO — logowanie wyłączone, warstwa danych zwraca dane przykładowe.  
Powód: Możliwość testowania interfejsu bez backendu i bez blokowania użytkownika.  
Konsekwencje: Zapis danych w trybie demo jest zablokowany z czytelnym komunikatem.  
Status: zatwierdzona

### 14. Warstwa dostępu do danych

Data: 2026-07-19  
Decyzja: Dostęp do danych wyłącznie przez `lib/data/*` (profiles, customers, inquiries). Strony i komponenty nie odpytują Supabase bezpośrednio.  
Powód: Jedno miejsce podmiany źródła danych i logiki fallbacku.  
Konsekwencje: Każdy nowy moduł dostaje własny plik w `lib/data/`.  
Status: zatwierdzona

### 15. Minimalny model danych MVP 1

Data: 2026-07-19  
Decyzja: Fizycznie tworzymy tylko `profiles`, `customers`, `inquiries`. Pozostałe encje opisane jako plan (`docs/DATA_MODEL_MVP1.md`), bez tworzenia na zapas.  
Powód: Zasada „nie budujemy na zapas”; model rozwijamy modułami.  
Konsekwencje: Kolejne encje = osobne migracje przy budowie modułów.  
Status: zatwierdzona

### 16. Next.js 16 — konwencja `proxy.ts`

Data: 2026-07-19  
Decyzja: Ochrona tras i odświeżanie sesji w `proxy.ts` (nowa konwencja Next 16 zastępująca `middleware.ts`).  
Powód: `middleware` jest wycofywane; unikamy ostrzeżeń i pracy na przestarzałym API.  
Konsekwencje: Logika w `proxy.ts` + helper `lib/supabase/proxy.ts`.  
Status: zatwierdzona

### 17. Zasoby konfigurowalne w bazie

Data: 2026-07-19  
Decyzja: Namioty, pakiety i dodatki (wraz z cenami) trzymamy w tabelach `tents`/`packages`/`addons`, z seedem; nie zaszywamy ich w komponentach.  
Powód: Oferta i ceny się zmieniają (§51 instrukcji master).  
Konsekwencje: Edycja przez OWNER (RLS); docelowo ekran ustawień.  
Status: zatwierdzona

### 18. Rezerwacja automatycznie tworzy zlecenie i etapy

Data: 2026-07-19  
Decyzja: Zapis rezerwacji iClub tworzy zlecenie (`jobs`) i etapy (`job_stages`) z szablonu domenowego (`lib/domain/stages.ts`).  
Powód: Automatyzacja procesu (§28/§50); mniej ręcznej pracy.  
Konsekwencje: Zmiana szablonu etapów wpływa na nowe zlecenia; edycja rezerwacji nie regeneruje etapów.  
Status: zatwierdzona

### 19. Rezerwacja tymczasowa 48h

Data: 2026-07-19  
Decyzja: Nowa rezerwacja o statusie `TEMPORARY` domyślnie wygasa po 48 godzinach (`expires_at`), wartość konfigurowalna w kodzie akcji.  
Powód: Zgodność z ustaloną regułą blokady zasobu (decyzja 7).  
Konsekwencje: Automatyczne wygaszanie i przypomnienia — do wdrożenia w kolejnych fazach.  
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

### 20. Rezerwacja = realizacja (zniesienie osobnych „Zleceń”)

Data: 2026-07-19  
Decyzja: Jedno wydarzenie to jedna rezerwacja. Właściciel zarządza nim w „Rezerwacjach” (sprzedaż + operacje: etapy, zespół, pojazdy, transport, umowa w jednym miejscu), a pracownik widzi je jako „Realizację” w terenie. Osobna zakładka „Zlecenia” zniknęła.  
Powód: Rezerwacja, zlecenie i realizacja opisywały tę samą rzecz — trzy nazwy myliły użytkownika.  
Konsekwencje: Rekord `jobs` pozostaje techniczny (1:1 z rezerwacją, tworzony automatycznie), ale nie ma własnej zakładki. Trasy `/jobs` i `/jobs/[id]` przekierowują do rezerwacji. Hub rezerwacji: `/reservations/[id]`.  
Status: zatwierdzona

### 21. Panel pracownika: osobne bloki i kroki z własnymi czynnościami

Data: 2026-07-19  
Decyzja: Realizacja terenowa dzieli się na osobne bloki zamiast jednej listy „do odhaczenia”. „Pakowanie” to osobny blok (dzień przed), a właściwa realizacja to kroki, z których każdy ma własne czynności: W drodze (nawigacja + „Jestem na miejscu”), Montaż, Szkolenie klienta (punkty do omówienia), Zdjęcia (miejsca na zdjęcia), Rozliczenie (metoda płatności + zgłoszenie odbioru + podpis), Demontaż i powrót.  
Powód: Każdy etap to inne działanie, nie tylko zaznaczenie ptaszka; kroki mają „aktywować się” po kolei w dniu realizacji.  
Konsekwencje: Zmieniono szablon etapów iClub (`ICLUB_STAGES`). Wysyłka zdjęć do chmury (Storage) to osobny, późniejszy etap — na razie zdjęcia zostają na urządzeniu.  
Status: zatwierdzona

## Rozwój iteracyjny

Rejestr będzie aktualizowany po każdej ważnej decyzji produktowej lub technicznej.
