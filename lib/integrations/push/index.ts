// Wysyłka powiadomień Web Push (server-only). VAPID z env. Respektuje ciszę nocną
// i sprząta martwe subskrypcje (404/410). Bez kluczy VAPID = cicho nieaktywne.
import webpush from "web-push";
import { listSubscriptionsForUsers, listOwnerUserIds, listEmployeeUserIds, pruneDeadSubscriptions } from "@/lib/data/push";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

let ready = false;
function ensureConfigured(): boolean {
  if (ready) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:daneiclub@gmail.com";
  if (!pub || !priv) return false;
  webpush.setVapidDetails(subject, pub, priv);
  ready = true;
  return true;
}

// Bieżąca godzina (0–23) w strefie Europe/Warsaw.
function warsawHour(): number {
  const s = new Date().toLocaleString("en-GB", { timeZone: "Europe/Warsaw", hour: "2-digit", hour12: false });
  const h = parseInt(s.slice(0, 2), 10);
  return Number.isFinite(h) ? h % 24 : 12;
}

// Cisza nocna: [from, to). Obsługa przekroczenia północy (np. 22→7).
function inQuietHours(hour: number, from: number | null, to: number | null): boolean {
  if (from == null || to == null || from === to) return false;
  return from < to ? hour >= from && hour < to : hour >= from || hour < to;
}

export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) return;
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return;
  const subs = await listSubscriptionsForUsers(ids);
  if (!subs.length) return;
  const hour = warsawHour();
  const body = JSON.stringify(payload);
  const dead: string[] = [];
  await Promise.all(
    subs.map(async (s) => {
      if (inQuietHours(hour, s.quiet_from, s.quiet_to)) return;
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body);
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) dead.push(s.endpoint);
      }
    }),
  );
  if (dead.length) await pruneDeadSubscriptions(dead);
}

// §diagnostyka Test z pełnym wynikiem: czy VAPID skonfigurowane, ile subskrypcji, ile wysłano,
// jakie błędy (kod HTTP). Omija ciszę nocną. Pozwala od ręki zobaczyć, DLACZEGO push nie dochodzi.
export interface PushDiag { configured: boolean; subs: number; sent: number; failed: (number | string)[] }
export async function sendTestDiagnostic(userId: string): Promise<PushDiag> {
  if (!ensureConfigured()) return { configured: false, subs: 0, sent: 0, failed: [] };
  const subs = await listSubscriptionsForUsers([userId]);
  const body = JSON.stringify({ title: "iClub", body: "Powiadomienia działają ✅", url: "/notifications", tag: "test" });
  let sent = 0;
  const failed: (number | string)[] = [];
  const dead: string[] = [];
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body);
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode ?? (e instanceof Error ? e.message.slice(0, 80) : "?");
      failed.push(code);
      if (code === 404 || code === 410) dead.push(s.endpoint);
    }
  }
  if (dead.length) await pruneDeadSubscriptions(dead);
  return { configured: true, subs: subs.length, sent, failed };
}

export async function sendPushToOwners(payload: PushPayload): Promise<void> {
  return sendPushToUsers(await listOwnerUserIds(), payload);
}

export async function sendPushToEmployees(payload: PushPayload): Promise<void> {
  return sendPushToUsers(await listEmployeeUserIds(), payload);
}

// „Odpal i zapomnij" — powiadomienie nie może wywrócić głównej akcji.
export function firePush(p: Promise<unknown>): void {
  void Promise.resolve(p).catch((e) => console.error("push send failed:", e));
}
