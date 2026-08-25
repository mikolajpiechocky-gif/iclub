// POST /api/contracts/:id/send — zamraża treść + sumę kontrolną, wysyła mail z linkiem, status → sent.
// Wewnętrzne, tylko owner. Od tej chwili document_html jest niezmienne.
import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/data/profiles";
import { sendEsignContract } from "@/lib/data/esign";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const p = await getCurrentProfile();
  if (p?.role !== "OWNER") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const res = await sendEsignContract(id);
  if (!res.ok) return NextResponse.json({ ok: false, error: res.error }, { status: 400 });
  // emailSkipped=true → poczta nieskonfigurowana; owner może skopiować link i wysłać ręcznie.
  return NextResponse.json({ ok: true, emailSkipped: res.emailSkipped, link: res.link }, { status: 200 });
}
