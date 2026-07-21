// POST /api/olx/sync — synchronizacja rozmów OLX → zapytania. Dostęp: szef
// (z sesji) LUB cron z sekretem (Authorization: Bearer OLX_CRON_SECRET).
import { NextRequest, NextResponse } from "next/server";
import { syncOlxThreads } from "@/lib/data/olx-sync";
import { getCurrentProfile } from "@/lib/data/profiles";

export async function POST(req: NextRequest) {
  const cronSecret = process.env.OLX_CRON_SECRET;
  const isCron = Boolean(cronSecret) && req.headers.get("authorization") === `Bearer ${cronSecret}`;
  if (!isCron) {
    const profile = await getCurrentProfile();
    if (profile?.role !== "OWNER") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const result = await syncOlxThreads();
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
