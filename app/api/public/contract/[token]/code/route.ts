// POST /api/public/contract/:token/code — generuje kod, zapisuje skrót, wysyła mailem (bez linku).
// Rate-limit po stronie warstwy danych (3 żądania / 10 min na token).
import { NextRequest } from "next/server";
import { requestEsignCode } from "@/lib/data/esign";
import { preflight, jsonCors } from "@/lib/http/public-cors";

export const dynamic = "force-dynamic";

export function OPTIONS() { return preflight(); }

export async function POST(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const res = await requestEsignCode(token);
  if (!res.ok) return jsonCors({ ok: false, error: res.error }, res.httpStatus ?? 400);
  return jsonCors({ ok: true }, 200);
}
