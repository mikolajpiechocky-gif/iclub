// Reguły domenowe podpisu umowy kodem e-mail (forma dokumentowa, art. 77² k.c.).
// Kod = 6 cyfr z generatora kryptograficznego (NIE Math.random); w bazie tylko skrót.
import { randomInt, randomBytes, scryptSync, timingSafeEqual, createHash } from "crypto";
import { renderContract } from "./esign-contract-template";

// Decyzje biznesowe (§08): godzina montażu z pakietu, BLIK, termin zadatku.
export const ICLUB_BLIK = "571 029 526";
export const DEPOSIT_DUE_DEFAULT = "24 godziny od zawarcia umowy";
const DELIVERY_HOUR_BY_PACKAGE: Record<string, string> = { standard: "17:00", premium: "16:00", vip: "15:00" };
// Godzina montażu wg pakietu (Standard 17:00 / Premium 16:00 / VIP 15:00). null gdy nieznany.
export function deliveryHourForPackage(pkg: string | null | undefined): string | null {
  if (!pkg) return null;
  return DELIVERY_HOUR_BY_PACKAGE[pkg.trim().toLowerCase()] ?? null;
}

export const CODE_TTL_MIN = 15;          // ważność kodu
export const CODE_MAX_ATTEMPTS = 5;      // po tylu nieudanych próbach wymagany nowy kod
export const CODE_WINDOW_MIN = 10;       // okno rate-limit na żądanie kodu
export const CODE_MAX_PER_WINDOW = 3;    // maks. żądań kodu w oknie
export const TOKEN_TTL_DAYS = 14;        // token (adres umowy) ważny 14 dni

// 6-cyfrowy kod z CSPRNG.
export function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

// Token dostępu ≥32 bajty, URL-safe.
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

// Skrót kodu: scrypt z solą (bez dodatkowej zależności). Format: scrypt$<salt hex>$<hash hex>.
export function hashCode(code: string): string {
  const salt = randomBytes(16);
  const dk = scryptSync(code, salt, 32);
  return `scrypt$${salt.toString("hex")}$${dk.toString("hex")}`;
}

// Weryfikacja kodu w czasie stałym.
export function verifyCode(code: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  let salt: Buffer, expected: Buffer;
  try {
    salt = Buffer.from(parts[1], "hex");
    expected = Buffer.from(parts[2], "hex");
  } catch {
    return false;
  }
  const dk = scryptSync(code, salt, expected.length);
  return expected.length === dk.length && timingSafeEqual(expected, dk);
}

// Suma kontrolna migawki treści umowy.
export function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

// --- treść umowy (HTML) ---
// Renderowany z pełnego wzorca umowy (esign-contract-template): część indywidualna + wszystkie
// paragrafy w jednym dokumencie. Reszta (token/kod/dowód) niezależna.

const fmtPLN = (v: number | null | undefined) =>
  v == null ? "—" : new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(v);
const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "long", year: "numeric" }) : "—";

// Czytelna, pełna nazwa namiotu do umowy (klient ma wiedzieć co dostaje — nie kod „D").
export function tentContractLabel(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = v.trim();
  if (!s) return null;
  if (/\+/.test(s)) return s.split("+").map((x) => tentContractLabel(x.trim())).filter(Boolean).join(" + ");
  if (s === "M") return "Mały namiot iClub 5,4×5,4 m";
  if (s === "D") return "Duży namiot iClub 6×8 m";
  if (s === "D_BACKDOOR") return "Duży namiot iClub 6×8 m (drzwi z tyłu)";
  if (s === "GASTRO") return "Namiot gastronomiczny iClub";
  if (/5[.,]4/.test(s)) return "Mały namiot iClub 5,4×5,4 m";
  if (/6\s*[x×]\s*8/i.test(s)) return `Duży namiot iClub 6×8 m${/tył|back|drzw/i.test(s) ? " (drzwi z tyłu)" : ""}`;
  return s;
}

export interface EsignContractInput {
  orderNo?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  eventType?: string | null;
  eventDate?: string | null;
  location?: string | null;
  packageName?: string | null;
  tentName?: string | null;
  addonsNote?: string | null;
  packageItems?: { name: string; qty?: number }[]; // aktualny skład pakietu (§3.1)
  packagePrice?: number | null;
  addonsTotal?: number | null;
  transport?: number | null;
  discount?: number | null;
  amountTotal?: number | null;
  amountDeposit?: number | null;
  deliveryHour?: string | null;   // godzina montażu (decyzja: z pakietu lub sztywna)
  depositDue?: string | null;     // termin zapłaty zadatku
  blik?: string | null;           // numer do BLIK w dokumencie
}

// Zwraca kompletny dokument HTML umowy (migawka) z pełnego wzorca. Mapuje dane realizacji/leada
// na pola szablonu: nazwa namiotu (pełna), skład pakietu (aktualny), rozbicie ceny (§5).
export function buildEsignContractHtml(i: EsignContractInput): string {
  const remaining = i.amountTotal != null ? Math.max(0, i.amountTotal - (i.amountDeposit ?? 0)) : null;
  const name = (i.customerName ?? "").trim();
  const sp = name.indexOf(" ");
  const dodatki = (i.addonsNote ?? "").split(",").map((s) => s.trim()).filter(Boolean).map((n) => ({ nazwa_dodatku: n }));
  const pozycje_pakietu = (i.packageItems ?? []).map((it) => ({ pozycja: `${it.qty && it.qty > 1 ? `${it.qty} × ` : ""}${it.name}` }));
  return renderContract({
    numer_umowy: i.orderNo ?? null,
    data_zawarcia: null,
    imie: sp > 0 ? name.slice(0, sp) : name || null,
    nazwisko: sp > 0 ? name.slice(sp + 1) : null,
    email: i.customerEmail ?? null,
    pakiet: i.packageName ?? null,
    namiot: tentContractLabel(i.tentName),
    pozycje_pakietu,
    dodatki,
    data_imprezy: i.eventDate ? fmtDate(i.eventDate) : null,
    adres: i.location ?? null,
    godzina_dostawy: i.deliveryHour ?? null,
    cena_pakietu: i.packagePrice != null ? fmtPLN(i.packagePrice) : null,
    suma_dodatkow: i.addonsTotal != null ? fmtPLN(i.addonsTotal) : null,
    koszt_dojazdu: i.transport != null ? fmtPLN(i.transport) : null,
    rabat: i.discount != null && i.discount > 0 ? fmtPLN(i.discount) : null,
    cena_calkowita: i.amountTotal != null ? fmtPLN(i.amountTotal) : null,
    zadatek: i.amountDeposit != null ? fmtPLN(i.amountDeposit) : null,
    pozostalo: remaining != null ? fmtPLN(remaining) : null,
    termin_zadatku: i.depositDue ?? null,
    numer_blik: i.blik ?? null,
  });
}
