// GET /api/public/pricing — cennik na żywo dla konfiguratora na stronie (publiczny, tylko odczyt).
// Zwraca pakiety (cena mały/duży + montaż), dodatki, wypożyczalnię, widełki transportu i stałe.
import { NextRequest } from "next/server";
import { getPublicPricing } from "@/lib/data/public";
import { corsHeaders, preflight, jsonCors, apiKeyOk } from "@/lib/http/public-cors";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function GET(req: NextRequest) {
  if (!apiKeyOk(req)) return jsonCors({ ok: false, error: "unauthorized" }, 401);
  const pricing = await getPublicPricing();
  if (!pricing) return jsonCors({ ok: false, error: "Cennik chwilowo niedostępny." }, 503);
  return new Response(JSON.stringify({ ok: true, ...pricing }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300", ...corsHeaders() },
  });
}
