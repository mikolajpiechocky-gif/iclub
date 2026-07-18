<!-- BEGIN:nextjs-agent-rules -->
# Instrukcja dla zainstalowanej wersji Next.js

Ta wersja Next.js może zawierać zmiany niezgodne ze starszymi wersjami. Przed zmianą kodu należy przeczytać odpowiedni przewodnik w `node_modules/next/dist/docs/` i uwzględnić komunikaty o wycofaniu API.
<!-- END:nextjs-agent-rules -->

# Konstytucja projektu iClub Management

## Charakter projektu

- iClub Management jest niezależnym projektem. Nie wolno odczytywać, modyfikować ani wykorzystywać projektu Taurus.
- Projekt będzie rozwijany iteracyjnie; nie znamy jeszcze finalnego wyglądu ani wszystkich procesów.
- Nowe potrzeby będą odkrywane podczas testów. Niepewne założenia nie są ostatecznymi wymaganiami.
- Nie wolno rozbudowywać systemu na zapas.

## Automatyzacja pracy

- Użytkownik nie jest programistą. Codex sam wykonuje techniczne czynności: tworzy pliki, uruchamia polecenia, instaluje lokalne zależności, wykonuje migracje, testy, lint i build.
- Nie należy prosić użytkownika o komendy, kopiowanie treści ani inne kroki, które Codex może wykonać sam.
- Użytkownik zajmuje się głównie decyzjami biznesowymi i testowaniem gotowych funkcji.
- Pytania są potrzebne tylko przy realnej decyzji biznesowej, dostępie do konta, zgodzie systemowej lub operacji nieodwracalnej.

## Zasady implementacji

- Najpierw krótki plan, potem wykonanie. Preferuj małe, proste i weryfikowalne zmiany.
- Ograniczaj zależności; każda nowa biblioteka wymaga konkretnego uzasadnienia.
- Nie zapisuj sekretów w kodzie ani zmiennych danych biznesowych na stałe w komponentach.
- Decyzje zapisuj w `docs/DECISIONS.md`, a niewiadome w `docs/OPEN_QUESTIONS.md`.
- Po większej zmianie aktualizuj dokumentację oraz uruchamiaj lint i build. Napraw błędy przed zakończeniem.
- Nie modyfikuj plików niezwiązanych z zadaniem i nie działaj poza bieżącym repozytorium.

## Kierunek techniczny

- Aplikacja będzie responsywną PWA działającą na komputerze, Androidzie i iOS przez przeglądarkę.
- Kluczowe działania terenowe mają docelowo działać offline.
- Przyszłym backendem będzie Supabase.
- Offline będzie wymagał lokalnego przechowywania danych i kolejki synchronizacji.
- Szczegóły techniczne będą ustalane iteracyjnie. Nie instaluj obsługi Supabase ani offline bez osobnego zadania.
