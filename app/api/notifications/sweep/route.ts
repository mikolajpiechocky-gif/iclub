// GET /api/notifications/sweep — cykliczne powiadomienia push (raz dziennie z crona).
// Autoryzacja sekretem (CRON_SECRET / OLX_CRON_SECRET). Proxy przepuszcza tę ścieżkę.
import { NextRequest, NextResponse } from "next/server";
import { runNotificationsSweep } from "@/lib/data/notifications-sweep";
import { sendPushToOwners } from "@/lib/integrations/push";

function isCronAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  const secrets = [process.env.CRON_SECRET, process.env.OLX_CRON_SECRET].filter(Boolean) as string[];
  return secrets.some((s) => auth === `Bearer ${s}`);
}

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  // ?test=1 → wyślij testowe powiadomienie do wszystkich szefów (weryfikacja push).
  if (new URL(req.url).searchParams.get("test") === "1") {
    await sendPushToOwners({ title: "iClub — test", body: "Powiadomienia push działają ✅", url: "/notifications", tag: "test" });
    return NextResponse.json({ ok: true, test: true });
  }
  const result = await runNotificationsSweep();
  return NextResponse.json(result, { status: 200 });
}
