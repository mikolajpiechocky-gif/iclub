// Wyszukiwarka globalna: rezerwacje, klienci, magazyn. Filtrowanie po stronie
// serwera w JS (mała skala) — proste i wystarczające; capy per grupa.
import { listReservations } from "./reservations";
import { listCustomers } from "./customers";
import { listEquipment } from "./equipment";
import type { ReservationWithRefs, CustomerRecord, EquipmentRecord } from "./types";

const LIMIT = 8;
const norm = (s: string | null | undefined) => (s ?? "").toLowerCase();

export interface SearchResults {
  reservations: ReservationWithRefs[];
  customers: CustomerRecord[];
  equipment: EquipmentRecord[];
  total: number;
}

const EMPTY: SearchResults = { reservations: [], customers: [], equipment: [], total: 0 };

export async function searchEverything(query: string): Promise<SearchResults> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return EMPTY;

  const [reservations, customers, equipment] = await Promise.all([
    listReservations(),
    listCustomers(),
    listEquipment(),
  ]);

  const reservationHits = reservations
    .filter((r) => [r.customer?.name, r.location, r.event_type, r.notes, r.rental_items].some((f) => norm(f).includes(q)))
    .slice(0, LIMIT);

  const customerHits = customers
    .filter((c) => [c.name, c.phone, c.email, c.city, c.tax_id].some((f) => norm(f).includes(q)))
    .slice(0, LIMIT);

  const equipmentHits = equipment
    .filter((e) => [e.name, e.code, e.category].some((f) => norm(f).includes(q)))
    .slice(0, LIMIT);

  return {
    reservations: reservationHits,
    customers: customerHits,
    equipment: equipmentHits,
    total: reservationHits.length + customerHits.length + equipmentHits.length,
  };
}
