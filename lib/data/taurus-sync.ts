// Synchronizacja iClub → TAURUS. Przez service_role (cron bez sesji).
// Faza 1: potwierdzone, przyszłe eventy iClub trafiają do kalendarza TAURUS jako jobs
// (source='iclub_event', company='iclub'), żeby manager TAURUS ich nie „zaorał" innym zadaniem.
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { createTaurusJob, updateTaurusJob, isTaurusConfigured, type TaurusCheckItem } from "@/lib/integrations/taurus";
import { listAddons } from "@/lib/data/resources";

interface UpcomingRow {
  id: string; event_type: string | null; event_date: string | null; location: string | null;
  business_line: string; guests: number | null; event_start_time: string | null; heating: boolean | null;
  addon_ids: string[] | null; notes: string | null; taurus_event_job_id: string | null;
  package: { name: string | null } | null; tent: { name: string | null } | null; tent2: { name: string | null } | null;
}

// Etykieta wyróżniająca wpis pochodzący z aplikacji iClub w kalendarzu TAURUS + pełny opis
// (namiot, pakiet, goście, dodatki, notatka), żeby ekipa TAURUS wiedziała co szykować.
function taurusEventPayload(r: UpcomingRow, addonName: Map<string, string>) {
  const isRental = r.business_line === "EQUIPMENT_RENTAL";
  const tents = [r.tent?.name, r.tent2?.name].filter(Boolean).join(" + ");
  const addons = (r.addon_ids ?? []).map((id) => addonName.get(id)).filter((n): n is string => Boolean(n)).join(", ");
  const head = [tents, r.package?.name].filter(Boolean).join(" · ") || r.event_type || (isRental ? "Wypożyczenie" : "Realizacja");
  const title = `--- Apka iClub --- ${head}${r.location ? " · " + r.location : ""}`;
  const notes = [
    isRental ? "Wypożyczenie (z aplikacji iClub)" : "Realizacja iClub (z aplikacji iClub)",
    r.event_type && `Typ: ${r.event_type}`,
    `Data: ${r.event_date}${r.event_start_time ? ` · start ${r.event_start_time}` : ""}`,
    r.location && `Lokalizacja: ${r.location}`,
    r.guests != null && `Goście: ${r.guests}`,
    tents && `Namiot: ${tents}`,
    r.package?.name && `Pakiet: ${r.package.name}`,
    !isRental && `Ogrzewanie: ${r.heating ? "tak" : "nie"}`,
    addons && `Dodatki: ${addons}`,
    r.notes && `\nNotatki: ${r.notes}`,
    `(res ${r.id})`,
  ].filter(Boolean).join("\n");
  return { title, notes };
}

export async function syncUpcomingEventsToTaurus(): Promise<{ ok: boolean; created: number; updated?: number; skipped?: string }> {
  if (!isServiceRoleConfigured()) return { ok: false, created: 0, skipped: "iClub service_role brak" };
  if (!isTaurusConfigured()) return { ok: true, created: 0, skipped: "TAURUS niepodłączony" };
  const s = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  // Wszystkie nadchodzące, potwierdzone eventy — NOWE (bez taurus_event_job_id) tworzymy,
  // ISTNIEJĄCE odświeżamy (etykieta/opis/data mogły się zmienić albo powstały przed wzbogaceniem).
  const { data } = await s.from("reservations")
    .select("id, event_type, event_date, location, business_line, status, guests, event_start_time, heating, addon_ids, notes, taurus_event_job_id, package:packages(name), tent:tents!tent_id(name), tent2:tents!tent_id_2(name)")
    .eq("status", "CONFIRMED").gte("event_date", today);
  const rows = (data ?? []) as unknown as UpcomingRow[];
  if (!rows.length) return { ok: true, created: 0, updated: 0 };

  const addons = await listAddons();
  const addonName = new Map(addons.map((a) => [a.id, a.name]));

  let created = 0, updated = 0;
  for (const r of rows) {
    if (!r.event_date) continue;
    const { title, notes } = taurusEventPayload(r, addonName);
    try {
      if (r.taurus_event_job_id) {
        await updateTaurusJob(r.taurus_event_job_id, { title, internal_notes: notes, scheduled_date: r.event_date });
        updated++;
      } else {
        const jobId = await createTaurusJob({
          title, job_type: "internal", source: "iclub_event",
          scheduled_date: r.event_date, internal_notes: notes,
        });
        if (jobId) { await s.from("reservations").update({ taurus_event_job_id: jobId }).eq("id", r.id); created++; }
      }
    } catch (e) { console.error("syncUpcomingEventsToTaurus:", e); }
  }
  return { ok: true, created, updated };
}

