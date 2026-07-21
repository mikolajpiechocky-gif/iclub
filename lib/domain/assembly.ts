// §9 Godziny montażu. Sugerowana godzina montażu = godzina rozpoczęcia imprezy
// minus (czas montażu pakietu + dodatki + gastro + bufor bezpieczeństwa).

export interface AssemblyConfig {
  bufferMinutes: number;
  addonMinutes: number;  // na każdy dodatek
  gastroMinutes: number; // za namiot gastronomiczny
}

export function assemblyConfigFromSettings(s: {
  assembly_buffer_minutes: number;
  assembly_addon_minutes: number;
  assembly_gastro_minutes: number;
}): AssemblyConfig {
  return { bufferMinutes: s.assembly_buffer_minutes, addonMinutes: s.assembly_addon_minutes, gastroMinutes: s.assembly_gastro_minutes };
}

// "HH:MM" → minuty od północy (albo null).
export function parseTime(t: string | null | undefined): number | null {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(t.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  return h * 60 + mi;
}

// minuty (mogą wyjść ujemne / >24h) → "HH:MM" w dobie.
export function fmtTime(min: number): string {
  const w = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(w / 60)).padStart(2, "0")}:${String(w % 60).padStart(2, "0")}`;
}

export interface SetupTimes {
  byPackage: string | null; // §9.2 montaż wg pakietu (start − czas pakietu)
  suggested: string | null; // §9.3 sugerowany (start − pakiet − dodatki − gastro − bufor)
  prevDay: boolean;         // sugerowany wypada dzień wcześniej (przekroczenie północy)
  totalMinutes: number;     // łączny czas przygotowania (minuty)
}

export function computeSetupTimes(
  eventStart: string | null,
  packageMinutes: number,
  addonCount: number,
  hasGastro: boolean,
  cfg: AssemblyConfig,
): SetupTimes {
  const startMin = parseTime(eventStart);
  if (startMin == null) return { byPackage: null, suggested: null, prevDay: false, totalMinutes: 0 };
  const total = packageMinutes + addonCount * cfg.addonMinutes + (hasGastro ? cfg.gastroMinutes : 0) + cfg.bufferMinutes;
  const suggestedMin = startMin - total;
  return {
    byPackage: fmtTime(startMin - packageMinutes),
    suggested: fmtTime(suggestedMin),
    prevDay: suggestedMin < 0,
    totalMinutes: total,
  };
}

// Krótki opis czasu w godzinach/minutach ("3 h 30 min").
export function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h ? `${h} h` : null, m ? `${m} min` : null].filter(Boolean).join(" ") || "0 min";
}
