// Warstwa danych: podpis umowy kodem e-mail (forma dokumentowa). Cała mechanika bezpieczeństwa
// (token, kod, rate-limit, dowód) w jednym miejscu. Dostęp przez service_role — autoryzację
// pilnują handlery: wewnętrzne (owner z sesji), publiczne (token + kod).
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { sendPushToOwners } from "@/lib/integrations/push";
import { sendEmail, isEmailConfigured } from "@/lib/integrations/email";
import { getJob } from "@/lib/data/jobs";
import { getCustomer } from "@/lib/data/customers";
import { listAddons } from "@/lib/data/resources";
import {
  generateToken, generateCode, hashCode, verifyCode, sha256, buildEsignContractHtml,
  deliveryHourForPackage, ICLUB_BLIK, DEPOSIT_DUE_DEFAULT,
  CODE_TTL_MIN, CODE_MAX_ATTEMPTS, CODE_WINDOW_MIN, CODE_MAX_PER_WINDOW, TOKEN_TTL_DAYS,
} from "@/lib/domain/esign";

const numOrNull = (v: unknown): number | null => { if (v == null) return null; const n = Number(v); return Number.isFinite(n) ? n : null; };

const REGULAMIN_VERSION = process.env.REGULAMIN_VERSION || "2026-08";
const APP_BASE_URL = (process.env.APP_BASE_URL || "https://app.iclubevents.pl").replace(/\/$/, "");

const min = (n: number) => n * 60 * 1000;
const nowIso = () => new Date().toISOString();

export type EsignStatus = "draft" | "sent" | "signed" | "expired" | "cancelled";

export interface EsignRow {
  id: string; inquiry_id: string | null; order_no: string | null; status: EsignStatus;
  document_html: string | null; document_sha256: string | null; regulamin_version: string | null;
  signer_email: string | null; delivery_hour: string | null; deposit_due: string | null;
  amount_total: number | null; amount_deposit: number | null;
  access_token: string; token_expires_at: string | null;
  code_hash: string | null; code_expires_at: string | null; code_attempts: number;
  code_sent_at: string | null; code_send_count: number; code_window_start: string | null;
  signed_at: string | null; signer_ip: string | null; signer_user_agent: string | null;
  regulamin_accepted: boolean | null; mail_message_id: string | null;
}

// Wynik z kodem HTTP dla handlerów publicznych.
export interface OpResult { ok: boolean; error?: string; httpStatus?: number; signedAt?: string; }

// ---- tworzenie umowy pod ZLECENIEM (wewnętrzne, owner) ----
// Dane ciągniemy ze zlecenia i rezerwacji; wartości domyślne wg decyzji §08:
// godzina montażu z pakietu, zadatek 24h, BLIK 571 029 526, kwoty z rezerwacji.
export interface CreateEsignInput {
  jobId: string;
  deliveryHour?: string | null;   // override; domyślnie z pakietu
  depositDue?: string | null;     // override; domyślnie 24h
  amountTotal?: number | null;    // override; domyślnie cena rezerwacji
  amountDeposit?: number | null;  // override; domyślnie zadatek rezerwacji
  blik?: string | null;           // override; domyślnie ICLUB_BLIK
  orderNo?: string | null;
}

