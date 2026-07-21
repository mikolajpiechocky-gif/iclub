// Integracja OLX (Partner API) — wyłącznie po stronie serwera.
// OAuth authorization_code (autoryzacja konta właściciela) + odczyt wątków/wiadomości.
import { OLX_CLIENT_ID, OLX_CLIENT_SECRET, OLX_SCOPE, OLX_TOKEN_URL, OLX_AUTHORIZE_URL, OLX_API_BASE } from "./config";

export interface OlxToken {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

// URL zgody: właściciel konta OLX loguje się i autoryzuje aplikację.
export function buildAuthorizeUrl(redirectUri: string, state: string): string {
  const p = new URLSearchParams({
    client_id: String(OLX_CLIENT_ID),
    response_type: "code",
    scope: OLX_SCOPE,
    redirect_uri: redirectUri,
    state,
  });
  return `${OLX_AUTHORIZE_URL}?${p.toString()}`;
}

async function tokenRequest(body: Record<string, string>): Promise<OlxToken> {
  const res = await fetch(OLX_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.access_token) {
    throw new Error(json?.error_description || json?.error?.detail || json?.error || `OLX token error ${res.status}`);
  }
  return json as OlxToken;
}

export function exchangeCode(code: string, redirectUri: string): Promise<OlxToken> {
  return tokenRequest({
    grant_type: "authorization_code",
    client_id: String(OLX_CLIENT_ID),
    client_secret: String(OLX_CLIENT_SECRET),
    code,
    redirect_uri: redirectUri,
    scope: OLX_SCOPE,
  });
}

export function refreshAccessToken(refreshToken: string): Promise<OlxToken> {
  return tokenRequest({
    grant_type: "refresh_token",
    client_id: String(OLX_CLIENT_ID),
    client_secret: String(OLX_CLIENT_SECRET),
    refresh_token: refreshToken,
    scope: OLX_SCOPE,
  });
}

async function olxGet<T = unknown>(path: string, token: string): Promise<T> {
  const res = await fetch(`${OLX_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Version: "2.0", Accept: "application/json" },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error?.detail || json?.message || `OLX API ${res.status} (${path})`);
  return json as T;
}

// Tożsamość konta (do zapisania olx_user_id).
export const getMe = (token: string) => olxGet<Record<string, unknown>>("/users/me", token);
// Wątki (rozmowy) i wiadomości — z paginacją offset/limit.
export const getThreads = (token: string, offset = 0, limit = 100) =>
  olxGet<Record<string, unknown>>(`/threads?offset=${offset}&limit=${limit}`, token);
export const getMessages = (token: string, threadId: string, offset = 0, limit = 100) =>
  olxGet<Record<string, unknown>>(`/threads/${threadId}/messages?offset=${offset}&limit=${limit}`, token);
