// Integracja pogody (§41) — Open-Meteo (darmowe, bez klucza API).
// Współrzędne z Google Geocoding (klucz Map). Bez klucza Map / poza horyzontem
// prognozy zwraca null — karta pogody się po prostu nie pokazuje.
import { geocode } from "@/lib/integrations/google-maps";

export interface EventWeather {
  date: string;
  label: string;
  tempMax: number | null;
  tempMin: number | null;
  windMax: number | null;
  precip: number | null;
  warnings: string[];
}

// Kod pogody WMO → krótka etykieta PL.
function weatherLabel(code: number | null): string {
  if (code == null) return "—";
  if (code === 0) return "Bezchmurnie";
  if (code <= 3) return "Zachmurzenie";
  if (code === 45 || code === 48) return "Mgła";
  if (code >= 51 && code <= 67) return "Deszcz";
  if (code >= 71 && code <= 77) return "Śnieg";
  if (code >= 80 && code <= 82) return "Przelotne opady";
  if (code >= 85 && code <= 86) return "Opady śniegu";
  if (code >= 95) return "Burza";
  return "Zmiennie";
}

export async function getEventWeather(location: string, date: string): Promise<EventWeather | null> {
  if (!location?.trim() || !date) return null;
  // Prognoza Open-Meteo sięga ~16 dni; dla dat spoza tego okna pomijamy.
  const days = (new Date(date).getTime() - Date.now()) / 86_400_000;
  if (Number.isNaN(days) || days < -1 || days > 15) return null;

  const geo = await geocode(location);
  if (!geo) return null;

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lng}` +
      `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max` +
      `&timezone=Europe%2FWarsaw&start_date=${date}&end_date=${date}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const d = json?.daily;
    if (!d?.time?.length) return null;

    const tempMax = d.temperature_2m_max?.[0] ?? null;
    const tempMin = d.temperature_2m_min?.[0] ?? null;
    const windMax = d.windspeed_10m_max?.[0] ?? null;
    const precip = d.precipitation_sum?.[0] ?? null;
    const code = d.weathercode?.[0] ?? null;

    const warnings: string[] = [];
    if (windMax != null && windMax > 20) warnings.push(`Silny wiatr: ${Math.round(windMax)} km/h`);
    if (precip != null && precip >= 1) warnings.push(`Opady: ${precip} mm`);
    if (tempMax != null && tempMax > 25) warnings.push(`Wysoka temperatura: ${Math.round(tempMax)}°C`);

    return { date, label: weatherLabel(code), tempMax, tempMin, windMax, precip, warnings };
  } catch {
    return null;
  }
}
