// Synchronizacja rozmów OLX → zapytania (leady). Idempotentna: dedup po olx_thread_id.
// Jeden wątek = jedno zapytanie. Mapowanie defensywne (nazwy pól OLX potwierdzimy po
// pierwszym imporcie na realnych danych).
import { createAdminClient } from "@/lib/supabase/admin";
import { getValidAccessToken, markOlxSynced } from "./olx";
import { getThreads, getMessages } from "@/lib/integrations/olx";

export interface OlxSyncResult {
  ok: boolean;
  imported: number;
  updated: number;
  error?: string;
}

const pick = (obj: unknown, ...keys: string[]): unknown => {
  let cur: unknown = obj;
  for (const k of keys) {
    if (cur && typeof cur === "object" && k in (cur as Record<string, unknown>)) cur = (cur as Record<string, unknown>)[k];
    else return undefined;
  }
  return cur;
};

export async function syncOlxThreads(): Promise<OlxSyncResult> {
  const token = await getValidAccessToken();
  if (!token) return { ok: false, imported: 0, updated: 0, error: "OLX niepołączone — najpierw kliknij „Połącz OLX”." };

  const s = createAdminClient();
  let imported = 0;
  let updated = 0;
  let offset = 0;

  try {
    for (let page = 0; page < 50; page++) {
      const resp = (await getThreads(token, offset, 100)) as Record<string, unknown>;
      const threads = (resp?.data as unknown[]) ?? [];
      if (!threads.length) break;

      for (const th of threads as Record<string, unknown>[]) {
        const threadId = String(pick(th, "id") ?? "");
        if (!threadId) continue;

        // Najnowsza wiadomość jako treść leada (best-effort).
        let msgText = "";
        try {
          const mresp = (await getMessages(token, threadId, 0, 1)) as Record<string, unknown>;
          const first = ((mresp?.data as unknown[]) ?? [])[0];
          msgText = String(pick(first, "text") ?? pick(first, "message") ?? "");
        } catch {
          /* pojedynczy wątek bez wiadomości — pomijamy treść */
        }

        const name = String(pick(th, "interlocutor", "name") ?? pick(th, "user", "name") ?? "Klient OLX");
        const advert = String(pick(th, "advert", "title") ?? pick(th, "advert_title") ?? "");
        const lastAt = (pick(th, "updated_at") ?? pick(th, "last_message", "created_at") ?? null) as string | null;
        const notes = [`OLX: ${name}`, advert && `Ogłoszenie: ${advert}`, msgText && `„${msgText}”`].filter(Boolean).join("\n");

        const { data: existing } = await s.from("inquiries").select("id").eq("olx_thread_id", threadId).maybeSingle();
        if (existing) {
          await s.from("inquiries").update({ notes, olx_last_message_at: lastAt }).eq("id", (existing as { id: string }).id);
          updated++;
        } else {
          await s.from("inquiries").insert({
            source: "OLX",
            status: "NEW",
            event_type: advert || null,
            notes,
            olx_thread_id: threadId,
            olx_last_message_at: lastAt,
          });
          imported++;
        }
      }

      if (threads.length < 100) break;
      offset += threads.length;
    }

    await markOlxSynced();
    return { ok: true, imported, updated };
  } catch (e) {
    return { ok: false, imported, updated, error: e instanceof Error ? e.message : "Błąd synchronizacji OLX." };
  }
}
