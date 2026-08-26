import type { NextConfig } from "next";

// CSP w trybie RAPORTOWYM (Report-Only): NIC nie blokuje, tylko zgłasza naruszenia na
// /api/public/csp-report (→ tabela csp_reports). Po zebraniu danych i dostrojeniu listy
// przełączymy nagłówek na egzekwujący (Content-Security-Policy). Dopuszczone: własna domena,
// Google Maps (skrypty/kafelki/czcionki), Supabase (auth/API), obrazki data:/blob:.
// Wąska, dopasowana do faktycznego użycia: własna domena + inline (Next.js/Tailwind) + Supabase
// (auth, upload i zdjęcia realizacji ze Storage) + obrazki data:/blob:. Mapy Google są WYŁĄCZNIE
// serwerowe, więc nie ma tu żadnych domen Google.
const cspReportOnly = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "report-uri /api/public/csp-report",
].join("; ");

// Nagłówki bezpieczeństwa dla całej aplikacji.
const securityHeaders = [
  { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
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
