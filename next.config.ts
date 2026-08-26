import type { NextConfig } from "next";

// Nagłówki bezpieczeństwa dla całej aplikacji. CSP celowo pominięte na tym etapie —
// wymaga osobnej, ostrożnej konfiguracji (Google Maps, style inline), by nic nie zepsuć.
const securityHeaders = [
  // Wymuś HTTPS w przeglądarce (po pierwszej wizycie).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // Zakaz osadzania w ramce (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // Brak zgadywania typu MIME.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Nie wysyłaj pełnego URL-a (z tokenami) do obcych domen.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Wyłącz nieużywane API przeglądarki.
  { key: "Permissions-Policy", value: "microphone=(), payment=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
