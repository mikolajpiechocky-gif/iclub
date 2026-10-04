// POST /api/public/inquiry — przyjęcie konfiguracji z konfiguratora jako lead („Formularz strony").
// BEZ płatności i bez wiążącej rezerwacji — obsługa potwierdza ręcznie i wysyła link do płatności.
import { NextRequest } from "next/server";
import { createPublicInquiry, type PublicInquiryInput } from "@/lib/data/public";
import { preflight, jsonCors, apiKeyOk } from "@/lib/http/public-cors";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function POST(req: NextRequest) {
  if (!apiKeyOk(req)) return jsonCors({ ok: false, error: "unauthorized" }, 401);
  // §bezpieczeństwo Limit rozmiaru body (anty-abuse) — odrzucamy zawczasu zbyt duże payloady.
  const len = Number(req.headers.get("content-length") ?? "0");
  if (len > 32_768) return jsonCors({ ok: false, error: "Zgłoszenie zbyt duże." }, 413);
  let body: PublicInquiryInput;
  try {
    const text = await req.text();
    if (text.length > 32_768) return jsonCors({ ok: false, error: "Zgłoszenie zbyt duże." }, 413);
    body = JSON.parse(text) as PublicInquiryInput;
  } catch {
    return jsonCors({ ok: false, error: "Nieprawidłowy JSON." }, 400);
  }
  const res = await createPublicInquiry(body);
  if (!res.ok) return jsonCors({ ok: false, error: res.error }, 400);
  return jsonCors({ ok: true, id: res.id, message: "Dziękujemy! Zgłoszenie przyjęte — skontaktujemy się, aby potwierdzić i przesłać link do płatności." }, 201);
}
