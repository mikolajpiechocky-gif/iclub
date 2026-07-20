// Integracja Google Maps — wyłącznie po stronie serwera (§40).
// Geocoding API + Routes API (Compute Routes). Bez klucza zwraca null
// (fallback demo / tryb ręczny) — nie wywołujemy API i nie używamy atrap.
import { GOOGLE_MAPS_API_KEY, isGoogleMapsConfigured } from "./config";

export interface GeoPoint {
  lat: number;
  lng: number;
  formatted: string;
  placeId: string | null;
}

// Adres → współrzędne + place_id (§32: nie polegamy tylko na tekście).
export async function geocode(address: string): Promise<GeoPoint | null> {
  if (!isGoogleMapsConfigured() || !address.trim()) return null;
  try {
    const url =
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}` +
      `&region=pl&language=pl&key=${GOOGLE_MAPS_API_KEY}`;
    const res = await fetch(url);
    const json = await res.json();
    const r = json?.results?.[0];
    if (!r?.geometry?.location) return null;
    return {
      lat: r.geometry.location.lat,
      lng: r.geometry.location.lng,
      formatted: r.formatted_address ?? address,
      placeId: r.place_id ?? null,
    };
  } catch {
    return null;
  }
}

// Podpowiadanie adresów (§37) — Places API (New) Autocomplete. Bez klucza lub
// przy błędzie zwraca pustą listę (formularz działa jak zwykłe pole tekstowe).
export interface AddressSuggestion {
  description: string;
  placeId: string | null;
}

export async function autocompleteAddress(input: string): Promise<AddressSuggestion[]> {
  if (!isGoogleMapsConfigured() || input.trim().length < 3) return [];
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY!,
      },
      body: JSON.stringify({ input, languageCode: "pl", regionCode: "PL" }),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const suggestions = (json?.suggestions ?? []) as {
      placePrediction?: { placeId?: string; text?: { text?: string } };
    }[];
    return suggestions
      .map((s): AddressSuggestion | null => {
        const p = s.placePrediction;
        return p?.text?.text ? { description: p.text.text, placeId: p.placeId ?? null } : null;
      })
      .filter((x): x is AddressSuggestion => Boolean(x))
      .slice(0, 6);
  } catch {
    return [];
  }
}

// Trasa między dwoma punktami → dystans (km) i czas (min). Routes API.
export async function routeLeg(origin: GeoPoint, dest: GeoPoint): Promise<{ km: number; minutes: number } | null> {
  if (!isGoogleMapsConfigured()) return null;
  try {
    const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY!,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
        destination: { location: { latLng: { latitude: dest.lat, longitude: dest.lng } } },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_UNAWARE",
      }),
    });
    const json = await res.json();
    const route = json?.routes?.[0];
    if (!route) return null;
    const km = (route.distanceMeters ?? 0) / 1000;
    const secs = route.duration ? parseInt(String(route.duration).replace("s", ""), 10) : 0;
    return { km: Math.round(km * 10) / 10, minutes: Math.round((secs || 0) / 60) };
  } catch {
    return null;
  }
}

// Optymalizacja kolejności wielu przystanków (§37) — Routes API z
// optimizeWaypointOrder. Trasa: baza → przystanki (w optymalnej kolejności) → baza.
// Bez klucza / przy błędzie zwraca null.
export interface OptimizedRoute {
  order: number[]; // permutacja indeksów przystanków (optymalna kolejność)
  km: number;
  minutes: number;
}

export async function optimizeRoute(baseAddress: string, stops: string[]): Promise<OptimizedRoute | null> {
  if (!isGoogleMapsConfigured() || stops.length === 0) return null;
  try {
    const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY!,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.optimizedIntermediateWaypointIndex",
      },
      body: JSON.stringify({
        origin: { address: baseAddress },
        destination: { address: baseAddress },
        intermediates: stops.map((a) => ({ address: a })),
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_UNAWARE",
        optimizeWaypointOrder: true,
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const route = json?.routes?.[0];
    if (!route) return null;
    const order: number[] = Array.isArray(route.optimizedIntermediateWaypointIndex)
      ? route.optimizedIntermediateWaypointIndex
      : stops.map((_, i) => i);
    const km = (route.distanceMeters ?? 0) / 1000;
    const secs = route.duration ? parseInt(String(route.duration).replace("s", ""), 10) : 0;
    return { order, km: Math.round(km * 10) / 10, minutes: Math.round((secs || 0) / 60) };
  } catch {
    return null;
  }
}

// Runda: baza → adres → baza (jeden przejazd tam i z powrotem).
export interface RoundTripResult {
  km: number;
  minutes: number;
  destFormatted: string;
}
export async function computeRoundTrip(baseAddress: string, destAddress: string): Promise<RoundTripResult | null> {
  const [base, dest] = await Promise.all([geocode(baseAddress), geocode(destAddress)]);
  if (!base || !dest) return null;
  const leg = await routeLeg(base, dest);
  if (!leg) return null;
  return {
    km: Math.round(leg.km * 2 * 10) / 10,
    minutes: leg.minutes * 2,
    destFormatted: dest.formatted,
  };
}
