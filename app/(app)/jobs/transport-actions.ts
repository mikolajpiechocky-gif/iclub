"use server";
// Server Actions: kalkulacje transportu (§33, §34).
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createTransportCalc, removeTransportCalc } from "@/lib/data/transport";
import { fuelCost } from "@/lib/domain/transport";
import { getJob } from "@/lib/data/jobs";
import { computeRoundTrip } from "@/lib/integrations/google-maps";
import { isGoogleMapsConfigured } from "@/lib/integrations/google-maps/config";
import { BASE_ADDRESS } from "@/lib/config/base";

export interface TransportFormValues {
  vehicle_id: string;
  kind: string;
  distance_km: string;
  consumption: string;
  fuel_price: string;
  client_price: string;
  note: string;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const DEMO = "Tryb demo: skonfiguruj Supabase, aby zapisywać (docs/SUPABASE_SETUP.md).";

function toNum(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t.replace(",", "."));
  return isNaN(n) ? null : n;
}

export async function createTransportAction(jobId: string, v: TransportFormValues): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  const km = toNum(v.distance_km);
  if (km == null) return { ok: false, error: "Podaj dystans (km)." };
  const cons = toNum(v.consumption);
  const price = toNum(v.fuel_price);
  const cost = fuelCost(km, cons ?? 0, price ?? 0);
  try {
    await createTransportCalc({
      job_id: jobId,
      vehicle_id: v.vehicle_id || null,
      kind: v.kind || "PLAN",
      distance_km: km,
      consumption: cons,
      fuel_price: price,
      fuel_cost: cost,
      client_price: toNum(v.client_price),
      note: v.note.trim() || null,
    });
    revalidatePath(`/jobs/${jobId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zapisać." };
  }
}

export interface DistanceResult {
  ok: boolean;
  km?: number;
  minutes?: number;
  address?: string;
  error?: string;
}

// Automatyczne liczenie dystansu (baza → adres zlecenia → baza) z Google Maps.
export async function computeDistanceAction(jobId: string): Promise<DistanceResult> {
  const job = await getJob(jobId);
  const location = job?.reservation?.location;
  if (!location) return { ok: false, error: "Zlecenie nie ma adresu (uzupełnij lokalizację w rezerwacji)." };
  if (!isGoogleMapsConfigured())
    return { ok: false, error: "Podłącz klucz Google Maps (docs/INTEGRATIONS.md), aby liczyć dystans automatycznie." };
  const res = await computeRoundTrip(BASE_ADDRESS, location);
  if (!res) return { ok: false, error: "Nie udało się wyznaczyć trasy — sprawdź adres zlecenia." };
  return { ok: true, km: res.km, minutes: res.minutes, address: res.destFormatted };
}

export async function removeTransportAction(id: string, jobId: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  try {
    await removeTransportCalc(id);
    revalidatePath(`/jobs/${jobId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Błąd." };
  }
}
