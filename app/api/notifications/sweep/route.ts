// GET /api/notifications/sweep — cykliczne powiadomienia push (raz dziennie z crona).
// ?mode=departure → tylko alert „pracownik powinien już jechać" (cron co ~30 min).
// Autoryzacja sekretem (CRON_SECRET / OLX_CRON_SECRET). Proxy przepuszcza tę ścieżkę.
import { NextRequest, NextResponse } from "next/server";
import { runNotificationsSweep } from "@/lib/data/notifications-sweep";
import { runDepartureAlertSweep } from "@/lib/data/departure-alerts";
import { runLeadReminderSweep } from "@/lib/data/lead-reminders";
import { sendPushToOwners } from "@/lib/integrations/push";

function isCronAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  const secrets = [process.env.CRON_SECRET, process.env.OLX_CRON_SECRET].filter(Boolean) as string[];
  return secrets.some((s) => auth === `Bearer ${s}`);
}

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const params = new URL(req.url).searchParams;
  // ?test=1 → wyślij testowe powiadomienie do wszystkich szefów (weryfikacja push).
  if (params.get("test") === "1") {
    await sendPushToOwners({ title: "iClub — test", body: "Powiadomienia push działają ✅", url: "/notifications", tag: "test" });
    return NextResponse.json({ ok: true, test: true });
  }
  // ?mode=departure → lekki, częsty sprawdzian wyjazdu (bez pełnego, dziennego sweepu).
  if (params.get("mode") === "departure") {
    const result = await runDepartureAlertSweep();
    return NextResponse.json(result, { status: 200 });
  }
  // ?mode=leads → przypomnienia o nieodpisanych leadach (konfigurator/OLX); okno pon–sob 7–18 pilnuje kod.
  if (params.get("mode") === "leads") {
    const result = await runLeadReminderSweep();
    return NextResponse.json(result, { status: 200 });
  }
  const result = await runNotificationsSweep();
  return NextResponse.json(result, { status: 200 });
}
