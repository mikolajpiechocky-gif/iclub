import type { Metadata, Viewport } from "next";
import "./globals.css";

// Fonty (Manrope + Space Grotesk) są self-hostowane lokalnie: pliki .woff2 w
// public/fonts/, a @font-face w app/fonts.css (podpięte z globals.css).
// Świadomie NIE używamy next/font — pobiera on fonty w trakcie kompilacji, co
// blokuje build w środowisku offline. Lokalne pliki działają zawsze (też offline/PWA).

export const metadata: Metadata = {
  title: "iClub Management",
  description:
    "Wewnętrzny system operacyjny firmy wynajmującej dmuchane namioty imprezowe i sprzęt eventowy.",
  applicationName: "iClub",
  appleWebApp: {
    capable: true,
    title: "iClub",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#08090d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pl"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
