// POST /api/public/csp-report — odbiornik naruszeń CSP (tryb Report-Only). Przeglądarka sama
// wysyła raporty na report-uri. Zapisujemy skrót do csp_reports (service_role). Zawsze 204,
// nigdy nie przeszkadzamy przeglądarce. Publiczny — chroni sam charakter (tylko zapis raportu).
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const str = (v: unknown): string | null => (v == null ? null : String(v).slice(0, 1000));

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    if (!text || text.length > 20000) return new NextResponse(null, { status: 204 });
    let body: unknown;
    try { body = JSON.parse(text); } catch { return new NextResponse(null, { status: 204 }); }

    // Format report-uri: { "csp-report": {...} }; format report-to: [{ body: {...} }].
    const b = body as Record<string, unknown>;
    const arr0 = Array.isArray(body) ? (body[0] as Record<string, unknown> | undefined) : undefined;
    const r = (b?.["csp-report"] as Record<string, unknown> | undefined)
      ?? (arr0?.body as Record<string, unknown> | undefined)
      ?? (b as Record<string, unknown>);

    if (isServiceRoleConfigured() && r && typeof r === "object") {
      const s = createAdminClient();
      await s.from("csp_reports").insert({
        document_uri: str(r["document-uri"] ?? r["documentURL"]),
        violated_directive: str(r["violated-directive"] ?? r["violatedDirective"]),
        effective_directive: str(r["effective-directive"] ?? r["effectiveDirective"]),
        blocked_uri: str(r["blocked-uri"] ?? r["blockedURL"]),
        disposition: str(r["disposition"]),
        raw: r,
      });
    }
  } catch { /* raport diagnostyczny — błąd nie może wpływać na przeglądarkę */ }
  return new NextResponse(null, { status: 204 });
}
