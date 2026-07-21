// app/(app)/inquiries/[id]/edit/page.tsx — edycja zapytania + panel leada (§6).
import { notFound } from "next/navigation";
import { getInquiry } from "@/lib/data/inquiries";
import { listCustomers } from "@/lib/data/customers";
import { INQUIRY_SOURCE_LABELS } from "@/lib/data/types";
import { InquiryForm } from "../../inquiry-form";
import { ReactivateButton, AutoCloseBlockToggle } from "../../lead-buttons";

export const dynamic = "force-dynamic";

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "short", year: "numeric" }) : "—");

export default async function EditInquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [inquiry, customers] = await Promise.all([getInquiry(id), listCustomers()]);
  if (!inquiry) notFound();

  const closed = inquiry.status === "LOST" || inquiry.status === "WON";

  return (
    <>
      <div className="mx-auto max-w-[820px] px-5 pt-6 md:px-8">
        <div className="rounded-card-lg border border-border bg-surface p-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-ink-2">
            {inquiry.source && <span>Źródło: <b className="text-ink">{INQUIRY_SOURCE_LABELS[inquiry.source]}</b></span>}
            <span>Ostatnia aktywność: <b className="text-ink">{fmtDate(inquiry.last_activity_at)}</b></span>
            {inquiry.reactivation_count > 0 && <span>Odgrzewany: <b style={{ color: "#f6a94a" }}>{inquiry.reactivation_count}×</b></span>}
            {inquiry.lost_reason && <span>Powód przegranej: <b className="text-ink">{inquiry.lost_reason === "automatic_inactivity" ? "brak aktywności 21 dni" : inquiry.lost_reason}</b></span>}
          </div>
          {inquiry.olx_last_message && (
            <div className="mt-2 rounded-card border border-border-soft bg-surface-2 px-3 py-2 text-[12.5px] text-ink-2">Ostatnia wiadomość OLX: „{inquiry.olx_last_message}”</div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-4">
            {closed && <ReactivateButton id={inquiry.id} />}
            <AutoCloseBlockToggle id={inquiry.id} blocked={inquiry.auto_close_blocked} />
          </div>
        </div>
      </div>

      <InquiryForm initial={inquiry} customers={customers.map((c) => ({ id: c.id, name: c.name }))} />
    </>
  );
}
