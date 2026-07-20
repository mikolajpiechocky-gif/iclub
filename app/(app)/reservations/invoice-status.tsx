"use client";
// Szkielet faktury VAT (§43): status wystawienia + rozbicie brutto/netto/VAT.
// Automatyczne wystawianie w InFakt dojdzie po podaniu klucza API.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { Alert } from "@/components/ui";
import { markInvoiceIssuedAction } from "./actions";

const fmtPLN = (v: number | null) =>
  v == null ? "—" : new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 2 }).format(v);
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "long" }) : "";

export function InvoiceStatus({
  id, issued, issuedAt, invoiceNumber, hasTaxId, gross, vatRate,
}: {
  id: string;
  issued: boolean;
  issuedAt: string | null;
  invoiceNumber: string | null;
  hasTaxId: boolean;
  gross: number | null;
  vatRate: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [number, setNumber] = useState(invoiceNumber ?? "");
  const [error, setError] = useState<string | null>(null);

  const netto = gross != null ? Math.round((gross / (1 + vatRate / 100)) * 100) / 100 : null;
  const vat = gross != null && netto != null ? Math.round((gross - netto) * 100) / 100 : null;

  const mark = (val: boolean) => {
    setError(null);
    startTransition(async () => {
      const res = await markInvoiceIssuedAction(id, val, val ? number : "");
      if (res.ok) router.refresh();
      else setError(res.error ?? "Błąd");
    });
  };

  return (
    <div className={`mb-4 rounded-card-lg border p-4 ${issued ? "border-[#1c4029] bg-[#12251a]" : "border-border bg-surface"}`}>
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-[10px] ${issued ? "bg-[#16301f] text-ok" : "bg-surface-2 text-ink-2"}`}>
          <Icon name="doc" className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-bold text-ink">Faktura VAT {issued ? "· wystawiona" : "· do wystawienia"}</div>
          <div className="text-[12px] text-ink-2">{issued ? `${invoiceNumber ? `Nr ${invoiceNumber} · ` : ""}${fmtDate(issuedAt)}` : "Rezerwacja rozliczana fakturą"}</div>
        </div>
      </div>

      {gross != null && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] font-semibold text-ink-2">
          <span>Brutto <span className="text-ink">{fmtPLN(gross)}</span></span>
          <span>Netto <span className="text-ink">{fmtPLN(netto)}</span></span>
          <span>VAT ({vatRate}%) <span className="text-ink">{fmtPLN(vat)}</span></span>
        </div>
      )}

      {!hasTaxId && (
        <div className="mt-3"><Alert tone="warn" title="Brak NIP klienta">Uzupełnij dane firmy (NIP) w kliencie przed wystawieniem faktury.</Alert></div>
      )}
      {error && <div className="mt-3"><Alert tone="bad" title="Błąd">{error}</Alert></div>}

      {issued ? (
        <button onClick={() => mark(false)} disabled={pending} className="mt-3 rounded-[11px] border border-border bg-surface-2 px-3.5 py-2 text-[12.5px] font-semibold text-ink-2">Cofnij wystawienie</button>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="Nr faktury (opcjonalnie)"
            className="w-48 rounded-[10px] border border-border bg-surface px-3 py-2 text-[13px] font-semibold text-ink outline-none focus:border-brand"
          />
          <button onClick={() => mark(true)} disabled={pending} className="rounded-[11px] bg-ok px-3.5 py-2 text-[12.5px] font-bold text-[#08170d]">{pending ? "…" : "Oznacz wystawioną"}</button>
        </div>
      )}

      <p className="mt-2.5 text-[11px] text-ink-2/80">Automatyczne wystawianie w InFakt — w przygotowaniu (wymaga klucza API).</p>
    </div>
  );
}
