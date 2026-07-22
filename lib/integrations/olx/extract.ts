// Odporne wydobywanie danych z odpowiedzi OLX Partner API. Nazwy pól OLX bywają
// różne/zagnieżdżone, więc zamiast sztywnej ścieżki szukamy wartości po LIŚCIE kandydatów
// kluczy, przeszukując strukturę wszerz (płytsze trafienie wygrywa). Dzięki temu nick
// i lokalizacja nie znikają, gdy realny JSON różni się od naszych założeń.

export const pick = (obj: unknown, ...keys: string[]): unknown => {
  let cur: unknown = obj;
  for (const k of keys) {
    if (cur && typeof cur === "object" && !Array.isArray(cur) && k in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[k];
    } else return undefined;
  }
  return cur;
};

const isStr = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const isNumLike = (v: unknown): boolean => typeof v === "number" || (isStr(v) && /^\d+$/.test(v.trim()));

// Przeszukanie wszerz (BFS): pierwsza wartość, której klucz pasuje i wartość spełnia accept.
// skipKeys — poddrzewa, w które NIE wchodzimy (np. "advert" przy szukaniu nicku rozmówcy).
function bfsFind(
  root: unknown,
  keyMatch: (k: string) => boolean,
  accept: (v: unknown) => boolean,
  opts: { maxDepth?: number; skipKeys?: string[] } = {},
): unknown {
  const maxDepth = opts.maxDepth ?? 6;
  const skip = new Set((opts.skipKeys ?? []).map((k) => k.toLowerCase()));
  const queue: { node: unknown; depth: number }[] = [{ node: root, depth: 0 }];
  while (queue.length) {
    const { node, depth } = queue.shift()!;
    if (!node || typeof node !== "object" || depth > maxDepth) continue;
    if (Array.isArray(node)) {
      for (const it of node) queue.push({ node: it, depth: depth + 1 });
      continue;
    }
    const rec = node as Record<string, unknown>;
    // Najpierw dopasowanie na bieżącym poziomie (BFS gwarantuje: płytsze wygrywa).
    for (const [k, v] of Object.entries(rec)) {
      if (skip.has(k.toLowerCase())) continue;
      if (keyMatch(k) && accept(v)) return v;
    }
    for (const [k, v] of Object.entries(rec)) {
      if (skip.has(k.toLowerCase())) continue;
      queue.push({ node: v, depth: depth + 1 });
    }
  }
  return undefined;
}

const keyIn = (...names: string[]) => {
  const set = new Set(names.map((n) => n.toLowerCase()));
  return (k: string) => set.has(k.toLowerCase());
};

// Nazwa/nick rozmówcy. Najpierw w obiekcie „rozmówcy", potem globalnie (z pominięciem
// poddrzewa ogłoszenia, żeby nie złapać nazwy powiązanej z ofertą zamiast osoby).
export function extractName(thread: unknown): string | null {
  const nameKeys = keyIn("name", "login", "nick", "nickname", "username", "user_name", "display_name", "displayname", "screen_name", "first_name", "firstname", "full_name");
  // Najpierw JEDNOZNACZNY rozmówca (nigdy nasze konto), potem szersze szukanie.
  const person =
    (pick(thread, "interlocutor") as unknown) ??
    (pick(thread, "buyer") as unknown) ??
    bfsFind(thread, keyIn("interlocutor", "buyer", "sender", "from", "author", "participant", "client", "correspondent", "person", "contact", "user"), (v) => typeof v === "object" && v != null, { maxDepth: 4, skipKeys: ["advert", "ad"] });
  const inPerson = person ? bfsFind(person, nameKeys, isStr, { maxDepth: 3 }) : undefined;
  if (isStr(inPerson)) return inPerson.trim();
  const global = bfsFind(thread, nameKeys, isStr, { maxDepth: 5, skipKeys: ["advert", "ad"] });
  return isStr(global) ? global.trim() : null;
}

// E-mail rozmówcy (jeśli API go zwraca w obiekcie osoby).
export function extractEmailField(thread: unknown): string | null {
  const person = bfsFind(thread, keyIn("interlocutor", "user", "buyer", "sender", "from", "author", "participant", "client", "contact"), (v) => typeof v === "object" && v != null, { maxDepth: 4, skipKeys: ["advert", "ad"] });
  const em = bfsFind(person ?? thread, keyIn("email", "e_mail", "mail"), isStr, { maxDepth: 3 });
  return isStr(em) ? em.trim() : null;
}

