// Cykliczne powiadomienia push (raz dziennie, z crona). Wszystkie odczyty przez
// service_role (cron nie ma sesji). Każdy blok w try/catch — awaria jednego nie psuje reszty.
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { sendPushToOwners, sendPushToUsers } from "@/lib/integrations/push";
import { getEventWeather } from "@/lib/integrations/weather";

function ymd(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

interface JobRow {
  id: string;
  event_date: string | null;
  status: string;
  reservation: { location: string | null; event_type: string | null; status: string | null } | null;
}

export async function runNotificationsSweep(): Promise<{ ok: boolean; sent: Record<string, number> }> {
  if (!isServiceRoleConfigured()) return { ok: false, sent: {} };
  const s = createAdminClient();
  const sent: Record<string, number> = {};
  const today = ymd(0);
  const tomorrow = ymd(1);
  const in2 = ymd(2);

  // 1. Przypomnienie o cenach paliwa (≥14 dni od aktualizacji).
  try {
    const { data } = await s.from("app_settings").select("fuel_updated_at").eq("id", true).maybeSingle();
    const at = (data as { fuel_updated_at?: string | null } | null)?.fuel_updated_at;
    if (at && (Date.now() - new Date(at).getTime()) / 86_400_000 >= 14) {
      await sendPushToOwners({ title: "Zaktualizuj ceny paliwa", body: "Minęły 2 tygodnie od ostatniej aktualizacji.", url: "/settings", tag: "fuel" });
      sent.fuel = 1;
    }
  } catch { /* pomiń */ }

  // 2. Ogłoszenia OLX wygasające/wygasłe (valid_to ≤ dziś+2).
  try {
    const { data } = await s.from("olx_adverts").select("title, valid_to").not("valid_to", "is", null);
    const rows = (data ?? []) as { title: string | null; valid_to: string }[];
    const soon = rows.filter((r) => r.valid_to.slice(0, 10) <= in2);
    if (soon.length) {
      await sendPushToOwners({ title: soon.length === 1 ? "Ogłoszenie OLX wygasa" : `${soon.length} ogłoszeń OLX wygasa`, body: soon.slice(0, 3).map((r) => r.title ?? "Ogłoszenie").join(", "), url: "/adverts", tag: "advert-expiry" });
      sent.adverts = soon.length;
    }
  } catch { /* pomiń */ }

  // Jutrzejsze realizacje iClub (do pogody i pakowania).
  let tomJobs: { id: string; location: string | null; type: string | null }[] = [];
  try {
    const { data } = await s.from("jobs").select("id, event_date, status, reservation:reservations(location, event_type, status)").eq("event_date", tomorrow).eq("business_line", "ICLUB");
    tomJobs = ((data ?? []) as unknown as JobRow[]).map((j) => ({ id: j.id, location: j.reservation?.location ?? null, type: j.reservation?.event_type ?? null }));
  } catch { /* pomiń */ }

  // 3. Ostrzeżenie pogodowe dla jutrzejszych realizacji.
  try {
    const warned: string[] = [];
    for (const j of tomJobs) {
      if (!j.location) continue;
      const w = await getEventWeather(j.location, tomorrow);
      if (w && w.warnings.length) warned.push(`${j.type ?? "Realizacja"} (${w.warnings[0].text})`);
    }
    if (warned.length) {
      await sendPushToOwners({ title: "Ostrzeżenie pogodowe na jutro", body: warned.slice(0, 3).join("; "), url: "/calendar", tag: "weather" });
      sent.weather = warned.length;
    }
  } catch { /* pomiń */ }

  // 4. „Spakuj się dzień przed" — do przypisanych, gdy checklista pakowania niekompletna.
  try {
    const jobIds = tomJobs.map((j) => j.id);
    if (jobIds.length) {
      const { data: chk } = await s.from("checklist_items").select("job_id, done").in("job_id", jobIds);
      const byJob = new Map<string, { total: number; done: number }>();
      for (const c of (chk ?? []) as { job_id: string; done: boolean }[]) {
        const e = byJob.get(c.job_id) ?? { total: 0, done: 0 };
        e.total++; if (c.done) e.done++; byJob.set(c.job_id, e);
      }
      const { data: asg } = await s.from("job_assignments").select("job_id, profile_id").in("job_id", jobIds).eq("status", "APPROVED");
      const asgByJob = new Map<string, string[]>();
      for (const a of (asg ?? []) as { job_id: string; profile_id: string }[]) {
        const arr = asgByJob.get(a.job_id) ?? []; arr.push(a.profile_id); asgByJob.set(a.job_id, arr);
      }
      let cnt = 0;
      for (const j of tomJobs) {
        const c = byJob.get(j.id);
        const incomplete = !c || c.done < c.total; // brak checklisty lub niepełna
        const emps = asgByJob.get(j.id) ?? [];
        if (incomplete && emps.length) {
          await sendPushToUsers(emps, { title: "Spakuj się na jutro", body: `${j.type ?? "Realizacja iClub"}${j.location ? " · " + j.location : ""} — checklista pakowania niedokończona`, url: `/field/${j.id}/checklist`, tag: `pack-${j.id}` });
          cnt++;
        }
      }
      if (cnt) sent.packing = cnt;
    }
  } catch { /* pomiń */ }

  // 5. Realizacja bez zespołu (dziś..+2 dni) → szefowie.
  try {
    const { data } = await s.from("jobs").select("id, event_date, status, reservation:reservations(event_type, status)").eq("business_line", "ICLUB").in("status", ["PLANNED", "IN_PROGRESS"]).gte("event_date", today).lte("event_date", in2);
    const jobs = ((data ?? []) as unknown as JobRow[]).filter((j) => j.reservation?.status !== "CANCELLED" && j.reservation?.status !== "EXPIRED");
    if (jobs.length) {
      const ids = jobs.map((j) => j.id);
      const { data: asg } = await s.from("job_assignments").select("job_id").in("job_id", ids).eq("status", "APPROVED");
      const withTeam = new Set(((asg ?? []) as { job_id: string }[]).map((a) => a.job_id));
      const orphan = jobs.filter((j) => !withTeam.has(j.id));
      if (orphan.length) {
        await sendPushToOwners({ title: orphan.length === 1 ? "Realizacja bez zespołu" : `${orphan.length} realizacji bez zespołu`, body: orphan.slice(0, 3).map((j) => `${j.reservation?.event_type ?? "Realizacja"} · ${j.event_date ?? ""}`).join(", "), url: "/planner", tag: "no-team" });
        sent.noTeam = orphan.length;
      }
    }
  } catch { /* pomiń */ }

  return { ok: true, sent };
}
