// Odświeżanie sesji Supabase + ochrona tras w middleware.
// W TRYBIE DEMO (brak konfiguracji) nie wymuszamy logowania — aplikacja
// działa dalej na danych demonstracyjnych.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "./config";

// Ścieżki dostępne bez logowania.
const PUBLIC_PATHS = ["/login", "/auth"];
// Endpointy z WŁASNĄ autoryzacją (sekret crona w handlerze) — proxy nie może ich
// przekierowywać na /login, bo cron nie ma sesji. Bezpieczeństwo pilnuje sam handler.
const SELF_AUTH_PATHS = ["/api/olx/sync", "/api/notifications/sweep"];

function isPublic(path: string): boolean {
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/")) || SELF_AUTH_PATHS.includes(path);
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Tryb demo — brak Supabase: przepuszczamy wszystko.
  if (!isSupabaseConfigured()) return response;

  const supabase = createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // WAŻNE: getUser() odświeża token i weryfikuje sesję po stronie serwera.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Niezalogowany na chronionej trasie → logowanie.
  if (!user && !isPublic(path)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Zalogowany wchodzi na /login → pulpit.
  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}
