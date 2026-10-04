// Porównanie sekretów w stałym czasie (odporne na timing attack). Serwerowe.
import { timingSafeEqual } from "crypto";

export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (a == null || b == null) return false;
  const ba = Buffer.from(String(a), "utf8");
  const bb = Buffer.from(String(b), "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

// Autoryzacja crona: nagłówek Authorization == "Bearer <którykolwiek sekret>", porównanie stałoczasowe.
export function cronAuthorized(authHeader: string | null, secrets: (string | undefined)[]): boolean {
  const valid = secrets.filter(Boolean) as string[];
  return valid.some((s) => safeEqual(authHeader, `Bearer ${s}`));
}
