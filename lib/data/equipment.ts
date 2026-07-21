// Warstwa danych: sprzęt magazynowy. Odczyt przez Supabase; w TRYBIE DEMO
// zwraca dane przykładowe.
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { EquipmentRecord } from "./types";

// Domyślne wartości pól rozszerzonego modelu magazynu (§17) dla danych demo.
const EQ_DEFAULTS = {
  unit: "szt.", location: null, set_number: null, purchase_date: null, supplier: null,
  rental_price: null, replacement_value: null, is_rentable: false, is_addon: false, internal_only: false, photo_url: null,
} as const;

export const DEMO_EQUIPMENT: EquipmentRecord[] = [
  { id: "demo-e1", code: "EQ-01", name: "Kolumny aktywne", category: "Nagłośnienie", quantity: 8, tracking: "QUANTITY", unit_cost: 1200, status: "AVAILABLE", notes: null, active: true, ...EQ_DEFAULTS },
  { id: "demo-e2", code: "EQ-02", name: "Głowice LED", category: "Oświetlenie", quantity: 12, tracking: "QUANTITY", unit_cost: 450, status: "AVAILABLE", notes: null, active: true, ...EQ_DEFAULTS },
  { id: "demo-e3", code: "EQ-03", name: "Wytwornice dymu", category: "Efekty", quantity: 4, tracking: "QUANTITY", unit_cost: 600, status: "SERVICE", notes: null, active: true, ...EQ_DEFAULTS },
  { id: "demo-e4", code: "EQ-04", name: "Stoły koktajlowe", category: "Meble", quantity: 20, tracking: "QUANTITY", unit_cost: 120, status: "AVAILABLE", notes: null, active: true, ...EQ_DEFAULTS, is_rentable: true, is_addon: true, rental_price: 15 },
  { id: "demo-e5", code: "EQ-05", name: "Krzesła", category: "Meble", quantity: 120, tracking: "QUANTITY", unit_cost: 35, status: "AVAILABLE", notes: null, active: true, ...EQ_DEFAULTS, is_rentable: true, is_addon: true, rental_price: 5 },
  { id: "demo-e6", code: "EQ-06", name: "Parasole grzewcze", category: "Ogrzewanie", quantity: 6, tracking: "QUANTITY", unit_cost: 500, status: "AVAILABLE", notes: null, active: true, ...EQ_DEFAULTS },
];

export async function listEquipment(): Promise<EquipmentRecord[]> {
  if (!isSupabaseConfigured()) return DEMO_EQUIPMENT;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("equipment")
    .select("*")
    .eq("active", true)
    .order("category")
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as EquipmentRecord[];
}
