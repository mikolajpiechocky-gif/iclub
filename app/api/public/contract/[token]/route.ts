// GET /api/public/contract/:token — treść umowy do wyświetlenia (publiczne, bez kodu, bez logowania).
// Sam token nie podpisuje. X-Robots-Tag: noindex.
import { NextRequest } from "next/server";
import { getEsignByToken } from "@/lib/data/esign";
import { corsHeaders, preflight } from "@/lib/http/public-cors";

export const dynamic = "force-dynamic";

export function OPTIONS() { return preflight(); }

const REGULAMIN_URL = process.env.REGULAMIN_URL || "https://iclubevents.pl/regulamin";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const c = await getEsignByToken(token);
  const headers = { "Content-Type": "application/json", "X-Robots-Tag": "noindex", ...corsHeaders() };
  if (!c) return new Response(JSON.stringify({ ok: false, error: "not_found" }), { status: 404, headers });
  return new Response(JSON.stringify({
    ok: true,
    status: c.status,
    order_no: c.order_no,
    document_html: c.document_html,
    document_sha256: c.document_sha256,
    regulamin_url: REGULAMIN_URL,
    regulamin_version: c.regulamin_version,
    amount_total: c.amount_total,
    amount_deposit: c.amount_deposit,
    deposit_due: c.deposit_due,
    signed_at: c.signed_at,
    token_expires_at: c.token_expires_at,
  }), { status: 200, headers });
}
