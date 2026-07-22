// Synchronizacja rozmów OLX → zapytania (leady). Idempotentna: dedup po olx_thread_id.
// Jeden wątek = jedno zapytanie. Mapowanie defensywne (nazwy pól OLX potwierdzimy po
// pierwszym imporcie na realnych danych).
import { createAdminClient } from "@/lib/supabase/admin";
import { getValidAccessToken, markOlxSynced } from "./olx";
import { getThreads, getMessages, getAdverts } from "@/lib/integrations/olx";
import { analyzeContractSignals, extractEmail } from "@/lib/domain/lead-analysis";

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

  // Lokalizacja leada = miasto ogłoszenia. Wątki OLX zwykle nie niosą pełnej lokalizacji,
  // więc budujemy mapę advert_id → { title, location } z listy ogłoszeń (best-effort).
  const locOf = (a: Record<string, unknown>): string | null =>
    (String(
      pick(a, "location", "city", "name") ??
        pick(a, "location", "city_name") ??
        pick(a, "location", "name") ??
        pick(a, "city", "name") ??
        pick(a, "city") ??
        "",
    ).trim() || null);
  const advInfo = new Map<string, { title: string | null; location: string | null }>();
  try {
    let aoff = 0;
    for (let ap = 0; ap < 20; ap++) {
      const ar = (await getAdverts(token, aoff, 100)) as Record<string, unknown>;
      const arr = ((ar?.data as unknown[]) ?? []) as Record<string, unknown>[];
      if (!arr.length) break;
      for (const a of arr) {
        const aid = String(pick(a, "id") ?? "");
        if (aid) advInfo.set(aid, { title: (pick(a, "title") as string) ?? null, location: locOf(a) });
      }
      if (arr.length < 100) break;
      aoff += arr.length;
    }
  } catch {
    /* brak dostępu do ogłoszeń — lokalizacja tylko z wątku (jeśli ją niesie) */
  }

  try {
    for (let page = 0; page < 50; page++) {
      const resp = (await getThreads(token, offset, 100)) as Record<string, unknown>;
      const threads = (resp?.data as unknown[]) ?? [];
      if (!threads.length) break;

      for (const th of threads as Record<string, unknown>[]) {
        const threadId = String(pick(th, "id") ?? "");
        if (!threadId) continue;

        // Pełna historia wiadomości wątku (do 5 stron po 100 — best-effort).
        const msgs: { text: string; at: string | null; mine: boolean }[] = [];
        try {
          let moff = 0;
          for (let mp = 0; mp < 5; mp++) {
            const mresp = (await getMessages(token, threadId, moff, 100)) as Record<string, unknown>;
            const arr = ((mresp?.data as unknown[]) ?? []) as Record<string, unknown>[];
            if (!arr.length) break;
            for (const m of arr) {
              const text = String(pick(m, "text") ?? pick(m, "message") ?? "").trim();
              const at = (pick(m, "created_at") ?? pick(m, "posted_at") ?? null) as string | null;
              const typ = String(pick(m, "type") ?? pick(m, "author_type") ?? "").toLowerCase();
              const mine = typ.includes("sent") || typ.includes("own") || typ.includes("outgoing") || Boolean(pick(m, "is_own"));
              if (text) msgs.push({ text, at, mine });
            }
            if (arr.length < 100) break;
            moff += arr.length;
          }
        } catch {
          /* wątek bez dostępnych wiadomości — pomijamy historię */
        }
        msgs.sort((a, b) => ((a.at ?? "") < (b.at ?? "") ? -1 : 1));

        const name = String(pick(th, "interlocutor", "name") ?? pick(th, "user", "name") ?? "Klient OLX");
        const advertId = String(pick(th, "advert", "id") ?? pick(th, "advert_id") ?? "");
        const advMap = advertId ? advInfo.get(advertId) : undefined;
        const advert = String(pick(th, "advert", "title") ?? pick(th, "advert_title") ?? advMap?.title ?? "");
        const advLoc = advMap?.location ?? locOf((pick(th, "advert") as Record<string, unknown>) ?? {});
        const lastAt = (pick(th, "updated_at") ?? pick(th, "last_message", "created_at") ?? null) as string | null;
        const convo = msgs.map((m) => m.text).join("\n");
        const email = String(pick(th, "interlocutor", "email") ?? pick(th, "user", "email") ?? extractEmail(convo) ?? "") || null;
        const lastMsg = msgs.length ? msgs[msgs.length - 1].text : null;
        const contractSignal = analyzeContractSignals(`${name}\n${advert}\n${convo}`).signal;
        const notes = [`OLX: ${name}`, advert && `Ogłoszenie: ${advert}`, lastMsg && `„${lastMsg}”`].filter(Boolean).join("\n");

        const { data: existing } = await s.from("inquiries").select("id, status, reactivation_count, location").eq("olx_thread_id", threadId).maybeSingle();
        const ex = existing as { id: string; status: string; reactivation_count: number; location: string | null } | null;

        // Dane z OLX (nick, mail, historia, sygnał) aktualizujemy zawsze — to nie są ręczne
        // dane CRM (status, klient, notatki), które pozostają nietknięte.
        const olxData: Record<string, unknown> = {
          contact_name: name,
          contact_email: email,
          olx_messages: msgs,
          contract_signal: contractSignal,
          olx_last_message: lastMsg,
          olx_last_message_at: lastAt,
          last_activity_at: new Date().toISOString(),
        };

        if (ex) {
          const patch = { ...olxData };
          // Lokalizację uzupełniamy tylko gdy pusta — nie kasujemy ręcznej edycji CRM.
          if (advLoc && !ex.location) patch.location = advLoc;
          if (ex.status === "LOST") {
            patch.status = "REHEATED";
            patch.previous_status = "LOST";
            patch.reactivation_count = (ex.reactivation_count ?? 0) + 1;
            patch.reactivated_at = new Date().toISOString();
          }
          await s.from("inquiries").update(patch).eq("id", ex.id);
          updated++;
        } else {
          await s.from("inquiries").insert({
            source: "OLX",
            status: "NEW",
            event_type: advert || null,
            location: advLoc,
            notes,
            olx_thread_id: threadId,
            ...olxData,
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
