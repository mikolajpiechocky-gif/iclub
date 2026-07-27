// Wypożyczalnia: czas pracy z timestampów etapów (pomija okres wynajmu) i wyliczenie
// wynagrodzenia — ryczałt (jeśli ustawiony) albo godziny × stawka. Wspólne dla panelu
// pracownika (podgląd) i akcji domykającej (utrwalenie kosztu).

export interface StageTime { stage_key: string; done_at: string | null }

export function rentalWorkMs(stages: StageTime[]): number {
  const at = (k: string): number | null => { const s = stages.find((x) => x.stage_key === k)?.done_at; return s ? new Date(s).getTime() : null; };
  const seg = (a: string, b: string): number => { const x = at(a), y = at(b); return x != null && y != null && y > x ? y - x : 0; };
  if (stages.some((s) => s.stage_key.startsWith("R_"))) return seg("R_START", "R_READY") + seg("R_RETURN", "R_CHECK");
  if (stages.some((s) => s.stage_key.startsWith("D_"))) return seg("D_START", "D_DONE") + seg("P_START", "P_CLEAN_PUT");
  return 0;
}

export interface RentalLabor { amount: number; isFlat: boolean; hours: number }

export function rentalLabor(workMs: number, opts: { flat: number | null; hourlyRate: number }): RentalLabor {
  const hours = Math.round((workMs / 3600000) * 100) / 100;
  if (opts.flat != null && opts.flat > 0) return { amount: Math.round(opts.flat * 100) / 100, isFlat: true, hours };
  return { amount: Math.round(hours * (opts.hourlyRate || 0) * 100) / 100, isFlat: false, hours };
}
