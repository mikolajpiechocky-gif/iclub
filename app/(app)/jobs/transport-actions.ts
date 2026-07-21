"use server";
// Server Actions: kalkulacje transportu (§33, §34).
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createTransportCalc, removeTransportCalc } from "@/lib/data/transport";
import { fuelCost, amortizationCost, clientTransportPrice, plannedKm, tripClass } from "@/lib/domain/transport";
import { getSettings } from "@/lib/data/settings";
import { getJob } from "@/lib/data/jobs";
import { computeRoundTrip } from "@/lib/integrations/google-maps";
import { isGoogleMapsConfigured } from "@/lib/integrations/google-maps/config";

export interface TransportFormValues {
  vehicle_id: string;
  kind: string;
  distance_km: string; // odległość W JEDNĄ STRONĘ (D)
  returns_to_base: boolean;
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
  const oneWay = toNum(v.distance_km);
  if (oneWay == null) return { ok: false, error: "Podaj odległość w jedną stronę (km)." };
  // §16: koszt wewnętrzny liczony od planowanych km = D × mnożnik (D×2 lub D×4).
  const planned = plannedKm(oneWay, v.returns_to_base);
  const cons = toNum(v.consumption);
  const price = toNum(v.fuel_price);
  const cost = fuelCost(planned, cons ?? 0, price ?? 0);
  const settings = await getSettings();
  const amort = amortizationCost(planned, settings.amortization_per_km);
  // §15: cena dla klienta z widełek (jeśli nie podano ręcznie); zależy od odległości w jedną stronę.
  const clientManual = toNum(v.client_price);
  const clientPrice = clientManual ?? clientTransportPrice(oneWay);
  try {
    await createTransportCalc({
      job_id: jobId,
      vehicle_id: v.vehicle_id || null,
      kind: v.kind || "PLAN",
      distance_km: planned,
      one_way_km: oneWay,
      returns_to_base: v.returns_to_base,
      consumption: cons,
      fuel_price: price,
      fuel_cost: cost,
      amortization: amort,
      client_price: clientPrice,
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
  km?: number; // odległość W JEDNĄ STRONĘ (D)
  minutes?: number;
  address?: string;
  clientPrice?: number | null;
  farTrip?: boolean;
  error?: string;
}

// Automatyczne liczenie odległości W JEDNĄ STRONĘ (baza → adres zlecenia) z Google Maps.
export async function computeDistanceAction(jobId: string): Promise<DistanceResult> {
  const job = await getJob(jobId);
  const location = job?.reservation?.location;
  if (!location) return { ok: false, error: "Zlecenie nie ma adresu (uzupełnij lokalizację w rezerwacji)." };
  if (!isGoogleMapsConfigured())
    return { ok: false, error: "Podłącz klucz Google Maps (docs/INTEGRATIONS.md), aby liczyć dystans automatycznie." };
  const { base_address } = await getSettings();
  const res = await computeRoundTrip(base_address, location);
  if (!res) return { ok: false, error: "Nie udało się wyznaczyć trasy — sprawdź adres zlecenia." };
  const oneWay = Math.round((res.km / 2) * 10) / 10; // computeRoundTrip zwraca ×2
  return { ok: true, km: oneWay, minutes: Math.round(res.minutes / 2), address: res.destFormatted, clientPrice: clientTransportPrice(oneWay), farTrip: tripClass(oneWay) === "far" };
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
