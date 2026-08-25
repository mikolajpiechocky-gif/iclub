// POST /api/contracts — generuje umowę ze zgłoszenia (wewnętrzne, tylko owner). Status draft.
// Body: { inquiryId, godzinaDostawy?, terminZadatku?, amountTotal?, amountDeposit?, blik?, orderNo? }
import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/data/profiles";
import { createEsignContract } from "@/lib/data/esign";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const p = await getCurrentProfile();
  if (p?.role !== "OWNER") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  let body: {
    inquiryId?: string; godzinaDostawy?: string; terminZadatku?: string;
    amountTotal?: number; amountDeposit?: number; blik?: string; orderNo?: string;
  };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 }); }
  if (!body.inquiryId) return NextResponse.json({ ok: false, error: "inquiryId_required" }, { status: 400 });

  const res = await createEsignContract({
    inquiryId: body.inquiryId,
    deliveryHour: body.godzinaDostawy ?? null,
    depositDue: body.terminZadatku ?? null,
    amountTotal: body.amountTotal ?? null,
    amountDeposit: body.amountDeposit ?? null,
    blik: body.blik ?? null,
    orderNo: body.orderNo ?? null,
  }, p.id ?? null);
  if (!res.ok) return NextResponse.json({ ok: false, error: res.error }, { status: 400 });
  return NextResponse.json({ ok: true, id: res.id, access_token: res.token }, { status: 201 });
}
