// Synchronizacja iClub → TAURUS. Przez service_role (cron bez sesji).
// Faza 1: potwierdzone, przyszłe eventy iClub trafiają do kalendarza TAURUS jako jobs
// (source='iclub_event', company='iclub'), żeby manager TAURUS ich nie „zaorał" innym zadaniem.
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { createTaurusJob, isTaurusConfigured } from "@/lib/integrations/taurus";

export async function syncUpcomingEventsToTaurus(): Promise<{ ok: boolean; created: number; skipped?: string }> {
  if (!isServiceRoleConfigured()) return { ok: false, created: 0, skipped: "iClub service_role brak" };
  if (!isTaurusConfigured()) return { ok: true, created: 0, skipped: "TAURUS niepodłączony" };
  const s = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data } = await s.from("reservations")
    .select("id, event_type, event_date, location, business_line, status, taurus_event_job_id")
    .eq("status", "CONFIRMED").gte("event_date", today).is("taurus_event_job_id", null);
  const rows = (data ?? []) as {
    id: string; event_type: string | null; event_date: string | null; location: string | null;
    business_line: string; taurus_event_job_id: string | null;
  }[];

  let created = 0;
  for (const r of rows) {
    if (!r.event_date) continue;
    try {
      const jobId = await createTaurusJob({
        title: `iClub: ${r.event_type ?? (r.business_line === "EQUIPMENT_RENTAL" ? "Wypożyczenie" : "Realizacja")}`,
        job_type: "internal",              // info-only w kalendarzu, nie zadanie robocze
        source: "iclub_event",
        scheduled_date: r.event_date,
        internal_notes: `Realizacja iClub — ${r.location ?? "lokalizacja do potwierdzenia"} (res ${r.id})`,
      });
      if (jobId) {
        await s.from("reservations").update({ taurus_event_job_id: jobId }).eq("id", r.id);
        created++;
      }
    } catch (e) { console.error("syncUpcomingEventsToTaurus:", e); }
  }
  return { ok: true, created };
}
