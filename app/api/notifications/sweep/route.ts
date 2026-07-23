// GET /api/notifications/sweep — cykliczne powiadomienia push (raz dziennie z crona).
// Autoryzacja sekretem (CRON_SECRET / OLX_CRON_SECRET). Proxy przepuszcza tę ścieżkę.
import { NextRequest, NextResponse } from "next/server";
import { runNotificationsSweep } from "@/lib/data/notifications-sweep";

function isCronAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  const secrets = [process.env.CRON_SECRET, process.env.OLX_CRON_SECRET].filter(Boolean) as string[];
  return secrets.some((s) => auth === `Bearer ${s}`);
}

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const result = await runNotificationsSweep();
  return NextResponse.json(result, { status: 200 });
}
