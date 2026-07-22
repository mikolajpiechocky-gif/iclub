// app/(app)/inquiries/[id]/edit/page.tsx — edycja zapytania + panel leada (§6).
import { notFound } from "next/navigation";
import { getInquiry } from "@/lib/data/inquiries";
import { listCustomers } from "@/lib/data/customers";
import { getCurrentProfile } from "@/lib/data/profiles";
import { INQUIRY_SOURCE_LABELS } from "@/lib/data/types";
import { analyzeConversation, LEAD_STAGE_META } from "@/lib/domain/lead-analysis";
import { InquiryForm } from "../../inquiry-form";
import { ReactivateButton, AutoCloseBlockToggle } from "../../lead-buttons";

export const dynamic = "force-dynamic";

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const fmtDT = (iso: string | null) => (iso ? new Date(iso).toLocaleString("pl-PL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

export default async function EditInquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [inquiry, customers, profile] = await Promise.all([getInquiry(id), listCustomers(), getCurrentProfile()]);
  if (!inquiry) notFound();

  const isOwner = profile?.role === "OWNER";
  const closed = inquiry.status === "LOST" || inquiry.status === "WON";
  const messages = inquiry.olx_messages ?? [];
  const isOlx = inquiry.source === "OLX" || messages.length > 0;
  const analysis = analyzeConversation(messages, inquiry.olx_last_message ?? undefined);
  const stageMeta = LEAD_STAGE_META[analysis.stage];

  return (
    <>
      <div className="mx-auto max-w-[820px] px-5 pt-6 md:px-8">
        <div className="rounded-card-lg border border-border bg-surface p-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-ink-2">
            {inquiry.source && <span>Źródło: <b className="text-ink">{INQUIRY_SOURCE_LABELS[inquiry.source]}</b></span>}
            {(inquiry.contact_name || inquiry.contact_email) && <span>Kontakt: <b className="text-ink">{inquiry.contact_name || inquiry.contact_email}</b>{inquiry.contact_name && inquiry.contact_email ? ` · ${inquiry.contact_email}` : ""}</span>}
            {inquiry.location && <span>Lokalizacja: <b className="text-ink">{inquiry.location}</b></span>}
            <span>Ostatnia aktywność: <b className="text-ink">{fmtDate(inquiry.last_activity_at)}</b></span>
            {inquiry.reactivation_count > 0 && <span>Odgrzewany: <b style={{ color: "#f6a94a" }}>{inquiry.reactivation_count}×</b></span>}
            {inquiry.lost_reason && <span>Powód przegranej: <b className="text-ink">{inquiry.lost_reason === "automatic_inactivity" ? "brak aktywności 21 dni" : inquiry.lost_reason}</b></span>}
          </div>

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
          </div>

          {isOwner && inquiry.olx_raw != null && (
            <details className="mt-3 rounded-card border border-border-soft bg-surface-2 px-3 py-2">
              <summary className="cursor-pointer text-[11.5px] font-semibold text-ink-2">Diagnostyka OLX (surowe dane) — rozwiń, jeśli nick lub lokalizacja są puste</summary>
              <p className="mt-1.5 text-[11px] text-muted">Skopiuj tę zawartość i wklej mi ją — dostroję mapowanie pól do Twoich danych.</p>
              <pre className="mt-1.5 max-h-[280px] overflow-auto rounded-card border border-border bg-[#0d0e13] p-2.5 text-[10.5px] leading-[1.5] text-ink-2">{JSON.stringify(inquiry.olx_raw, null, 2)}</pre>
            </details>
          )}
        </div>
      </div>

      <InquiryForm initial={inquiry} customers={customers.map((c) => ({ id: c.id, name: c.name }))} />
    </>
  );
}
