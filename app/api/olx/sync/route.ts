// /api/olx/sync — synchronizacja rozmów OLX → zapytania.
// POST: szef z sesji (przycisk) LUB cron z sekretem.
// GET: wyłącznie cron z sekretem (Vercel Cron woła GET). Proxy przepuszcza tę ścieżkę,
// więc autoryzację pilnuje ten handler.
import { NextRequest, NextResponse } from "next/server";
import { syncOlxThreads } from "@/lib/data/olx-sync";
import { getCurrentProfile } from "@/lib/data/profiles";

// Cron autoryzowany, gdy nagłówek pasuje do CRON_SECRET (Vercel) lub OLX_CRON_SECRET.
function isCronAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  const secrets = [process.env.CRON_SECRET, process.env.OLX_CRON_SECRET].filter(Boolean) as string[];
  return secrets.some((s) => auth === `Bearer ${s}`);
}

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const result = await syncOlxThreads();
  // Cron zawsze 200 (status biznesowy w body) — harmonogram nie „czerwieni się", gdy OLX
  // jest chwilowo niepołączone; szczegóły widać w logu uruchomienia.
  return NextResponse.json(result, { status: 200 });
}

export async function POST(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    const profile = await getCurrentProfile();
    if (profile?.role !== "OWNER") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const result = await syncOlxThreads();
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
