# iClub Management

iClub Management to niezależna aplikacja do zarządzania firmą wynajmującą dmuchane namioty imprezowe oraz sprzęt eventowy. Projekt nie jest połączony z Taurusem.

Docelowo będzie to responsywna PWA dostępna przez przeglądarkę na komputerach oraz urządzeniach z Androidem i iOS. Kluczowe działania terenowe mają działać również przy słabym zasięgu i offline.

## Aktualny status

Fundament projektu jest gotowy. Opisano wizję produktu, proces główny oraz propozycję MVP 1 i MVP 2. Moduły biznesowe, PWA, tryb offline i backend nie zostały jeszcze wdrożone. Supabase zostanie dodany na późniejszym etapie.

## Stos technologiczny

- Next.js i React
- TypeScript
- Tailwind CSS
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