// Id rozmówcy (do rozpoznania kierunku wiadomości względem własnego user id).
export function extractInterlocutorId(thread: unknown): string | null {
  const person = bfsFind(thread, keyIn("interlocutor", "user", "buyer", "sender", "from", "author", "participant"), (v) => typeof v === "object" && v != null, { maxDepth: 4, skipKeys: ["advert", "ad"] });
  const id = person ? bfsFind(person, keyIn("id", "user_id", "uuid"), isNumLike, { maxDepth: 2 }) : undefined;
  return id != null ? String(id) : null;
}

// Id ogłoszenia powiązanego z wątkiem.
export function extractAdvertId(thread: unknown): string | null {
  const id = pick(thread, "advert", "id") ?? pick(thread, "advert_id") ?? pick(thread, "ad", "id") ?? pick(thread, "ad_id") ?? bfsFind(thread, keyIn("advert_id", "ad_id"), isNumLike, { maxDepth: 3 });
  return id != null && (typeof id === "string" || typeof id === "number") ? String(id) : null;
}

// Tytuł ogłoszenia z wątku (fallback, gdy mapa ogłoszeń nic nie da).
export function extractAdvertTitle(thread: unknown): string | null {
  const advert = pick(thread, "advert") ?? pick(thread, "ad");
  const t = advert ? bfsFind(advert, keyIn("title", "name", "subject"), isStr, { maxDepth: 3 }) : bfsFind(thread, keyIn("advert_title", "ad_title"), isStr, { maxDepth: 3 });
  return isStr(t) ? t.trim() : null;
}

// Miasto/lokalizacja ogłoszenia. Szukamy czytelnej NAZWY miasta w obiekcie location/city.
export function extractLocation(advertOrThread: unknown): string | null {
  const advert = pick(advertOrThread, "advert") ?? pick(advertOrThread, "ad") ?? advertOrThread;
  // Obiekt lokalizacji.
  const loc = bfsFind(advert, keyIn("location", "city", "town", "place", "region", "map"), (v) => v != null, { maxDepth: 4 });
  const readable = (node: unknown): string | null => {
    if (isStr(node)) return node.trim();
    if (node && typeof node === "object") {
      const nm = bfsFind(node, keyIn("name", "city_name", "cityname", "label", "text", "value"), isStr, { maxDepth: 3 });
      if (isStr(nm)) return nm.trim();
    }
    return null;
  };
  // Najpierw miasto, potem cokolwiek czytelnego z lokalizacji.
  const cityName = bfsFind(advert, keyIn("city_name", "cityname"), isStr, { maxDepth: 4 });
  if (isStr(cityName)) return cityName.trim();
  const cityObj = bfsFind(advert, keyIn("city"), (v) => v != null, { maxDepth: 4 });
  const fromCity = readable(cityObj);
  if (fromCity) return fromCity;
  return readable(loc);
}

// Pola wiadomości: treść, znacznik czasu, id autora (do kierunku).
export function extractMessageText(m: unknown): string {
  const t = bfsFind(m, keyIn("text", "message", "body", "content"), isStr, { maxDepth: 3 });
  return isStr(t) ? t.trim() : "";
}
export function extractMessageTime(m: unknown): string | null {
  const t = bfsFind(m, keyIn("created_at", "created_time", "posted_at", "created", "date", "time", "timestamp", "sent_at"), (v) => isStr(v) || typeof v === "number", { maxDepth: 3 });
  return t != null ? String(t) : null;
}
export function extractMessageAuthorId(m: unknown): string | null {
  const direct = pick(m, "user_id") ?? pick(m, "author_id") ?? pick(m, "sender_id") ?? pick(m, "from_id");
  if (isNumLike(direct)) return String(direct);
  const obj = bfsFind(m, keyIn("user", "author", "sender", "from"), (v) => typeof v === "object" && v != null, { maxDepth: 2 });
  const id = obj ? bfsFind(obj, keyIn("id", "user_id", "uuid"), isNumLike, { maxDepth: 2 }) : undefined;
  return id != null ? String(id) : null;
}
// Zapasowe rozpoznanie kierunku po polu type/is_own gdy nie mamy id.
export function messageTypeIsMine(m: unknown): boolean | null {
  if (pick(m, "is_own") === true || pick(m, "is_mine") === true || pick(m, "own") === true) return true;
  const typ = String(pick(m, "type") ?? pick(m, "author_type") ?? pick(m, "direction") ?? "").toLowerCase();
  if (!typ) return null;
  if (typ.includes("sent") || typ.includes("own") || typ.includes("outgoing") || typ.includes("out")) return true;
  if (typ.includes("received") || typ.includes("incoming") || typ.includes("in")) return false;
  return null;
}