function nextDay(iso: string): string {
  const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// Faza 2: po zamkniętej realizacji iClub tworzymy w TAURUS zadanie serwisowe (source='iclub_service')
// z checklistą sprzętu (czyszczenie/sprawdzenie). Idempotentne (taurus_service_job_id). Tylko świeże
// (event z ostatnich 21 dni), żeby nie generować zadań dla starej historii.
export async function syncServiceTasksToTaurus(): Promise<{ ok: boolean; created: number; skipped?: string }> {
  if (!isServiceRoleConfigured()) return { ok: false, created: 0, skipped: "iClub service_role brak" };
  if (!isTaurusConfigured()) return { ok: true, created: 0, skipped: "TAURUS niepodłączony" };
  const s = createAdminClient();
  const cutoff = (() => { const d = new Date(); d.setUTCDate(d.getUTCDate() - 21); return d.toISOString().slice(0, 10); })();

  const { data } = await s.from("jobs")
    .select("id, status, business_line, reservation:reservations(id, event_type, event_date, addon_ids, taurus_service_job_id, tent:tents!tent_id(name), tent2:tents!tent_id_2(name))")
    .eq("business_line", "ICLUB").eq("status", "DONE");
  const rows = (data ?? []) as unknown as {
    reservation: { id: string; event_type: string | null; event_date: string | null; addon_ids: string[] | null;
      taurus_service_job_id: string | null; tent: { name: string | null } | null; tent2: { name: string | null } | null } | null;
  }[];
  const todo = rows.map((x) => x.reservation).filter((r): r is NonNullable<typeof r> =>
    !!r && !r.taurus_service_job_id && !!r.event_date && r.event_date >= cutoff);
  if (!todo.length) return { ok: true, created: 0 };

  const addons = await listAddons();
  const addonName = new Map(addons.map((a) => [a.id, a.name]));
  let created = 0;
  for (const r of todo) {
    const checklist: TaurusCheckItem[] = [];
    for (const tn of [r.tent?.name, r.tent2?.name]) {
      if (tn) checklist.push({ label: `Namiot ${tn} — czyszczenie i sprawdzenie (zamki, słupki, dmuchawa)`, done: false, section: "scope" });
    }
    for (const id of r.addon_ids ?? []) {
      const n = addonName.get(id);
      if (n) checklist.push({ label: `${n} — sprawdzenie / czyszczenie`, done: false, section: "scope" });
    }
    checklist.push(
      { label: "Cały sprzęt odesłany do magazynu", done: false, section: "check" },
      { label: "Awarie/uszkodzenia zgłoszone do admina", done: false, section: "check" },
    );
    try {
      const jobId = await createTaurusJob({
        title: `Serwis po evencie iClub — ${r.event_type ?? "realizacja"} (${r.event_date})`,
        job_type: "service", source: "iclub_service", service_category: "cleanup",
        scheduled_date: nextDay(r.event_date!),
        checklist,
        internal_notes: `Serwis po realizacji iClub (res ${r.id})`,
      });
      if (jobId) { await s.from("reservations").update({ taurus_service_job_id: jobId }).eq("id", r.id); created++; }
    } catch (e) { console.error("syncServiceTasksToTaurus:", e); }
  }
  return { ok: true, created };
}
