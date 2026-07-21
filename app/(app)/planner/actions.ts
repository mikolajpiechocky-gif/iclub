"use server";
// Server Action: planer tras (§37). Zbiera realizacje danego dnia (z adresem),
// wyznacza optymalną kolejność (Routes API) i liczy koszt wewnętrzny przejazdu.
import { getCurrentProfile } from "@/lib/data/profiles";
import { isGoogleMapsConfigured } from "@/lib/integrations/google-maps/config";
import { optimizeRoute } from "@/lib/integrations/google-maps";
import { listReservations } from "@/lib/data/reservations";
import { listVehicles } from "@/lib/data/vehicles";
import { getSettings } from "@/lib/data/settings";
import { fuelCost, amortizationCost, fuelPriceForType } from "@/lib/domain/transport";

export interface PlannerStop {
  seq: number;
  label: string;
  address: string;
}

export interface PlannerResult {
  ok: boolean;
  error?: string;
  base?: string;
  stops?: PlannerStop[];
  km?: number;
  minutes?: number;
  fuelCost?: number;
  amortization?: number;
  internalCost?: number;
}

export async function optimizeRouteAction(date: string, vehicleId: string): Promise<PlannerResult> {
  const profile = await getCurrentProfile();
  if (profile?.role !== "OWNER") return { ok: false, error: "Planer tras dostępny dla szefa." };
  if (!date) return { ok: false, error: "Wybierz dzień." };
  if (!isGoogleMapsConfigured()) return { ok: false, error: "Podłącz klucz Google Maps, aby optymalizować trasy." };

  const [reservations, vehicles, settings] = await Promise.all([listReservations(), listVehicles(), getSettings()]);

  const dayStops = reservations.filter(
    (r) => r.event_date === date && (r.location ?? "").trim() && r.status !== "CANCELLED",
  );
  if (dayStops.length === 0) return { ok: false, error: "Brak realizacji z adresem w tym dniu." };
  if (dayStops.length === 1) return { ok: false, error: "Tylko jedna realizacja tego dnia — optymalizacja niepotrzebna." };

  const addresses = dayStops.map((r) => r.location as string);
  const opt = await optimizeRoute(settings.base_address, addresses);
  if (!opt) return { ok: false, error: "Nie udało się wyznaczyć trasy — sprawdź adresy realizacji." };

  const stops: PlannerStop[] = opt.order.map((idx, i) => {
    const r = dayStops[idx];
    return { seq: i + 1, label: r?.customer?.name ?? r?.event_type ?? "Realizacja", address: (r?.location as string) ?? "" };
  });

  const veh = vehicles.find((v) => v.id === vehicleId);
  const consumption = veh?.consumption ?? 0;
  const price = fuelPriceForType(veh?.fuel_type ?? null, {
    petrol: settings.fuel_price_petrol,
    diesel: settings.fuel_price_diesel,
    lpg: settings.fuel_price_lpg,
  });
  const fuel = fuelCost(opt.km, consumption, price);
  const amort = amortizationCost(opt.km, settings.amortization_per_km);

  return {
    ok: true,
    base: settings.base_address,
    stops,
    km: opt.km,
    minutes: opt.minutes,
    fuelCost: fuel,
    amortization: amort,
    internalCost: Math.round((fuel + amort) * 100) / 100,
  };
}
