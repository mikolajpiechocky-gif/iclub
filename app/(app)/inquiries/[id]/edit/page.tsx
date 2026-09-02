// app/(app)/inquiries/[id]/edit/page.tsx — edycja zapytania + panel leada (§6).
import { notFound } from "next/navigation";
import { getInquiry } from "@/lib/data/inquiries";
import { listCustomers } from "@/lib/data/customers";
import { getCurrentProfile } from "@/lib/data/profiles";
import { getEsignByInquiry } from "@/lib/data/esign";
import { getPublicAvailability } from "@/lib/data/public";
import { INQUIRY_SOURCE_LABELS } from "@/lib/data/types";
import { analyzeConversation, LEAD_STAGE_META } from "@/lib/domain/lead-analysis";
import { InquiryForm } from "../../inquiry-form";
import { ReactivateButton, AutoCloseBlockToggle, DeleteInquiryButton } from "../../lead-buttons";
import { LeadContractPanel } from "../../lead-contract";

export const dynamic = "force-dynamic";
const APP_BASE_URL = (process.env.APP_BASE_URL || "https://app.iclubevents.pl").replace(/\/$/, "");

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const fmtDT = (iso: string | null) => (iso ? new Date(iso).toLocaleString("pl-PL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

export default async function EditInquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [inquiry, customers, profile, contractRow] = await Promise.all([getInquiry(id), listCustomers(), getCurrentProfile(), getEsignByInquiry(id)]);
  if (!inquiry) notFound();

  const isOwner = profile?.role === "OWNER";

  // Dostępność na dzień imprezy (z realnego kalendarza) + domyślne kwoty z estymaty konfiguratora.
  const avail = isOwner && inquiry.event_date ? await getPublicAvailability(inquiry.event_date, inquiry.event_date) : null;
  const used = avail && inquiry.event_date ? (avail.days[inquiry.event_date] ?? { large: 0, small: 0, backdoor: 0, gastro: 0, heating: 0 }) : null;
  const freeLarge = avail && used ? avail.capacity.large - used.large : null;
  const freeSmall = avail && used ? avail.capacity.small - used.small : null;
  const cfg = (inquiry.config_json ?? null) as import("@/lib/data/types").InquiryConfig | null;
  const estTotal = cfg?.estimate?.value != null ? String(Math.round(cfg.estimate.value)) : (inquiry.notes?.match(/warto[sś][cć][^\d]*(\d+)/i)?.[1] ?? "");
  const estDeposit = cfg?.estimate?.deposit != null ? String(Math.round(cfg.estimate.deposit)) : (inquiry.notes?.match(/za(?:datek|liczk)\w*[^\d]*(\d+)/i)?.[1] ?? "");
  const TENT_LABEL: Record<string, string> = { M: "Mały 5,4×5,4", D: "Duży 6×8", D_BACKDOOR: "Duży 6×8 (drzwi z tyłu)" };
  const zlk = (n: number | null | undefined) => (n == null ? "—" : `${Math.round(n)} zł`);
  const contract = contractRow ? {
    status: contractRow.status,
    link: `${APP_BASE_URL}/umowa/${contractRow.access_token}`,
    signerEmail: contractRow.signer_email,
    signedAt: contractRow.signed_at,
    orderNo: contractRow.order_no,
  } : null;
  const closed = inquiry.status === "LOST" || inquiry.status === "WON";
  const messages = inquiry.olx_messages ?? [];
  const isOlx = inquiry.source === "OLX" || messages.length > 0;
  const analysis = analyzeConversation(messages, inquiry.olx_last_message ?? undefined);
  const stageMeta = LEAD_STAGE_META[analysis.stage];

  return (
    <>
      <div className="mx-auto max-w-[820px] px-5 pt-6 md:px-8">
        <div className="rounded-card-lg border border-border bg-surface p-4">
          {inquiry.source === "WEBSITE_FORM" && (
            <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-[8px] border border-[#243654] bg-[#141f33] px-2.5 py-1 text-[12px] font-bold text-[#7fa8f5]">🌐 Zgłoszenie z konfiguratora strony</div>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-ink-2">
            {inquiry.source && <span>Źródło: <b className="text-ink">{INQUIRY_SOURCE_LABELS[inquiry.source]}</b></span>}
            {inquiry.created_at && <span>Wpłynęło: <b className="text-ink">{fmtDT(inquiry.created_at)}</b></span>}
            {inquiry.contact_name && <span>Kontakt: <b className="text-ink">{inquiry.contact_name}</b></span>}
            {inquiry.contact_phone && <span>Tel: <a href={`tel:${inquiry.contact_phone.replace(/\s/g, "")}`} className="font-bold text-[#7fa8f5] underline decoration-dotted">{inquiry.contact_phone}</a></span>}
            {inquiry.contact_email && <span>E-mail: <a href={`mailto:${inquiry.contact_email}`} className="font-bold text-[#7fa8f5] underline decoration-dotted">{inquiry.contact_email}</a></span>}
            {inquiry.location && <span>Lokalizacja: <b className="text-ink">{inquiry.location}</b></span>}
            {freeLarge != null && freeSmall != null && (
              <span>Dostępność {fmtDate(inquiry.event_date)}: <b style={{ color: (freeLarge > 0 || freeSmall > 0) ? "#5fd68b" : "#f58585" }}>{(freeLarge > 0 || freeSmall > 0) ? "są wolne namioty" : "brak wolnych"}</b> (duże {freeLarge}/{avail!.capacity.large}, małe {freeSmall}/{avail!.capacity.small})</span>
            )}
            <span>Ostatnia aktywność: <b className="text-ink">{fmtDate(inquiry.last_activity_at)}</b></span>
            {inquiry.reactivation_count > 0 && <span>Odgrzewany: <b style={{ color: "#f6a94a" }}>{inquiry.reactivation_count}×</b></span>}
            {inquiry.lost_reason && <span>Powód przegranej: <b className="text-ink">{inquiry.lost_reason === "automatic_inactivity" ? "brak aktywności 21 dni" : inquiry.lost_reason}</b></span>}
          </div>

          {inquiry.source === "WEBSITE_FORM" && (
            <div className="mt-2.5 rounded-card border border-border-soft bg-surface-2 p-3">
              <div className="mb-2 text-[11.5px] font-bold text-ink-2">Zgłoszona konfiguracja</div>
              {(() => {
                const isRental = cfg?.line === "RENTAL";
                const tents = [cfg?.tentMain, cfg?.tentExtra].filter(Boolean).map((t) => TENT_LABEL[t!] ?? t).join(" + ");
                const addonNames = (cfg?.addons ?? []).map((a) => `${a.name ?? a.code}${(a.qty ?? 1) > 1 ? ` ×${a.qty}` : ""}`).filter(Boolean).join(", ");
                const rentalNames = (cfg?.rentalItems ?? []).map((a) => `${a.name ?? a.code}${(a.qty ?? 1) > 1 ? ` ×${a.qty}` : ""}`).filter(Boolean).join(", ");
                const rows: [string, string | null][] = [
                  ["Termin", [cfg?.eventDate, cfg?.eventStartTime].filter(Boolean).join(" · ") || (inquiry.event_date ?? null)],
                  ["Goście", cfg?.guests != null ? String(cfg.guests) : null],
                  [isRental ? "Liczba dób" : "Namiot", isRental ? (cfg?.rentalDays != null ? String(cfg.rentalDays) : null) : (tents || null)],
                  ...(isRental ? [] : [["Pakiet", cfg?.package ?? null] as [string, string | null], ["Ogrzewanie", cfg?.heating ? "Tak" : null] as [string, string | null]]),
                  [isRental ? "Sprzęt" : "Dodatki", isRental ? (rentalNames || null) : (addonNames || null)],
                  ["Odbiór własny", cfg?.selfPickup ? "Tak" : null],
                  ["Nr konfiguratora", cfg?.configNo ?? null],
                ];
                return cfg ? (
                  <>
                    <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
                      {rows.filter(([, v]) => v).map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-3 border-b border-border-soft/60 pb-1">
                          <dt className="text-[12px] text-ink-2">{k}</dt><dd className="text-[12.5px] font-semibold text-ink text-right">{v}</dd>
                        </div>
                      ))}
                    </dl>
                    {cfg.estimate && (
                      <div className="mt-2.5 rounded-card border border-border bg-surface p-2.5">
                        <div className="mb-1 text-[11px] font-bold text-ink-2">Wycena orientacyjna z konfiguratora (do potwierdzenia)</div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
                          <div><div className="text-[11px] text-ink-2">Wartość</div><div className="text-[13.5px] font-bold text-ink">{zlk(cfg.estimate.value)}</div></div>
                          <div><div className="text-[11px] text-ink-2">Transport</div><div className="text-[13.5px] font-bold text-ink">{zlk(cfg.estimate.transport)}</div></div>
                          <div><div className="text-[11px] text-ink-2">Zadatek</div><div className="text-[13.5px] font-bold text-[#5fd68b]">{zlk(cfg.estimate.deposit)}</div></div>
                          <div><div className="text-[11px] text-ink-2">Pozostało</div><div className="text-[13.5px] font-bold text-ink">{zlk(cfg.estimate.remaining)}</div></div>
                        </div>
                      </div>
                    )}
                    {cfg.message && <div className="mt-2 rounded-[8px] border border-border-soft bg-surface px-2.5 py-1.5 text-[12px] text-ink"><span className="text-ink-2">Wiadomość klienta: </span>{cfg.message}</div>}
                  </>
                ) : (
                  inquiry.notes && <pre className="max-h-[260px] overflow-auto whitespace-pre-wrap break-words text-[12px] leading-[1.6] text-ink">{inquiry.notes}</pre>
                );
              })()}
              {!inquiry.tent_interest && cfg?.line !== "RENTAL" && <div className="mt-2 rounded-[8px] border border-[#3d3216] bg-[#241e10] px-2 py-1 text-[11.5px] font-semibold text-warn">⚠️ Klient nie wybrał namiotu (albo wybór się nie zapisał) — dopytaj przy potwierdzeniu.</div>}
              {cfg && inquiry.notes && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-[11px] font-semibold text-ink-2">Surowe zgłoszenie (dokładnie co przyszło z formularza)</summary>
                  <pre className="mt-1.5 max-h-[260px] overflow-auto whitespace-pre-wrap break-words text-[11.5px] leading-[1.6] text-ink-2">{inquiry.notes}</pre>
                </details>
              )}
            </div>
          )}

          {isOlx && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="rounded-[7px] px-2 py-1 text-[11.5px] font-bold" style={{ color: stageMeta.fg, background: stageMeta.bg }}>
                {stageMeta.label}{messages.length > 0 ? ` · ${analysis.score}%` : ""}
              </span>
              {analysis.reasons.map((r, i) => (
                <span key={i} className="rounded-[6px] border border-border-soft bg-surface-2 px-1.5 py-0.5 text-[11px] text-ink-2">{r}</span>
              ))}
            </div>
          )}

          {analysis.signal && (
            <div className="mt-2 rounded-card border border-[#1e4a2c] bg-[#16301f] px-3 py-2 text-[12.5px] font-semibold text-ok">
              Wygląda na domkniętą ofertę — dane wskazują na rezerwację{analysis.reasons.length ? ` (${analysis.reasons.join(", ")})` : ""}.
            </div>
          )}

          {messages.length > 0 ? (
            <div className="mt-3">
              <div className="mb-1.5 text-[12px] font-bold text-ink-2">Historia rozmowy OLX ({messages.length})</div>
              <div className="flex max-h-[340px] flex-col gap-1.5 overflow-y-auto rounded-card border border-border-soft bg-surface-2 p-3">
                {messages.map((mm, i) => (
                  <div key={i} className={`flex ${mm.mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[82%] rounded-[11px] px-2.5 py-1.5 text-[12.5px] ${mm.mine ? "bg-[#271b3f] text-[#e0c8ff]" : "bg-surface text-ink"}`}>
                      <div className="whitespace-pre-wrap break-words">{mm.text}</div>
                      {mm.at && <div className="mt-0.5 text-[10px] text-muted">{fmtDT(mm.at)}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            inquiry.olx_last_message && (
              <div className="mt-2 rounded-card border border-border-soft bg-surface-2 px-3 py-2 text-[12.5px] text-ink-2">Ostatnia wiadomość OLX: „{inquiry.olx_last_message}”</div>
            )
          )}

          <div className="mt-3 flex flex-wrap items-center gap-4">
            {closed && <ReactivateButton id={inquiry.id} />}
            <AutoCloseBlockToggle id={inquiry.id} blocked={inquiry.auto_close_blocked} />
            {isOwner && <DeleteInquiryButton id={inquiry.id} />}
          </div>

          {isOwner && inquiry.olx_raw != null && (
            <details className="mt-3 rounded-card border border-border-soft bg-surface-2 px-3 py-2">
              <summary className="cursor-pointer text-[11.5px] font-semibold text-ink-2">Diagnostyka OLX (surowe dane) — rozwiń, jeśli nick lub lokalizacja są puste</summary>
              <p className="mt-1.5 text-[11px] text-muted">Skopiuj tę zawartość i wklej mi ją — dostroję mapowanie pól do Twoich danych.</p>
              <pre className="mt-1.5 max-h-[280px] overflow-auto rounded-card border border-border bg-[#0d0e13] p-2.5 text-[10.5px] leading-[1.5] text-ink-2">{JSON.stringify(inquiry.olx_raw, null, 2)}</pre>
            </details>
          )}
        </div>

        {isOwner && (
          <LeadContractPanel inquiryId={inquiry.id} defaultTotal={estTotal} defaultDeposit={estDeposit} contract={contract} />
        )}
      </div>

      <InquiryForm initial={inquiry} customers={customers.map((c) => ({ id: c.id, name: c.name }))} />
    </>
  );
}
