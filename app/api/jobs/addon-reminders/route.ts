// POST /api/jobs/addon-reminders — §9.4 powiadamia przypisanych pracowników o jutrzejszych
// realizacjach z dodatkami. Dostęp: cron (Authorization: Bearer OLX_CRON_SECRET) lub Szef.
import { NextRequest, NextResponse } from "next/server";
import { notifyAddonRealizations } from "@/lib/data/reminders";
import { getCurrentProfile } from "@/lib/data/profiles";
import { cronAuthorized } from "@/lib/http/safe-compare";

export async function POST(req: NextRequest) {
  const isCron = cronAuthorized(req.headers.get("authorization"), [process.env.OLX_CRON_SECRET, process.env.CRON_SECRET]);
  if (!isCron) {
    const profile = await getCurrentProfile();
    if (profile?.role !== "OWNER") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const r = await notifyAddonRealizations();
  return NextResponse.json({ ok: true, ...r });
}