export async function createEsignContract(input: CreateEsignInput, createdBy: string | null): Promise<{ ok: boolean; id?: string; token?: string; error?: string }> {
  if (!isServiceRoleConfigured()) return { ok: false, error: "Brak konfiguracji serwera." };
  const job = await getJob(input.jobId);
  if (!job) return { ok: false, error: "Nie znaleziono zlecenia." };
  if (job.business_line !== "ICLUB") return { ok: false, error: "Umowa dotyczy zleceń iClub." };
  const r = job.reservation;
  const customer = r?.customer_id ? await getCustomer(r.customer_id) : null;
  const addons = await listAddons();
  const addonNames = (r?.addon_ids ?? []).map((id) => addons.find((a) => a.id === id)?.name).filter((n): n is string => Boolean(n)).join(", ");

  const pkgName = r?.package?.name ?? null;
  const deliveryHour = input.deliveryHour ?? deliveryHourForPackage(pkgName);
  const amountTotal = input.amountTotal ?? numOrNull(r?.price);
  const amountDeposit = input.amountDeposit ?? numOrNull(r?.deposit);
  const depositDue = input.depositDue ?? DEPOSIT_DUE_DEFAULT;
  const blik = input.blik ?? ICLUB_BLIK;
  const signerEmail = customer?.email ?? null;
  const orderNo = input.orderNo || `IC-${new Date().getFullYear()}-${Math.abs(hashStr(String(job.id))) % 9000 + 1000}`;

  const html = buildEsignContractHtml({
    orderNo,
    customerName: customer?.name ?? r?.customer?.name ?? null,
    customerEmail: signerEmail,
    eventType: r?.event_type ?? null,
    eventDate: r?.event_date ?? null,
    location: r?.location ?? null,
    packageName: pkgName,
    tentName: r?.tent?.name ?? null,
    addonsNote: addonNames || null,
    amountTotal, amountDeposit, deliveryHour, depositDue, blik,
  });

  const s = createAdminClient();
  const { data, error } = await s.from("esign_contracts").insert({
    job_id: job.id,
    reservation_id: r?.id ?? null,
    inquiry_id: (r as { inquiry_id?: string | null } | null)?.inquiry_id ?? null,
    order_no: orderNo,
    status: "draft",
    document_html: html,          // migawka wstępna; zamrażamy przy /send
    signer_email: signerEmail,
    delivery_hour: deliveryHour,
    deposit_due: depositDue,
    amount_total: amountTotal,
    amount_deposit: amountDeposit,
    access_token: generateToken(),
    created_by: createdBy,
  }).select("id, access_token").single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: (data as { id: string }).id, token: (data as { access_token: string }).access_token };
}

// ---- tworzenie umowy Z ZAPYTANIA (lead z konfiguratora; jeszcze bez zlecenia) ----
export interface CreateEsignFromInquiryInput {
  inquiryId: string;
  amountTotal?: number | null;
  amountDeposit?: number | null;
  deliveryHour?: string | null;
  depositDue?: string | null;
}

export async function createEsignFromInquiry(input: CreateEsignFromInquiryInput, createdBy: string | null): Promise<{ ok: boolean; id?: string; token?: string; error?: string }> {
  if (!isServiceRoleConfigured()) return { ok: false, error: "Brak konfiguracji serwera." };
  const s = createAdminClient();
  const { data: inq } = await s.from("inquiries").select("*").eq("id", input.inquiryId).maybeSingle();
  if (!inq) return { ok: false, error: "Nie znaleziono zapytania." };
  const q = inq as Record<string, unknown>;

  const pkg = (q.package_interest as string) || null;
  const deliveryHour = input.deliveryHour ?? deliveryHourForPackage(pkg);
  const depositDue = input.depositDue ?? DEPOSIT_DUE_DEFAULT;
  const signerEmail = (q.contact_email as string) || null;
  const orderNo = `IC-${new Date().getFullYear()}-${Math.abs(hashStr(String(q.id))) % 9000 + 1000}`;

  const html = buildEsignContractHtml({
    orderNo,
    customerName: (q.contact_name as string) || null,
    customerEmail: signerEmail,
    eventType: (q.event_type as string) || null,
    eventDate: (q.event_date as string) || null,
    location: (q.location as string) || null,
    packageName: pkg,
    tentName: (q.tent_interest as string) || null,
    addonsNote: (q.addons_note as string) || null,
    amountTotal: input.amountTotal ?? null,
    amountDeposit: input.amountDeposit ?? null,
    deliveryHour, depositDue, blik: ICLUB_BLIK,
  });

  const { data, error } = await s.from("esign_contracts").insert({
    inquiry_id: input.inquiryId,
    order_no: orderNo,
    status: "draft",
    document_html: html,
    signer_email: signerEmail,
    delivery_hour: deliveryHour,
    deposit_due: depositDue,
    amount_total: input.amountTotal ?? null,
    amount_deposit: input.amountDeposit ?? null,
    access_token: generateToken(),
    created_by: createdBy,
  }).select("id, access_token").single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: (data as { id: string }).id, token: (data as { access_token: string }).access_token };
}

