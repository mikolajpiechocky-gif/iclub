// Warstwa danych: kalkulacje transportu (§33, §34).
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export interface TransportCalcRecord {
  id: string;
  job_id: string;
  vehicle_id: string | null;
  kind: string;
  distance_km: number | null;
  one_way_km: number | null;
  returns_to_base: boolean;
  consumption: number | null;
  fuel_price: number | null;
  fuel_cost: number | null;
  amortization: number | null;
  client_price: number | null;
  note: string | null;
  vehicle: { id: string; name: string } | null;
}

export interface TransportInput {
  job_id: string;
  vehicle_id: string | null;
  kind: string;
  distance_km: number | null;
  one_way_km: number | null;
  returns_to_base: boolean;
  consumption: number | null;
  fuel_price: number | null;
  fuel_cost: number | null;
  amortization: number | null;
  client_price: number | null;
  note: string | null;
}

export async function listTransportCalcs(jobId: string): Promise<TransportCalcRecord[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transport_calculations")
    .select("*, vehicle:vehicles(id, name)")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as TransportCalcRecord[];
}

export async function createTransportCalc(input: TransportInput): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("transport_calculations").insert({ ...input, created_by: user?.id ?? null });
  if (error) throw new Error(error.message);
}

export async function removeTransportCalc(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("transport_calculations").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// §II.17 Faktyczny przejazd z licznika → przelicza koszt paliwa na ISTNIEJĄCEJ pozycji
// transportu (bez tworzenia nowego kosztu, więc bez podwójnego liczenia). Fuel liczony
// z rzeczywistych km × spalanie × cena paliwa (nie z ceny transportu dla klienta).
export async function setActualKm(jobId: string, actualKm: number): Promise<{ ok: boolean; reason?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, reason: "Tryb demo." };
  if (!(actualKm > 0)) return { ok: false, reason: "Podaj liczbę km większą od zera." };
  const supabase = await createClient();
  const { data } = await supabase
    .from("transport_calculations")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false })
    .limit(1);
  const calc = (data?.[0] ?? null) as TransportCalcRecord | null;
  if (!calc) return { ok: false, reason: "Brak kalkulacji transportu — policz transport w rezerwacji, potem wpisz faktyczne km." };
  const consumption = Number(calc.consumption ?? 0);
  const fuelPrice = Number(calc.fuel_price ?? 0);
  if (!(consumption > 0) || !(fuelPrice > 0)) return { ok: false, reason: "Brak spalania lub ceny paliwa w kalkulacji transportu." };
  const fuelCost = Math.round((actualKm * consumption / 100) * fuelPrice * 100) / 100;
  const note = calc.note?.includes("km faktyczne") ? calc.note : `${calc.note ? `${calc.note} · ` : ""}km faktyczne`;
  const { error } = await supabase
    .from("transport_calculations")
    .update({ distance_km: actualKm, fuel_cost: fuelCost, note })
    .eq("id", calc.id);
  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}
