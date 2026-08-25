// Reguły domenowe podpisu umowy kodem e-mail (forma dokumentowa, art. 77² k.c.).
// Kod = 6 cyfr z generatora kryptograficznego (NIE Math.random); w bazie tylko skrót.
import { randomInt, randomBytes, scryptSync, timingSafeEqual, createHash } from "crypto";

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
// UWAGA: to układ tymczasowy do czasu wgrania szablonu docs/umowa-szablon.md ze strony.
// Gdy szablon dojdzie, podmieniamy TEN builder — reszta (token/kod/dowód) zostaje.

const esc = (s: unknown): string =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
const fmtPLN = (v: number | null | undefined) =>
  v == null ? "—" : new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(v);
const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "long", year: "numeric" }) : "—";

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
  amountTotal?: number | null;
  amountDeposit?: number | null;
  deliveryHour?: string | null;   // godzina montażu (decyzja: z pakietu lub sztywna)
  depositDue?: string | null;     // termin zapłaty zadatku
  blik?: string | null;           // numer do BLIK w dokumencie
}

// Zwraca kompletny dokument HTML umowy (migawka). Zawiera wymagane prawnie elementy:
// pełna treść przed kodem + informacja o braku prawa odstąpienia (art. 38 pkt 12).
export function buildEsignContractHtml(i: EsignContractInput): string {
  const remaining = i.amountTotal != null ? Math.max(0, i.amountTotal - (i.amountDeposit ?? 0)) : null;
  const rows: [string, string][] = [
    ["Numer zamówienia", esc(i.orderNo || "—")],
    ["Najemca", esc(i.customerName || "—")],
    ["E-mail", esc(i.customerEmail || "—")],
    ["Rodzaj imprezy", esc(i.eventType || "—")],
    ["Data wydarzenia", esc(fmtDate(i.eventDate))],
    ["Godzina montażu", esc(i.deliveryHour || "—")],
    ["Lokalizacja", esc(i.location || "—")],
    ["Namiot", esc(i.tentName || "—")],
    ["Pakiet", esc(i.packageName || "—")],
    ["Dodatki", esc(i.addonsNote || "brak")],
    ["Wartość umowy (brutto)", esc(fmtPLN(i.amountTotal))],
    ["Zadatek", esc(fmtPLN(i.amountDeposit))],
    ["Pozostało do zapłaty", esc(fmtPLN(remaining))],
    ["Termin zapłaty zadatku", esc(i.depositDue || "—")],
  ];
  const table = rows.map(([k, v]) => `<tr><th style="text-align:left;padding:4px 12px 4px 0;color:#555;font-weight:600;vertical-align:top">${k}</th><td style="padding:4px 0">${v}</td></tr>`).join("");
  return `<!-- SZABLON TYMCZASOWY — do podmiany na docs/umowa-szablon.md -->
<section>
  <h1 style="font-size:20px;margin:0 0 4px">Umowa najmu — iClub</h1>
  <p style="color:#555;margin:0 0 16px">Wynajmujący: iClub, baza: Południowa 9, Dopiewo.</p>
  <table style="border-collapse:collapse;font-size:14px;width:100%">${table}</table>
  <h2 style="font-size:15px;margin:20px 0 6px">Warunki</h2>
  <p style="font-size:13px;color:#444;line-height:1.6">Usługa obejmuje transport, montaż, obsługę techniczną i demontaż zgodnie z ustaleniami. Najemca użytkuje sprzęt zgodnie z przeznaczeniem i ponosi odpowiedzialność za powierzony sprzęt od chwili przekazania do odbioru. Rozliczenie i szczegóły — zgodnie z Regulaminem iClub.</p>
  <p style="font-size:13px;color:#8a1f1f;font-weight:600;line-height:1.6;margin-top:12px">Informacja o braku prawa odstąpienia: usługa jest ściśle związana z oznaczonym terminem, dlatego zgodnie z art. 38 ust. 1 pkt 12 ustawy o prawach konsumenta Najemcy będącemu konsumentem nie przysługuje prawo odstąpienia od umowy.</p>
</section>`;
}
