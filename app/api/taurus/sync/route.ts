// GET /api/taurus/sync — synchronizacja iClub → TAURUS (kalendarz eventów). Cron z sekretem.
// Proxy przepuszcza tę ścieżkę (własna autoryzacja sekretem).
import { NextRequest, NextResponse } from "next/server";
import { syncUpcomingEventsToTaurus } from "@/lib/data/taurus-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isCronAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  const secrets = [process.env.CRON_SECRET, process.env.OLX_CRON_SECRET].filter(Boolean) as string[];
  return secrets.some((s) => auth === `Bearer ${s}`);
}

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const result = await syncUpcomingEventsToTaurus();
  return NextResponse.json(result, { status: 200 });
}
