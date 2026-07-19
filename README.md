# iClub Management

iClub Management to niezależna aplikacja do zarządzania firmą wynajmującą dmuchane namioty imprezowe oraz sprzęt eventowy. Projekt nie jest połączony z Taurusem.

Docelowo będzie to responsywna PWA dostępna przez przeglądarkę na komputerach oraz urządzeniach z Androidem i iOS. Kluczowe działania terenowe mają działać również przy słabym zasięgu i offline.

## Aktualny status

Trwa budowa właściwej aplikacji, moduł po module.

Gotowe:
- warstwa demonstracyjna UX/UI (design z Claude Design),
- fundament techniczny Supabase (klienci, ochrona tras, model danych MVP 1),
- logowanie i role `OWNER` / `EMPLOYEE`,
- warstwa dostępu do danych (`lib/data/*`),
- moduł **Klienci i Zapytania** (zapis/odczyt w Supabase),
- moduł **Rezerwacje iClub** (część 1): konfigurowalne namioty/pakiety/dodatki,
  rezerwacja → automatyczne zlecenie i etapy.

Aplikacja działa w **TRYBIE DEMO**, dopóki nie skonfigurujesz Supabase
(logowanie wyłączone, dane przykładowe). Instrukcja: [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md).

Nie wdrożono jeszcze: rezerwacji, zleceń, kalendarza, checklist, płatności,
kosztów, magazynu, zdjęć, umów, PWA i trybu offline.

## Stos technologiczny

- Next.js 16 (App Router) i React 19
- TypeScript
- Tailwind CSS v4
- Supabase (Auth + Postgres) przez `@supabase/ssr`
- ESLint
- npm

## Uruchomienie na Windows

```powershell
npm.cmd install
npm.cmd run dev
```

Aplikacja będzie dostępna pod adresem [http://localhost:3001](http://localhost:3001).

## Kontrola jakości

```powershell
npm.cmd run lint
npm.cmd run build
```

## Dokumentacja

- [Start pracy](START_HERE.md)
- [Zasady projektu](PROJECT_RULES.md)
- [Plan rozwoju](ROADMAP.md)
- [Wizja produktu](docs/PRODUCT_VISION.md)
- [Bieżący zakres](docs/CURRENT_SCOPE.md)
- [Model domenowy](docs/DOMAIN_MODEL.md)
- [Procesy robocze](docs/WORKFLOWS.md)
- [Decyzje](docs/DECISIONS.md)
- [Otwarte pytania](docs/OPEN_QUESTIONS.md)
- [Strategia offline](docs/OFFLINE_STRATEGY.md)
- [Plan implementacji](docs/IMPLEMENTATION_PLAN.md)
- [Konfiguracja Supabase](docs/SUPABASE_SETUP.md)
- [Wdrożenie (Vercel + domena)](docs/DEPLOYMENT.md)
- [Integracje (Google Maps, InFakt…)](docs/INTEGRATIONS.md)
- [Model danych MVP 1](docs/DATA_MODEL_MVP1.md)
- [Model danych (stan bieżący)](docs/DATA_MODEL.md)
- [Pełny zakres produktu](docs/FULL_PRODUCT_SCOPE.md)
- [Fazy wdrożenia](docs/IMPLEMENTATION_PHASES.md)
- [Proces iClub](docs/WORKFLOW_ICLUB.md)
