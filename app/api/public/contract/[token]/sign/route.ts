// POST /api/public/contract/:token/sign — weryfikuje kod i zawiera umowę. Zapisuje dowód, wysyła
// „umowa zawarta". Body: { code, zgodaRegulamin }. Kody błędów: 409/410/429/401.
import { NextRequest } from "next/server";
import { signEsignContract } from "@/lib/data/esign";
import { preflight, jsonCors } from "@/lib/http/public-cors";

export const dynamic = "force-dynamic";

export function OPTIONS() { return preflight(); }

function clientIp(req: NextRequest): string | null {
  const xff = req.headers.get("x-forwarded-for");
  return xff ? xff.split(",")[0].trim() : req.headers.get("x-real-ip");
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let body: { code?: string; zgodaRegulamin?: boolean };
  try { body = await req.json(); } catch { return jsonCors({ ok: false, error: "bad_json" }, 400); }

  const res = await signEsignContract(
    token,
    String(body.code ?? ""),
    Boolean(body.zgodaRegulamin),
    clientIp(req),
    req.headers.get("user-agent"),
  );
  if (!res.ok) return jsonCors({ ok: false, error: res.error }, res.httpStatus ?? 400);
  return jsonCors({ ok: true, signedAt: res.signedAt }, 200);
}
