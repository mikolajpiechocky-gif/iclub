# Model danych MVP 1

Minimalny model danych dla MVP 1. Zasada: **nie projektujemy tabel na funkcje
odległe**. Fizycznie wdrażamy tylko to, co potrzebne do pierwszego pionowego
fragmentu (profile, klienci, zapytania). Pozostałe encje są tu opisane jako
plan i powstaną w kolejnych migracjach.

Migracja wdrażająca ten model: `supabase/migrations/0001_init_profiles_customers_inquiries.sql`.

---

## Zasady ogólne

- Kody techniczne (statusy, typy, źródła) są **angielskie** w bazie; etykiety w
  interfejsie są **polskie** (mapowanie w `lib/data/types.ts`).
- Każda tabela ma `created_at` i `updated_at` (`updated_at` aktualizuje trigger).
- Klucze główne to `uuid`.
- RLS (Row Level Security) jest włączone na wszystkich tabelach.

---

## Wdrożone w tym etapie

### `profiles`
Profil użytkownika powiązany z `auth.users` (Supabase Auth).

| Kolumna | Typ | Uwagi |
|---|---|---|
| id | uuid (PK) | = `auth.users.id` |
| full_name | text | imię i nazwisko |
| role | `user_role` | `OWNER` \| `EMPLOYEE` (domyślnie EMPLOYEE) |
| created_at / updated_at | timestamptz | |

- Trigger `on_auth_user_created` tworzy profil automatycznie przy rejestracji.
- Funkcja `is_owner()` — pomocnicza do reguł RLS i uprawnień.

### `customers`
Klient: osoba prywatna lub firma.

| Kolumna | Typ | Uwagi |
|---|---|---|
| id | uuid (PK) | |
| type | `customer_type` | `PRIVATE` \| `COMPANY` |
| name | text | imię i nazwisko albo nazwa firmy |
| phone | text | |
| email | text | |
| city | text | |
| address | text | opcjonalny |
| tax_id | text | NIP, opcjonalny |
| notes | text | |
| created_by | uuid → profiles.id | |
| created_at / updated_at | timestamptz | |

### `inquiries`
Zapytanie klienta.

| Kolumna | Typ | Uwagi |
|---|---|---|
| id | uuid (PK) | |
| customer_id | uuid → customers.id | powiązanie z klientem (opcjonalne) |
| event_type | text | rodzaj imprezy |
| event_date | date | |
| location | text | |
| guests | integer | przewidywana liczba osób |
| tent_interest | text | interesujący namiot / rozmiar |
| package_interest | text | interesujący pakiet |
| addons_note | text | dodatki jako notatka |
| source | `inquiry_source` | OLX / PHONE / WEBSITE_FORM / REFERRAL / FACEBOOK / INSTAGRAM / OTHER |
| status | `inquiry_status` | NEW / CONTACTED / OFFER_SENT / WAITING / WON / LOST |
| notes | text | |
| created_by | uuid → profiles.id | |
| created_at / updated_at | timestamptz | |

### Typy wyliczeniowe (enum)
- `user_role`: OWNER, EMPLOYEE
- `customer_type`: PRIVATE, COMPANY
- `inquiry_status`: NEW, CONTACTED, OFFER_SENT, WAITING, WON, LOST
- `inquiry_source`: OLX, PHONE, WEBSITE_FORM, REFERRAL, FACEBOOK, INSTAGRAM, OTHER

### RLS w MVP 1
- `profiles`: każdy zalogowany widzi profile; edycja własnego lub przez OWNER.
- `customers`, `inquiries`: pełny CRUD dla zalogowanych (OWNER i EMPLOYEE).
- Rozdział danych poufnych (np. wynagrodzenia) doprecyzujemy przy kolejnych modułach.

---

## Zaplanowane (NIE wdrażamy jeszcze)

Kolejne encje MVP 1/2 — powstaną w osobnych migracjach dopiero przy budowie
odpowiednich modułów:

- **reservations** — rezerwacja tymczasowa (blokada zasobu, wygaśnięcie, zadatek).
- **jobs** — zlecenie handlowe (linia biznesowa ICLUB/EQUIPMENT_RENTAL, wartość, VAT).
- **tents** — namioty (kod, stan, lokalizacja).
- **equipment** — sprzęt (ilościowy lub indywidualny).
- **job_assignments** — przypisania zasobów/pracowników do zlecenia.
- **checklist_items** — pozycje checklist realizacji.
- **payments** — płatności (plan, zgłoszenie gotówki, weryfikacja, zaległość).
- **costs** — koszty (kategoria, zlecenie, pracownik, linia biznesowa).

Relacje kierunkowe (do doprecyzowania przy wdrożeniu):
`customers 1—* inquiries`, `inquiries 1—0..1 reservations`,
`reservations 1—0..1 jobs`, `jobs 1—* job_assignments`, `jobs 1—* payments`,
`jobs 1—* costs`, `tents/equipment *—* jobs` (przez przypisania).

---

## Rozwój iteracyjny

Model rozwijamy modułami. Każdy nowy moduł = osobna migracja dodająca tylko
potrzebne tabele i reguły, bez zmian wstecznie łamiących istniejące dane.
