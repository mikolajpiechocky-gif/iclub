// /api/olx/sync-adverts — synchronizacja ogłoszeń OLX + statystyk (wyświetlenia/telefony).
// GET: wyłącznie cron z sekretem (Vercel Cron woła GET). POST: szef z sesji lub cron.
import { NextRequest, NextResponse } from "next/server";
import { syncOlxAdverts } from "@/lib/data/olx-adverts";
import { getCurrentProfile } from "@/lib/data/profiles";

function isCronAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  const secrets = [process.env.CRON_SECRET, process.env.OLX_CRON_SECRET].filter(Boolean) as string[];
  return secrets.some((s) => auth === `Bearer ${s}`);
}

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const result = await syncOlxAdverts();
  // Cron zawsze 200 (status biznesowy w body) — harmonogram się nie „czerwieni", gdy OLX
  // jest chwilowo niepołączone.
  return NextResponse.json(result, { status: 200 });
}

export async function POST(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    const profile = await getCurrentProfile();
    if (profile?.role !== "OWNER") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const result = await syncOlxAdverts();
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
