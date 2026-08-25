// GET /api/public/availability?from=YYYY-MM-DD&to=YYYY-MM-DD — realna dostępność z kalendarza iClub.
// Zwraca dla każdego dnia w zakresie zajęte sloty namiotów (large/small/backdoor/gastro) i ogrzewania.
// Konfigurator liczy wolne = capacity − used i koloruje kalendarz. Publiczny, tylko odczyt.
import { NextRequest } from "next/server";
import { getPublicAvailability } from "@/lib/data/public";
import { corsHeaders, preflight, jsonCors, apiKeyOk } from "@/lib/http/public-cors";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

const isDate = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

export async function GET(req: NextRequest) {
  if (!apiKeyOk(req)) return jsonCors({ ok: false, error: "unauthorized" }, 401);
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!isDate(from) || !isDate(to)) return jsonCors({ ok: false, error: "Podaj from i to w formacie YYYY-MM-DD." }, 400);
  if (from > to) return jsonCors({ ok: false, error: "from musi być <= to." }, 400);

  const av = await getPublicAvailability(from, to);
  if (!av) return jsonCors({ ok: false, error: "Dostępność chwilowo niedostępna." }, 503);
  return new Response(JSON.stringify({ ok: true, from, to, ...av }), {
    status: 200,
    // krótki cache: kalendarz zmienia się rzadko, a konfigurator odpytuje per widok miesiąca
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=120", ...corsHeaders() },
  });
}
