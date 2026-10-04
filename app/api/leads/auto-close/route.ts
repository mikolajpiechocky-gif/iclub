// POST /api/leads/auto-close — zamyka nieaktywne leady (§6.2). Dostęp: Szef (z sesji)
// LUB cron z sekretem (Authorization: Bearer OLX_CRON_SECRET).
import { NextRequest, NextResponse } from "next/server";
import { autoCloseStaleLeads } from "@/lib/data/inquiries";
import { getCurrentProfile } from "@/lib/data/profiles";
import { cronAuthorized } from "@/lib/http/safe-compare";

export async function POST(req: NextRequest) {
  const isCron = cronAuthorized(req.headers.get("authorization"), [process.env.OLX_CRON_SECRET, process.env.CRON_SECRET]);
  if (!isCron) {
    const profile = await getCurrentProfile();
    if (profile?.role !== "OWNER") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const r = await autoCloseStaleLeads();
  return NextResponse.json({ ok: true, ...r });
}
