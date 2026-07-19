// Klient Supabase dla komponentów serwerowych, Server Actions i Route Handlers.
// Zarządza sesją przez ciasteczka (Next.js App Router).
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Wywołanie z Server Component — odświeżanie sesji obsłuży middleware.
        }
      },
    },
  });
}
