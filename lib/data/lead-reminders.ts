// Przypomnienia o nieodpisanych leadach (konfigurator + OLX). Uruchamiane często z crona;
// wysyła TYLKO w oknie roboczym: pon–sob 7:00–18:00 (Europe/Warsaw). Etapy 2/4/24 h bez spamu
// (śledzone w inquiries.reminder_stage). Odczyt/zapis przez service_role (cron bez sesji).
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { sendPushToOwners } from "@/lib/integrations/push";
import { listOwnerUserIds } from "@/lib/data/push";
import { olxNeedsResponse } from "@/lib/domain/lead-analysis";

const THRESHOLDS_H = [24, 4, 2]; // najpierw najwyższy — jeden (najświeższy przekroczony) na przebieg

// Dzień tygodnia (0=nd…6=sob) i godzina w strefie Europe/Warsaw.
function warsawDowHour(): { dow: number; hour: number } {
  const now = new Date();
  const hour = parseInt(now.toLocaleString("en-GB", { timeZone: "Europe/Warsaw", hour: "2-digit", hour12: false }).slice(0, 2), 10);
  const wd = now.toLocaleString("en-US", { timeZone: "Europe/Warsaw", weekday: "short" });
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { dow: map[wd] ?? 1, hour: Number.isFinite(hour) ? hour : 12 };
}

// Okno robocze: pon–sob (nie niedziela), 7:00–18:00.
function inWorkWindow(): boolean {
  const { dow, hour } = warsawDowHour();
  return dow >= 1 && dow <= 6 && hour >= 7 && hour < 18;
}

interface LeadRow {
  id: string;
  source: string | null;
  status: string;
  contact_name: string | null;
  contact_email: string | null;
  event_type: string | null;
  location: string | null;
  created_at: string | null;
  olx_last_message_at: string | null;
  olx_messages: { text: string; mine: boolean }[] | null;
  reminder_stage: number | null;
}

export async function runLeadReminderSweep(): Promise<{ ok: boolean; sent: number; skipped?: string }> {
  if (!isServiceRoleConfigured()) return { ok: false, sent: 0 };
  if (!inWorkWindow()) return { ok: true, sent: 0, skipped: "poza oknem roboczym (pon–sob 7–18)" };

  const s = createAdminClient();
  const { data } = await s.from("inquiries")
    .select("id, source, status, contact_name, contact_email, event_type, location, created_at, olx_last_message_at, olx_messages, reminder_stage")
    .eq("status", "NEW")
    .in("source", ["WEBSITE_FORM", "OLX"]);
  const rows = (data ?? []) as LeadRow[];
  if (!rows.length) return { ok: true, sent: 0 };

  const owners = await listOwnerUserIds().catch(() => [] as string[]);
  const now = Date.now();
  let sent = 0;

  for (const r of rows) {
    const isOlx = r.source === "OLX";
    // OLX: przypominamy tylko, gdy rozmowa FAKTYCZNIE czeka na nas (nie po „dziękuję"/naszej odmowie).
    if (isOlx && !olxNeedsResponse(r.olx_messages ?? [])) continue;
    // Baza czasu: OLX — ostatnia wiadomość; konfigurator — zgłoszenie.
    const base = isOlx ? (r.olx_last_message_at ?? r.created_at) : r.created_at;
    if (!base) continue;
    const ageH = (now - new Date(base).getTime()) / 3_600_000;
    // Okno przypomnień = pierwsze 4 dni. Starsze leady (np. miesiące starej historii OLX) NIE
    // generują przypomnień — inaczej przy każdym przebiegu zalewają szefa (był realny spam ~112 leadów).
    if (ageH > 24 * 4) continue;
    const stage = r.reminder_stage ?? 0;
    const t = THRESHOLDS_H.find((th) => ageH >= th && stage < th);
    if (!t) continue;

    const who = r.contact_name || r.contact_email || (isOlx ? "klient OLX" : "klient");
    const label = [r.event_type, r.location].filter(Boolean).join(" · ") || (isOlx ? "OLX" : "konfigurator");
    try {
      await sendPushToOwners({
        title: `Lead bez odpowiedzi (${t} h)`,
        body: `${who} — ${label}. Odpisz.`,
        url: `/inquiries/${r.id}/edit`,
        tag: `lead-remind-${r.id}-${t}`,
      });
      if (owners.length) {
        await s.from("notifications").insert(owners.map((oid) => ({
          recipient: oid,
          title: `Lead bez odpowiedzi (${t} h)`,
          body: `${who} — ${label}`,
          type: "LEAD_REMINDER",
        })));
      }
      await s.from("inquiries").update({ reminder_stage: t }).eq("id", r.id);
      sent++;
    } catch { /* jeden lead nie może wywrócić reszty */ }
  }
  return { ok: true, sent };
}
