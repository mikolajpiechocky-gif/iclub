// POST /api/leads/auto-close — zamyka nieaktywne leady (§6.2). Dostęp: Szef (z sesji)
// LUB cron z sekretem (Authorization: Bearer OLX_CRON_SECRET).
import { NextRequest, NextResponse } from "next/server";
import { autoCloseStaleLeads } from "@/lib/data/inquiries";
import { getCurrentProfile } from "@/lib/data/profiles";

export async function POST(req: NextRequest) {
  const cronSecret = process.env.OLX_CRON_SECRET;
  const isCron = Boolean(cronSecret) && req.headers.get("authorization") === `Bearer ${cronSecret}`;
  if (!isCron) {
    const profile = await getCurrentProfile();
    if (profile?.role !== "OWNER") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const r = await autoCloseStaleLeads();
  return NextResponse.json({ ok: true, ...r });
}
