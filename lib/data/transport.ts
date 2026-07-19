// Warstwa danych: kalkulacje transportu (§33, §34).
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export interface TransportCalcRecord {
  id: string;
  job_id: string;
  vehicle_id: string | null;
  kind: string;
  distance_km: number | null;
  consumption: number | null;
  fuel_price: number | null;
  fuel_cost: number | null;
  client_price: number | null;
  note: string | null;
  vehicle: { id: string; name: string } | null;
}

export interface TransportInput {
  job_id: string;
  vehicle_id: string | null;
  kind: string;
  distance_km: number | null;
  consumption: number | null;
  fuel_price: number | null;
  fuel_cost: number | null;
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
