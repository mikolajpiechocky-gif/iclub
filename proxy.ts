import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next.js 16: konwencja „proxy" (dawniej „middleware").
// Odświeża sesję Supabase i chroni trasy — patrz lib/supabase/proxy.ts.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Pomijamy zasoby statyczne, pliki (fonty, obrazy) oraz ikony/manifest PWA.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|fonts/|logo-iclub.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2)$).*)",
  ],
};
