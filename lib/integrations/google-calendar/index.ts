// Integracja Google Calendar (§53) — konto usługi, wyłącznie po stronie serwera.
// Uwierzytelnianie: podpisany JWT (RS256, Node crypto) → access token (bez
// dodatkowych bibliotek). Bez kompletu env zwraca null/false (graceful).
import crypto from "node:crypto";
import { GCAL_CLIENT_EMAIL, GCAL_PRIVATE_KEY, GCAL_CALENDAR_ID, isGoogleCalendarConfigured } from "./config";

let cached: { token: string; exp: number } | null = null;

function b64url(input: crypto.BinaryLike): string {
  return Buffer.from(input as Buffer | string).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getAccessToken(): Promise<string | null> {
  if (!isGoogleCalendarConfigured()) return null;
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp > now + 60) return cached.token;
  try {
    const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const claims = b64url(JSON.stringify({
      iss: GCAL_CLIENT_EMAIL,
      scope: "https://www.googleapis.com/auth/calendar",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }));
    const signingInput = `${header}.${claims}`;
    const signature = b64url(crypto.sign("RSA-SHA256", Buffer.from(signingInput), GCAL_PRIVATE_KEY!));
    const jwt = `${signingInput}.${signature}`;

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.access_token) return null;
    cached = { token: json.access_token, exp: now + (json.expires_in ?? 3600) };
    return cached.token;
  } catch {
    return null;
  }
}

// Data całodniowa ({date}) albo z godziną ({dateTime, timeZone}).
export type CalDate = { date: string } | { dateTime: string; timeZone: string };

export interface CalendarEvent {
  summary: string;
  description?: string;
  location?: string;
  colorId?: string; // kolor Google Calendar (np. "3" Winogrono, "4" Flaming, "2" Szałwia)
  start: CalDate;
  end: CalDate;
}

function eventBody(e: CalendarEvent): Record<string, unknown> {
  const body: Record<string, unknown> = {
    summary: e.summary,
    description: e.description ?? "",
    location: e.location ?? "",
    start: e.start,
    end: e.end,
  };
  if (e.colorId) body.colorId = e.colorId;
  return body;
}

const eventsUrl = () => `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(GCAL_CALENDAR_ID!)}/events`;

// Zwraca id utworzonego wydarzenia lub null.
export async function createCalendarEvent(e: CalendarEvent): Promise<string | null> {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    const res = await fetch(eventsUrl(), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(eventBody(e)),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.id ?? null;
  } catch {
    return null;
  }
}

// "ok" — zaktualizowano; "gone" — wydarzenie skasowane w kalendarzu (utwórz na
// nowo); "error" — błąd przejściowy/brak tokenu (NIE twórz nowego, żeby nie
// zdublować — ponowimy przy następnej edycji).
export type UpdateResult = "ok" | "gone" | "error";

export async function updateCalendarEvent(eventId: string, e: CalendarEvent): Promise<UpdateResult> {
  const token = await getAccessToken();
  if (!token) return "error";
  try {
    const res = await fetch(`${eventsUrl()}/${encodeURIComponent(eventId)}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(eventBody(e)),
    });
    if (res.ok) return "ok";
    if (res.status === 404 || res.status === 410) return "gone";
    return "error";
  } catch {
    return "error";
  }
}

export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;
  try {
    const res = await fetch(`${eventsUrl()}/${encodeURIComponent(eventId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok || res.status === 410; // 410 = już usunięte
  } catch {
    return false;
  }
}
