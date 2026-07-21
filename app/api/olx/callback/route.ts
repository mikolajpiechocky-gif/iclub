// GET /api/olx/callback — powrót z OLX. Weryfikuje state, wymienia code na token
// użytkownika i zapisuje (service_role). Tylko szef.
import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, getMe } from "@/lib/integrations/olx";
import { saveOlxTokens } from "@/lib/data/olx";
import { getCurrentProfile } from "@/lib/data/profiles";

export async function GET(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (profile?.role !== "OWNER") return NextResponse.redirect(new URL("/settings", req.url));

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get("olx_oauth_state")?.value;

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(new URL("/settings?olx=error", req.url));
  }

  const redirectUri = `${url.origin}/api/olx/callback`;
  try {
    const t = await exchangeCode(code, redirectUri);
    let olxUserId: string | null = null;
    try {
      const me = (await getMe(t.access_token)) as Record<string, unknown>;
      const id = (me?.data as Record<string, unknown> | undefined)?.id ?? me?.id;
      olxUserId = id != null ? String(id) : null;
    } catch {
      /* tożsamość opcjonalna */
    }
    await saveOlxTokens({ access_token: t.access_token, refresh_token: t.refresh_token, expires_in: t.expires_in, olx_user_id: olxUserId });

    const res = NextResponse.redirect(new URL("/settings?olx=connected", req.url));
    res.cookies.delete("olx_oauth_state");
    return res;
  } catch {
    return NextResponse.redirect(new URL("/settings?olx=error", req.url));
  }
}
