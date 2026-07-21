// GET /api/olx/connect — start autoryzacji OLX (tylko szef). Generuje state
// (cookie anty-CSRF) i przekierowuje na zgodę OLX z redirect_uri = /api/olx/callback.
import { NextRequest, NextResponse } from "next/server";
import { buildAuthorizeUrl } from "@/lib/integrations/olx";
import { isOlxConfigured } from "@/lib/integrations/olx/config";
import { getCurrentProfile } from "@/lib/data/profiles";

export async function GET(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (profile?.role !== "OWNER") return NextResponse.redirect(new URL("/settings", req.url));
  if (!isOlxConfigured()) return NextResponse.redirect(new URL("/settings?olx=misconfigured", req.url));

  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/olx/callback`;
  const state = crypto.randomUUID();

  const res = NextResponse.redirect(buildAuthorizeUrl(redirectUri, state));
  res.cookies.set("olx_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
  return res;
}
