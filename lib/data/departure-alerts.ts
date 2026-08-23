// §postęp Alert „pracownik nie ruszył, a powinien". Sprawdzany często (co ~30 min z crona),
// bo termin wyjazdu zależy od godziny montażu i dojazdu — może wypaść o dowolnej porze dnia.
// Wszystkie odczyty przez service_role (cron nie ma sesji). Idempotentny: raz na zlecenie
// (znacznik late_depart_alerted_at), żeby nie zasypywać szefa co pół godziny.
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { sendPushToOwners } from "@/lib/integrations/push";
import { parseTime, fmtTime } from "@/lib/domain/assembly";
import { warsawTodayISO } from "@/lib/domain/dates";

// Bieżąca pora dnia (minuty od północy) w strefie Europe/Warsaw.
function warsawNowMinutes(): number {
  const s = new Date().toLocaleString("en-GB", { timeZone: "Europe/Warsaw", hour: "2-digit", minute: "2-digit", hour12: false });
  const m = /^(\d{2}):(\d{2})/.exec(s.trim());
  if (!m) return 12 * 60;
  return Number(m[1]) * 60 + Number(m[2]);
}

// Estymata czasu dojazdu (min) z jednokierunkowego dystansu. ~50 km/h średnio (miasto+trasa),
// min. 10 min. Bez danych o trasie zakładamy 30 min (bezpieczny domysł).
function travelMinutes(oneWayKm: number | null): number {
  if (oneWayKm == null || oneWayKm <= 0) return 30;
  return Math.max(10, Math.round(oneWayKm * 1.2));
}

interface ResvJoin {
  id: string;
  status: string | null;
  event_type: string | null;
  location: string | null;
  event_start_time: string | null;
  assembly_time: string | null;
  package: { assembly_minutes: number | null } | null;
}
interface JobJoin {
  id: string;
  status: string;
  reservation: ResvJoin | null;
}

export async function runDepartureAlertSweep(): Promise<{ ok: boolean; alerted: number }> {
  if (!isServiceRoleConfigured()) return { ok: false, alerted: 0 };
  const s = createAdminClient();
  const today = warsawTodayISO();
  const nowMin = warsawNowMinutes();

  // Dzisiejsze realizacje iClub, jeszcze niewyjechane i niezaalarmowane.
  const { data: jobsData } = await s
    .from("jobs")
    .select("id, status, reservation:reservations(id, status, event_type, location, event_start_time, assembly_time, package:packages(assembly_minutes))")
    .eq("event_date", today)
    .eq("business_line", "ICLUB")
    .in("status", ["PLANNED", "IN_PROGRESS"])
    .is("departed_at", null)
    .is("late_depart_alerted_at", null);
  const jobs = ((jobsData ?? []) as unknown as JobJoin[]).filter(
    (j) => j.reservation && j.reservation.status !== "CANCELLED" && j.reservation.status !== "EXPIRED",
  );
  if (!jobs.length) return { ok: true, alerted: 0 };

  const ids = jobs.map((j) => j.id);

  // Tylko zlecenia z przypisanym zespołem (bez zespołu → osobny alert „bez zespołu").
  const { data: asg } = await s.from("job_assignments").select("job_id").in("job_id", ids).eq("status", "APPROVED");
  const withTeam = new Set(((asg ?? []) as { job_id: string }[]).map((a) => a.job_id));

  // Dystans jednokierunkowy per zlecenie (do estymaty dojazdu).
  const { data: tc } = await s.from("transport_calcs").select("job_id, one_way_km, distance_km").in("job_id", ids);
  const kmByJob = new Map<string, number>();
  for (const t of (tc ?? []) as { job_id: string; one_way_km: number | null; distance_km: number | null }[]) {
    const km = Number(t.one_way_km ?? t.distance_km ?? 0) || 0;
    if (km > (kmByJob.get(t.job_id) ?? 0)) kmByJob.set(t.job_id, km);
  }

  let alerted = 0;
  for (const j of jobs) {
    if (!withTeam.has(j.id)) continue;
    const r = j.reservation!;
    // Moment, w którym pracownik musi być NA MIEJSCU (start montażu).
    // 1) ręcznie ustalona godzina montażu; 2) start imprezy − czas montażu (40–90 min).
    const asmMin = Math.min(90, Math.max(40, Number(r.package?.assembly_minutes ?? 0) || 60));
    let arrivalMin = parseTime(r.assembly_time);
    if (arrivalMin == null) {
      const startMin = parseTime(r.event_start_time);
      if (startMin != null) arrivalMin = startMin - asmMin;
    }
    if (arrivalMin == null) continue; // brak danych o czasie → nie alarmujemy

    const travelMin = travelMinutes(kmByJob.get(j.id) ?? null);
    const departureMin = arrivalMin - travelMin;
    if (nowMin < departureMin) continue; // jeszcze za wcześnie — ma czas

    const what = r.event_type?.trim() || "Realizacja iClub";
    const where = r.location ? ` · ${r.location}` : "";
    await sendPushToOwners({
      title: "⚠️ Pracownik powinien już jechać",
      body: `${what}${where} — wyjazd ~${fmtTime(departureMin)} (montaż ${fmtTime(arrivalMin)}, dojazd ~${travelMin} min), a nikt nie ruszył.`,
      url: `/reservations/${r.id}`,
      tag: `late-depart-${j.id}`,
    });
    await s.from("jobs").update({ late_depart_alerted_at: new Date().toISOString() }).eq("id", j.id);
    alerted++;
  }

  return { ok: true, alerted };
}
