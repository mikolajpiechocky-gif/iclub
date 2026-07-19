# Model danych (stan bieżący)

Żywy opis wdrożonych tabel. Szczegóły MVP 1: [`DATA_MODEL_MVP1.md`](DATA_MODEL_MVP1.md).
Pełna lista docelowych encji: §47 instrukcji master. Tabele powstają etapami
(osobne migracje), nie na zapas.

## Wdrożone tabele

| Migracja | Tabela | Rola |
|---|---|---|
| 0001 | `profiles` | użytkownik + rola (OWNER/EMPLOYEE) |
| 0001 | `customers` | klient (osoba/firma) |
| 0001 | `inquiries` | zapytania |
| 0002 | `tents` | namioty i zestawy (m.in. `has_back_door`) |
| 0002 | `packages` | pakiety Standard/Premium/VIP (cena w bazie) |
| 0002 | `addons` | dodatki / dosprzedaż (cena w bazie) |
| 0003 | `reservations` | rezerwacje (iClub), status, wygaśnięcie, zaliczka, FV |
| 0003 | `jobs` | zlecenie tworzone automatycznie z rezerwacji |
| 0003 | `job_stages` | etapy zlecenia (z szablonu domenowego) |

## Typy wyliczeniowe

- `user_role`, `customer_type`, `inquiry_status`, `inquiry_source` (0001)
- `business_line`, `tent_status` (0002)
- `reservation_status`, `job_status`, `stage_status` (0003)

## Relacje (wdrożone)

```
customers 1—* inquiries
customers 1—* reservations
inquiries 0..1—* reservations   (opcjonalne źródło rezerwacji)
tents/packages 1—* reservations (wybór zasobu)
reservations 1—* jobs           (auto-generacja)
jobs 1—* job_stages             (auto-generacja z szablonu)
```

## RLS

- `profiles`: odczyt dla zalogowanych; edycja własnego lub przez OWNER.
- `customers`, `inquiries`, `reservations`, `jobs`, `job_stages`: CRUD dla zalogowanych.
- `tents`, `packages`, `addons`: odczyt dla zalogowanych; **edycja tylko OWNER**
  (konfiguracja).

## Planowane (kolejne migracje)

`employees`, `employee_rates`, `employee_bonuses`, `employee_availability`,
`job_assignments`, `job_time_entries`, `job_notes`, `job_incidents`, `job_sales`,
`locations`, `equipment`, `equipment_sets`, `equipment_set_items`,
`inventory_reservations`, `inventory_movements`, `vehicles`, `vehicle_assignments`,
`transport_plans`, `transport_routes`, `transport_route_stops`,
`transport_calculations`, `checklists`, `checklist_templates`, `checklist_items`,
`checklist_responses`, `packing_sessions`, `unpacking_sessions`, `payments`,
`costs`, `contracts`, `contract_templates`, `invoices`, `service_tasks`,
`service_task_items`, `notifications`, `weather_forecasts`,
`customer_confirmations`, `ratings`, `reviews`, `rankings`, `audit_logs`.
