// Synchronizacja rozmów OLX → zapytania (leady). Idempotentna: dedup po olx_thread_id.
// Jeden wątek = jedno zapytanie. Wydobywanie pól ODPORNE (lib/integrations/olx/extract),
// bo realny JSON OLX bywa inny niż zakładany. Zapisujemy też surowy sample (olx_raw)
// do diagnostyki, gdyby nick/lokalizacja mimo to były puste.
import { createAdminClient } from "@/lib/supabase/admin";
import { getValidAccessToken, markOlxSynced, getOlxIntegration } from "./olx";
import { getThreads, getMessages, getAdverts, getMe } from "@/lib/integrations/olx";
import { analyzeConversation, extractEmail } from "@/lib/domain/lead-analysis";
import { sendPushToOwners } from "@/lib/integrations/push";
import {
  pick,
  extractName,
  extractEmailField,
  extractAdvertId,
  extractAdvertTitle,
  extractLocation,
  extractMessageText,
  extractMessageTime,
  extractMessageAuthorId,
  messageTypeIsMine,
} from "@/lib/integrations/olx/extract";

export interface OlxSyncResult {
  ok: boolean;
  imported: number;
  updated: number;
  error?: string;
}

export async function syncOlxThreads(): Promise<OlxSyncResult> {
  const token = await getValidAccessToken();
  if (!token) return { ok: false, imported: 0, updated: 0, error: "OLX niepołączone — najpierw kliknij „Połącz OLX”." };

  const s = createAdminClient();
  let imported = 0;
  let updated = 0;
  let offset = 0;
  let firstError: string | null = null; // pierwszy błąd zapisu (np. brak migracji) — zgłaszamy zamiast cicho pomijać
  const newNames: string[] = [];    // nowe zapytania → push do szefów
  const closedNames: string[] = []; // leady, które właśnie wyglądają na domknięte → push

  // Własne id konta OLX — do rozpoznania kierunku wiadomości (moja vs klienta).
  let myId: string | null = null;
  try {
    const me = (await getMe(token)) as Record<string, unknown>;
    const id = pick(me, "data", "id") ?? pick(me, "id");
    myId = id != null ? String(id) : null;
  } catch {
    /* pobierzemy z zapisanej integracji */
  }
  if (!myId) {
    const it = await getOlxIntegration();
    myId = it?.olx_user_id ?? null;
  }

  // Mapa ogłoszeń: id → { title, location } z listy ogłoszeń (nić do lokalizacji leada).
  const advInfo = new Map<string, { title: string | null; location: string | null }>();
  try {
    let aoff = 0;
    for (let ap = 0; ap < 20; ap++) {
      const ar = (await getAdverts(token, aoff, 100)) as Record<string, unknown>;
      const arr = ((ar?.data as unknown[]) ?? []) as Record<string, unknown>[];
      if (!arr.length) break;
      for (const a of arr) {
        const aid = String(pick(a, "id") ?? "");
        if (aid) advInfo.set(aid, { title: extractAdvertTitle(a) ?? (pick(a, "title") as string) ?? null, location: extractLocation(a) });
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
        const rawMsgs: Record<string, unknown>[] = [];
        try {
          let moff = 0;
          for (let mp = 0; mp < 5; mp++) {
            const mresp = (await getMessages(token, threadId, moff, 100)) as Record<string, unknown>;
            const arr = ((mresp?.data as unknown[]) ?? []) as Record<string, unknown>[];
            if (!arr.length) break;
            rawMsgs.push(...arr);
            if (arr.length < 100) break;
            moff += arr.length;
          }
        } catch {
          /* wątek bez dostępnych wiadomości — pomijamy historię */
        }

        const msgs: { text: string; at: string | null; mine: boolean }[] = [];
        for (const m of rawMsgs) {
          const text = extractMessageText(m);
          if (!text) continue;
          const at = extractMessageTime(m);
          // Kierunek: najpierw po id autora vs własne id, potem po polu type.
          const authorId = extractMessageAuthorId(m);
          let mine: boolean;
          if (myId && authorId) mine = authorId === myId;
          else {
            const byType = messageTypeIsMine(m);
            mine = byType ?? false;
          }
          msgs.push({ text, at, mine });
        }
        msgs.sort((a, b) => ((a.at ?? "") < (b.at ?? "") ? -1 : 1));

        // Nick / mail rozmówcy (odporne wydobycie; mail też z treści klienta).
        const clientText = msgs.filter((m) => !m.mine).map((m) => m.text).join("\n");
        const name = extractName(th) ?? "Klient OLX";
        const email = extractEmailField(th) ?? extractEmail(clientText);

        // Ogłoszenie + lokalizacja (z mapy ogłoszeń, fallback z wątku).
        const advertId = extractAdvertId(th);
        const advMap = advertId ? advInfo.get(advertId) : undefined;
        const advert = extractAdvertTitle(th) ?? advMap?.title ?? "";
        const advLoc = advMap?.location ?? extractLocation(th);

        // Analiza całej rozmowy — czy oferta faktycznie domknięta.
        const analysis = analyzeConversation(msgs, `${name}\n${advert}`);
        const lastMsg = msgs.length ? msgs[msgs.length - 1].text : null;
        const lastAt = msgs.length ? msgs[msgs.length - 1].at : (pick(th, "updated_at") ?? null) as string | null;
        const notes = [`OLX: ${name}`, advert && `Ogłoszenie: ${advert}`, advLoc && `Lokalizacja: ${advLoc}`, lastMsg && `„${lastMsg}”`].filter(Boolean).join("\n");

        // Sample surowych danych do diagnostyki mapowania (ograniczony rozmiar).
        const olxRaw = { thread: th, messages: rawMsgs.slice(0, 4), me_id: myId };

        const { data: existing } = await s.from("inquiries").select("id, status, reactivation_count, location, contract_signal").eq("olx_thread_id", threadId).maybeSingle();
        const ex = existing as { id: string; status: string; reactivation_count: number; location: string | null; contract_signal: boolean } | null;

        // Dane z OLX (nick, mail, historia, sygnał) aktualizujemy zawsze — to nie są ręczne
        // dane CRM (status, klient, notatki), które pozostają nietknięte.
        const olxData: Record<string, unknown> = {
          contact_name: name,
          contact_email: email,
          olx_messages: msgs,
          contract_signal: analysis.signal,
          olx_last_message: lastMsg,
          olx_last_message_at: lastAt,
          olx_raw: olxRaw,
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
          const { error } = await s.from("inquiries").update(patch).eq("id", ex.id);
          if (error) { if (!firstError) firstError = error.message; }
          else { updated++; if (analysis.signal && !ex.contract_signal) closedNames.push(name); }
        } else {
          const { error } = await s.from("inquiries").insert({
            source: "OLX",
            status: "NEW",
            event_type: advert || null,
            location: advLoc,
            notes,
            olx_thread_id: threadId,
            ...olxData,
          });
          if (error) { if (!firstError) firstError = error.message; }
          else { imported++; newNames.push(name); if (analysis.signal) closedNames.push(name); }
        }
      }

      if (threads.length < 100) break;
      offset += threads.length;
    }

    await markOlxSynced();
    // Powiadomienia push dla szefów (nie blokują wyniku synchronizacji).
    try {
      if (newNames.length) {
        await sendPushToOwners({ title: newNames.length === 1 ? "Nowe zapytanie OLX" : `${newNames.length} nowych zapytań OLX`, body: newNames.slice(0, 3).join(", "), url: "/inquiries", tag: "olx-new" });
      }
      if (closedNames.length) {
        await sendPushToOwners({ title: "Lead wygląda na domknięty", body: closedNames.slice(0, 3).join(", "), url: "/inquiries?signal=1", tag: "olx-closed" });
      }
    } catch { /* push opcjonalny */ }
    if (firstError) return { ok: false, imported, updated, error: firstError };
    return { ok: true, imported, updated };
  } catch (e) {
    return { ok: false, imported, updated, error: e instanceof Error ? e.message : "Błąd synchronizacji OLX." };
  }
}
