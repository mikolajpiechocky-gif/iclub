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
import { ReactivateButton, AutoCloseBlockToggle, DeleteInquiryButton, CreateReservationButton } from "../../lead-buttons";
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
  const TENT_LABEL: Record<string, string> = { M: "Mały 5,4×5,4", D: "Duży 6×8", D_BACKDOOR: "Duży 6×8 (drzwi z tyłu)", GASTRO: "Gastronomiczny" };
  const tentLabel = (t: string | null | undefined) => (t ? (TENT_LABEL[t] ?? t) : null);
  const zlk = (n: number | null | undefined) => (n == null ? "—" : `${Math.round(n)} zł`);

  // Czytelny widok z config_json (nowe leady) LUB parsowany z notatki (starsze leady, np. sprzed struktury).
  const cfg = (inquiry.config_json ?? null) as import("@/lib/data/types").InquiryConfig | null;
  const rawNotes = inquiry.notes ?? "";
  const pick = (re: RegExp) => rawNotes.match(re)?.[1]?.trim() || null;
  const guestsStr = pick(/Go[śs]cie:\s*(\d+)/);
  const estM = rawNotes.match(/warto[sś][cć]\D*(\d+)\D+transport\D*(\d+)\D+za(?:datek|liczk\w*)\D*(\d+)\D+pozosta\w*\D*(\d+)/i);
  const addonsFromCfg = cfg?.addons?.length ? cfg.addons.map((a) => `${a.name ?? a.code}${(a.qty ?? 1) > 1 ? ` ×${a.qty}` : ""}`).join(", ") : null;
  const view = {
    isRental: cfg?.line === "RENTAL",
    phone: inquiry.contact_phone ?? cfg?.contact?.phone ?? pick(/Kontakt:[^\n]*?(\+?\d[\d ]{6,}\d)/),
    startTime: cfg?.eventStartTime ?? pick(/Start imprezy:\s*(.+)/),
    heating: cfg?.heating ?? /Ogrzewanie:\s*tak/i.test(rawNotes),
    tent: tentLabel(cfg?.tentMain) ?? inquiry.tent_interest ?? pick(/Namiot:\s*(.+)/),
    tentExtra: tentLabel(cfg?.tentExtra),
    pkg: cfg?.package ?? inquiry.package_interest ?? pick(/Pakiet:\s*(.+)/),
    guests: cfg?.guests ?? inquiry.guests ?? (guestsStr ? Number(guestsStr) : null),
    addons: addonsFromCfg ?? inquiry.addons_note ?? pick(/Dodatki:\s*(.+)/),
    message: cfg?.message ?? pick(/Wiadomo[śs][cć]:\s*(.+)/),
    configNo: cfg?.configNo ?? (rawNotes.match(/\b([A-Z]{2}-\d{4}-\d{3,})\b/)?.[1] ?? null),
    eventDate: cfg?.eventDate ?? inquiry.event_date,
    location: cfg?.location ?? inquiry.location,
    est: cfg?.estimate ?? (estM ? { value: +estM[1], transport: +estM[2], deposit: +estM[3], remaining: +estM[4], discount: undefined as number | undefined } : null),
  };
  const estTotal = view.est?.value != null ? String(Math.round(view.est.value)) : "";
  const estDeposit = view.est?.deposit != null ? String(Math.round(view.est.deposit)) : "";
  const fmtEventDate = (iso: string | null) => (iso ? new Date(iso + "T00:00:00Z").toLocaleDateString("pl-PL", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }) : "—");
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
          {inquiry.source === "WEBSITE_FORM" ? (
            <>
              {/* ===== Zgłoszenie z konfiguratora — czytelny widok: kafelki na górze ===== */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#243654] bg-[#141f33] px-2.5 py-1 text-[12px] font-bold text-[#7fa8f5]">🌐 Zgłoszenie z konfiguratora strony</span>
                {inquiry.created_at && <span className="ml-auto text-[11.5px] text-ink-2">Wpłynęło {fmtDT(inquiry.created_at)}</span>}
              </div>

              {/* Kontakt — imię, telefon i mail od razu klikalne */}
              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="text-[15px] font-bold text-white">{inquiry.contact_name || "— bez nazwy —"}</span>
                {view.phone && <a href={`tel:${view.phone.replace(/\s/g, "")}`} className="text-[13px] font-bold text-[#7fa8f5] underline decoration-dotted">📞 {view.phone}</a>}
                {inquiry.contact_email && <a href={`mailto:${inquiry.contact_email}`} className="text-[13px] font-bold text-[#7fa8f5] underline decoration-dotted">✉️ {inquiry.contact_email}</a>}
              </div>
              {freeLarge != null && freeSmall != null && (
                <div className="mt-2 inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[8px] border border-border-soft bg-surface-2 px-2.5 py-1 text-[12px]">
                  <span className="text-ink-2">Dostępność {fmtDate(view.eventDate)}:</span>
                  <b style={{ color: (freeLarge > 0 || freeSmall > 0) ? "#5fd68b" : "#f58585" }}>{(freeLarge > 0 || freeSmall > 0) ? "są wolne namioty" : "brak wolnych"}</b>
                  <span className="text-ink-2">duże {freeLarge}/{avail!.capacity.large} · małe {freeSmall}/{avail!.capacity.small}</span>
                </div>
              )}

              {/* KAFELKI: wartość, termin, pakiet+namiot, dodatki/sprzęt */}
              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div className="rounded-card border border-[#274063] bg-gradient-to-b from-[#12203a] to-[#0e1826] p-3">
                  <div className="text-[10.5px] font-bold uppercase tracking-wide text-[#9fc0ff]">Wartość zlecenia</div>
                  <div className="mt-1 font-display text-[26px] font-bold leading-none text-white">{zlk(view.est?.value)}</div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-[12px] text-ink-2">
                    <span>Zadatek: <b className="text-[#5fd68b]">{zlk(view.est?.deposit)}</b></span>
                    {!view.isRental && <span>Transport: <b className="text-ink">{zlk(view.est?.transport)}</b></span>}
                    <span>Rabat: <b className={view.est?.discount ? "text-[#ebb05a]" : "text-ink-2"}>{view.est?.discount ? zlk(view.est.discount) : "brak"}</b></span>
                    <span>Pozostało: <b className="text-ink">{zlk(view.est?.remaining)}</b></span>
                  </div>
                </div>
                <div className="rounded-card border border-border-soft bg-surface-2 p-3">
                  <div className="text-[10.5px] font-bold uppercase tracking-wide text-ink-2">Termin</div>
                  <div className="mt-1 font-display text-[18px] font-bold text-white">{fmtEventDate(view.eventDate)}</div>
                  <div className="mt-1 text-[12px] text-ink-2">{view.startTime ? `Start ${view.startTime}` : "Godzina do potwierdzenia"}{view.guests != null ? ` · ${view.guests} os.` : ""}</div>
                  {view.location && <div className="text-[12px] text-ink-2">{view.location}</div>}
                </div>
                <div className="rounded-card border border-border-soft bg-surface-2 p-3">
                  <div className="text-[10.5px] font-bold uppercase tracking-wide text-ink-2">{view.isRental ? "Wypożyczalnia" : "Pakiet i namiot"}</div>
                  <div className="mt-1 font-display text-[18px] font-bold text-white">{view.pkg || (view.isRental ? "Wynajem sprzętu" : "—")}</div>
                  {!view.isRental && <div className="mt-1 text-[12px] text-ink-2">Namiot: <b className="text-ink">{view.tent ? `${view.tent}${view.tentExtra ? " + " + view.tentExtra : ""}` : "—"}</b></div>}
                  {!view.isRental && <div className="text-[12px] text-ink-2">Ogrzewanie: <b className={view.heating ? "text-[#5fd68b]" : "text-ink-2"}>{view.heating ? "tak" : "nie"}</b></div>}
                </div>
                <div className="rounded-card border border-border-soft bg-surface-2 p-3">
                  <div className="text-[10.5px] font-bold uppercase tracking-wide text-ink-2">{view.isRental ? "Sprzęt" : "Dodatki / sprzęt"}</div>
                  <div className="mt-1 text-[13px] font-semibold leading-[1.5] text-ink">{view.addons || "—"}</div>
                  {view.configNo && <div className="mt-1.5 text-[11px] text-ink-2">Nr konfiguratora: <b className="text-ink">{view.configNo}</b></div>}
                </div>
              </div>

              {/* Wiadomość od klienta — często zawiera ważne wskazówki (dojazd, powierzchnia) */}
              {view.message && (
                <div className="mt-3 rounded-card border border-[#3d3216] bg-[#241e10] px-3 py-2 text-[12.5px]">
                  <div className="mb-0.5 text-[10.5px] font-bold uppercase tracking-wide text-warn">Wiadomość od klienta</div>
                  <div className="whitespace-pre-wrap break-words text-ink">{view.message}</div>
                </div>
              )}
              {!view.tent && !view.isRental && <div className="mt-2 rounded-[8px] border border-[#3d3216] bg-[#241e10] px-2 py-1 text-[11.5px] font-semibold text-warn">⚠️ Klient nie wybrał namiotu (albo wybór się nie zapisał) — dopytaj przy potwierdzeniu.</div>}
              {(inquiry.reactivation_count > 0 || inquiry.lost_reason) && (
                <div className="mt-2 text-[11.5px] text-ink-2">
                  {inquiry.reactivation_count > 0 && <span>Odgrzewany {inquiry.reactivation_count}×{inquiry.lost_reason ? " · " : ""}</span>}
                  {inquiry.lost_reason && <span>Powód przegranej: {inquiry.lost_reason === "automatic_inactivity" ? "brak aktywności 21 dni" : inquiry.lost_reason}</span>}
                </div>
              )}

              {/* Surowe zgłoszenie — rozwijane */}
              {inquiry.notes && (
                <details className="mt-3 rounded-card border border-border-soft bg-surface-2 px-3 py-2">
                  <summary className="cursor-pointer text-[12px] font-semibold text-ink-2">Dokładnie co przyszło z konfiguratora</summary>
                  <pre className="mt-1.5 max-h-[320px] overflow-auto whitespace-pre-wrap break-words text-[11.5px] leading-[1.6] text-ink">{inquiry.notes}</pre>
                </details>
              )}
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-ink-2">
              {inquiry.source && <span>Źródło: <b className="text-ink">{INQUIRY_SOURCE_LABELS[inquiry.source]}</b></span>}
              {inquiry.created_at && <span>Wpłynęło: <b className="text-ink">{fmtDT(inquiry.created_at)}</b></span>}
              {inquiry.contact_name && <span>Kontakt: <b className="text-ink">{inquiry.contact_name}</b></span>}
              {inquiry.contact_phone && <span>Tel: <a href={`tel:${inquiry.contact_phone.replace(/\s/g, "")}`} className="font-bold text-[#7fa8f5] underline decoration-dotted">{inquiry.contact_phone}</a></span>}
              {inquiry.contact_email && <span>E-mail: <a href={`mailto:${inquiry.contact_email}`} className="font-bold text-[#7fa8f5] underline decoration-dotted">{inquiry.contact_email}</a></span>}
              {inquiry.location && <span>Lokalizacja: <b className="text-ink">{inquiry.location}</b></span>}
              <span>Ostatnia aktywność: <b className="text-ink">{fmtDate(inquiry.last_activity_at)}</b></span>
              {inquiry.reactivation_count > 0 && <span>Odgrzewany: <b style={{ color: "#f6a94a" }}>{inquiry.reactivation_count}×</b></span>}
              {inquiry.lost_reason && <span>Powód przegranej: <b className="text-ink">{inquiry.lost_reason === "automatic_inactivity" ? "brak aktywności 21 dni" : inquiry.lost_reason}</b></span>}
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
            {isOwner && inquiry.source === "WEBSITE_FORM" && inquiry.status !== "WON" && <CreateReservationButton id={inquiry.id} />}
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