// Ostatnia umowa powiązana z danym zapytaniem (do panelu leada).
export async function getEsignByInquiry(inquiryId: string): Promise<EsignRow | null> {
  if (!isServiceRoleConfigured()) return null;
  const s = createAdminClient();
  const { data } = await s.from("esign_contracts").select("*").eq("inquiry_id", inquiryId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return (data as EsignRow) ?? null;
}

// Ostatnia umowa powiązana ze zleceniem (do panelu na rezerwacji).
export async function getEsignByJob(jobId: string): Promise<EsignRow | null> {
  if (!isServiceRoleConfigured()) return null;
  const s = createAdminClient();
  const { data } = await s.from("esign_contracts").select("*").eq("job_id", jobId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return (data as EsignRow) ?? null;
}

// ---- wysyłka umowy do podpisu (wewnętrzne, owner) ----
// Zamraża treść + sumę kontrolną, ustawia status sent + ważność tokenu, wysyła mail z linkiem (BEZ kodu).
export async function sendEsignContract(id: string): Promise<{ ok: boolean; error?: string; emailSkipped?: boolean; link?: string }> {
  if (!isServiceRoleConfigured()) return { ok: false, error: "Brak konfiguracji serwera." };
  const s = createAdminClient();
  const { data: row } = await s.from("esign_contracts").select("*").eq("id", id).maybeSingle();
  if (!row) return { ok: false, error: "Nie znaleziono umowy." };
  const c = row as EsignRow;
  if (c.status === "signed") return { ok: false, error: "Umowa już zawarta." };

  const html = c.document_html || "";
  const link = `${APP_BASE_URL}/umowa/${c.access_token}`;
  const { error } = await s.from("esign_contracts").update({
    status: "sent",
    document_html: html,
    document_sha256: sha256(html),         // zamrożona suma kontrolna
    regulamin_version: REGULAMIN_VERSION,
    token_expires_at: new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
  }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  let emailSkipped = false;
  if (c.signer_email) {
    const r = await sendEmail({
      to: c.signer_email,
      subject: `Umowa do podpisu — iClub ${c.order_no ?? ""}`.trim(),
      html: `<p>Dzień dobry,</p><p>przygotowaliśmy umowę do podpisu dla zamówienia <b>${c.order_no ?? ""}</b>.</p>
        <p><a href="${link}">Otwórz umowę i podpisz</a></p>
        <p>Po otwarciu zobaczysz pełną treść umowy i poprosisz o jednorazowy kod. Link ważny ${TOKEN_TTL_DAYS} dni.</p>
        <p>iClub</p>`,
    });
    emailSkipped = Boolean(r.skipped);
    if (r.ok && r.messageId) await s.from("esign_contracts").update({ mail_message_id: r.messageId }).eq("id", id);
  } else {
    emailSkipped = true;
  }
  return { ok: true, emailSkipped, link };
}

// ---- publiczny odczyt umowy po tokenie ----
export async function getEsignByToken(token: string): Promise<EsignRow | null> {
  if (!isServiceRoleConfigured()) return null;
  const s = createAdminClient();
  const { data } = await s.from("esign_contracts").select("*").eq("access_token", token).maybeSingle();
  return (data as EsignRow) ?? null;
}

// ---- żądanie kodu (publiczne) ----
export async function requestEsignCode(token: string): Promise<OpResult> {
  if (!isServiceRoleConfigured()) return { ok: false, error: "server_unconfigured", httpStatus: 503 };
  const s = createAdminClient();
  const { data: row } = await s.from("esign_contracts").select("*").eq("access_token", token).maybeSingle();
  if (!row) return { ok: false, error: "not_found", httpStatus: 404 };
  const c = row as EsignRow;
  if (c.status === "signed") return { ok: false, error: "already_signed", httpStatus: 409 };
  if (c.status !== "sent") return { ok: false, error: "not_available", httpStatus: 409 };
  if (c.token_expires_at && c.token_expires_at < nowIso()) return { ok: false, error: "token_expired", httpStatus: 410 };

  // rate-limit: maks. CODE_MAX_PER_WINDOW żądań w oknie CODE_WINDOW_MIN (per token).
  const now = Date.now();
  let windowStart = c.code_window_start ? new Date(c.code_window_start).getTime() : 0;
  let count = c.code_send_count ?? 0;
  if (!windowStart || now - windowStart > min(CODE_WINDOW_MIN)) { windowStart = now; count = 0; }
  if (count >= CODE_MAX_PER_WINDOW) return { ok: false, error: "too_many_requests", httpStatus: 429 };

  if (!isEmailConfigured()) return { ok: false, error: "email_not_configured", httpStatus: 503 };

  const code = generateCode();
  const r = await sendEmail({
    to: c.signer_email || "",
    subject: `Twój kod do podpisu: ${code}`,
    html: `<p>Kod do podpisu umowy iClub ${c.order_no ?? ""}: <b style="font-size:20px">${code}</b></p><p>Ważny ${CODE_TTL_MIN} minut. Jeśli to nie Ty prosiłeś o kod — zignoruj tę wiadomość.</p>`,
  });
  if (!r.ok) return { ok: false, error: "email_send_failed", httpStatus: 502 };

  const { error } = await s.from("esign_contracts").update({
    code_hash: hashCode(code),
    code_expires_at: new Date(now + min(CODE_TTL_MIN)).toISOString(),
    code_attempts: 0,
    code_sent_at: new Date(now).toISOString(),
    code_send_count: count + 1,
    code_window_start: new Date(windowStart).toISOString(),
  }).eq("id", c.id);
  if (error) return { ok: false, error: "db_error", httpStatus: 500 };
  return { ok: true };
}

// ---- podpis = zawarcie umowy (publiczne) ----
export async function signEsignContract(
  token: string, code: string, regulaminAccepted: boolean, ip: string | null, userAgent: string | null,
): Promise<OpResult> {
  if (!isServiceRoleConfigured()) return { ok: false, error: "server_unconfigured", httpStatus: 503 };
  const s = createAdminClient();
  const { data: row } = await s.from("esign_contracts").select("*").eq("access_token", token).maybeSingle();
  if (!row) return { ok: false, error: "not_found", httpStatus: 404 };
  const c = row as EsignRow;

  if (c.status === "signed") return { ok: false, error: "already_signed", httpStatus: 409 };
  if (c.status !== "sent") return { ok: false, error: "not_available", httpStatus: 409 };
  if (c.token_expires_at && c.token_expires_at < nowIso()) return { ok: false, error: "token_expired", httpStatus: 410 };
  if (!regulaminAccepted) return { ok: false, error: "regulamin_required", httpStatus: 400 };
  if (!c.code_hash || !c.code_expires_at || c.code_expires_at < nowIso()) return { ok: false, error: "code_expired", httpStatus: 410 };
  if ((c.code_attempts ?? 0) >= CODE_MAX_ATTEMPTS) return { ok: false, error: "too_many_attempts", httpStatus: 429 };

  if (!verifyCode(String(code || ""), c.code_hash)) {
    const attempts = (c.code_attempts ?? 0) + 1;
    await s.from("esign_contracts").update({ code_attempts: attempts }).eq("id", c.id);
    if (attempts >= CODE_MAX_ATTEMPTS) return { ok: false, error: "too_many_attempts", httpStatus: 429 };
    return { ok: false, error: "invalid_code", httpStatus: 401 };
  }

  const signedAt = nowIso();
  const { error } = await s.from("esign_contracts").update({
    status: "signed",
    signed_at: signedAt,
    signer_ip: ip,
    signer_user_agent: userAgent,
    regulamin_accepted: true,
    // po udanym użyciu kod unieważniony
    code_hash: null,
    code_expires_at: null,
  }).eq("id", c.id);
  if (error) return { ok: false, error: "db_error", httpStatus: 500 };

  // mail „umowa zawarta" (PDF = kolejny etap; na razie link do trwałego widoku + dane do przelewu)
  const link = `${APP_BASE_URL}/umowa/${c.access_token}`;
  const remaining = c.amount_total != null ? Math.max(0, c.amount_total - (c.amount_deposit ?? 0)) : null;
  if (c.signer_email) {
    await sendEmail({
      to: c.signer_email,
      subject: `Umowa zawarta — iClub ${c.order_no ?? ""}`.trim(),
      html: `<p>Dziękujemy — umowa <b>${c.order_no ?? ""}</b> została zawarta ${new Date(signedAt).toLocaleString("pl-PL")}.</p>
        <p>Zadatek do zapłaty: <b>${c.amount_deposit != null ? c.amount_deposit + " zł" : "—"}</b>${c.deposit_due ? ` (termin: ${c.deposit_due})` : ""}.</p>
        ${remaining != null ? `<p>Pozostało po imprezie: ${remaining} zł.</p>` : ""}
        <p><a href="${link}">Podgląd zawartej umowy</a></p>
        <p>iClub</p>`,
    }).catch(() => {});
  }
  sendPushToOwners({
    title: "Umowa zawarta",
    body: `${c.order_no ?? "Umowa"} — ${c.signer_email ?? "klient"} podpisał(a).`,
    url: "/inquiries",
    tag: "esign-signed",
  }).catch(() => {});

  return { ok: true, signedAt, httpStatus: 200 };
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; }
  return h;
}
