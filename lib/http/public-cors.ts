// CORS + prosta autoryzacja dla publicznych endpointów konfiguratora.
// Origin z env PUBLIC_CONFIGURATOR_ORIGIN (domena strony); domyślnie "*" (odczyt cennika/lead — niskie ryzyko).
// Opcjonalny klucz: gdy ustawisz PUBLIC_API_KEY, żądanie musi mieć nagłówek x-api-key.
import { NextRequest, NextResponse } from "next/server";

export function corsHeaders(): Record<string, string> {
  const origin = process.env.PUBLIC_CONFIGURATOR_ORIGIN || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-api-key",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function preflight(): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export function jsonCors(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: corsHeaders() });
}

// Klucz API wymagany tylko, gdy PUBLIC_API_KEY jest ustawiony (inaczej endpoint otwarty).
export function apiKeyOk(req: NextRequest): boolean {
  const key = process.env.PUBLIC_API_KEY;
  if (!key) return true;
  return req.headers.get("x-api-key") === key;
}
