"use client";
// Panel umowy (Szef): wartość + zadatek na wierzchu, a w rozwijanej sekcji WSZYSTKIE parametry umowy
// (składowe §5, godziny, termin zadatku, dane imprezy, namiot/pakiet/dodatki, dane klienta) do zmiany.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendContractForInquiryAction, previewContractForInquiryAction } from "./actions";
import { sendContractForJobAction, previewContractForJobAction } from "../reservations/actions";

const STATUS_PL: Record<string, { label: string; fg: string; bg: string }> = {
  draft: { label: "Szkic", fg: "#9aa0b2", bg: "#22242e" },
  sent: { label: "Wysłana do podpisu", fg: "#7fa8f5", bg: "#141f33" },
  signed: { label: "Podpisana ✓", fg: "#5fd68b", bg: "#12241a" },
  expired: { label: "Wygasła", fg: "#ebb05a", bg: "#241e10" },
  cancelled: { label: "Anulowana", fg: "#f58585", bg: "#251215" },
};

interface ExistingContract { status: string; link: string; signerEmail: string | null; signedAt: string | null; orderNo: string | null; }

export interface ContractDefaults {
  eventDate?: string; eventStartTime?: string; location?: string;
  tentName?: string; packageName?: string; addonsNote?: string;
  customerName?: string; customerEmail?: string;
  deliveryHour?: string; depositDue?: string;
  packagePrice?: string; addonsTotal?: string; transport?: string;
}

function CopyLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <input readOnly value={link} className="min-w-0 flex-1 rounded-[9px] border border-border bg-surface-2 px-2.5 py-1.5 text-[11.5px] text-ink-2" />
      <button type="button" onClick={() => { navigator.clipboard?.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {}); }}
        className="flex-none rounded-[9px] border border-border bg-surface-2 px-3 py-1.5 text-[12px] font-semibold text-ink">
        {copied ? "Skopiowano ✓" : "Kopiuj"}
      </button>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="text-[11.5px] font-semibold text-ink-2">{label}
      <input type={type} inputMode={type === "number" ? "decimal" : undefined} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="mt-1 block w-full rounded-field border border-border bg-surface-2 px-2.5 py-1.5 text-[13px] text-ink" />
    </label>
  );
}

export function LeadContractPanel({ inquiryId, jobId, defaultTotal, defaultDeposit, contract, defaults }: {
  inquiryId?: string;
  jobId?: string;
  defaultTotal: string;
  defaultDeposit: string;
  contract: ExistingContract | null;
  defaults?: ContractDefaults;
}) {
  const router = useRouter();
  const [total, setTotal] = useState(defaultTotal);
  const [deposit, setDeposit] = useState(defaultDeposit);
  const [d, setD] = useState<ContractDefaults>(defaults ?? {});
  const set = <K extends keyof ContractDefaults>(k: K, v: string) => setD((s) => ({ ...s, [k]: v }));
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ link?: string; emailSkipped?: boolean } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const buildOv = () => {
    const num = (s?: string) => { const n = Number((s ?? "").replace(",", ".")); return s && Number.isFinite(n) ? n : undefined; };
    const str = (s?: string) => { const t = (s ?? "").trim(); return t ? t : undefined; };
    return {
      amountTotal: num(total) ?? null,
      amountDeposit: num(deposit) ?? null,
      packagePrice: num(d.packagePrice), addonsTotal: num(d.addonsTotal), transport: num(d.transport),
      deliveryHour: str(d.deliveryHour), depositDue: str(d.depositDue),
      eventDate: str(d.eventDate), eventStartTime: str(d.eventStartTime), location: str(d.location),
      tentName: str(d.tentName), packageName: str(d.packageName), addonsNote: str(d.addonsNote),
      customerName: str(d.customerName), customerEmail: str(d.customerEmail),
    };
  };

  const send = () => {
    setErr(null); setResult(null);
    const ov = buildOv();
    start(async () => {
      const r = jobId ? await sendContractForJobAction(jobId, ov) : await sendContractForInquiryAction(inquiryId ?? "", ov);
      if (!r.ok) { setErr(r.error ?? "Nie udało się wysłać."); return; }
      setResult({ link: r.link, emailSkipped: r.emailSkipped });
      router.refresh();
    });
  };

  const preview = () => {
    setErr(null);
    // Otwieramy kartę od razu (gest użytkownika), by uniknąć blokady popupów; treść wstawiamy po odpowiedzi.
    const w = window.open("", "_blank");
    if (w) w.document.write('<!doctype html><meta charset="utf-8"><title>Podgląd umowy</title><div style="font:600 14px sans-serif;color:#555;padding:24px">Generuję podgląd umowy…</div>');
    const ov = buildOv();
    start(async () => {
      const r = jobId ? await previewContractForJobAction(jobId, ov) : await previewContractForInquiryAction(inquiryId ?? "", ov);
      if (!r.ok || !r.html) { setErr(r.error ?? "Nie udało się wygenerować podglądu."); if (w) w.close(); return; }
      const doc = `<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Podgląd umowy — iClub</title></head><body style="margin:0;background:#e9eaee;padding:24px 12px"><div style="max-width:720px;margin:0 auto;background:#fff;border-radius:14px;padding:28px 24px;box-shadow:0 10px 40px rgba(0,0,0,.15)"><div style="margin:0 0 14px;padding:8px 12px;border-radius:8px;background:#fff3cd;color:#7a5b00;font:600 12.5px sans-serif">PODGLĄD — tak umowę zobaczy klient. To NIE jest jeszcze wysłane ani podpisane.</div>${r.html}</div></body></html>`;
      if (w) { w.document.open(); w.document.write(doc); w.document.close(); }
    });
  };

  const st = contract ? (STATUS_PL[contract.status] ?? STATUS_PL.draft) : null;

  return (
    <div className="mt-4 rounded-card border border-border bg-surface p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="font-display text-[14px] font-bold text-white">Umowa do podpisu</span>
        {st && <span className="rounded-[7px] px-2 py-0.5 text-[11.5px] font-bold" style={{ color: st.fg, background: st.bg }}>{st.label}</span>}
      </div>

      {contract && contract.status !== "draft" && (
        <div className="mb-3 rounded-card border border-border-soft bg-surface-2 p-3">
          <div className="text-[12.5px] text-ink-2">
            {contract.orderNo && <span>Nr: <b className="text-ink">{contract.orderNo}</b> · </span>}
            {contract.status === "signed"
              ? <span>Podpisana {contract.signedAt ? new Date(contract.signedAt).toLocaleString("pl-PL") : ""}. Dane do wpłaty poszły na e-mail klienta.</span>
              : <span>Wysłana{contract.signerEmail ? ` na ${contract.signerEmail}` : ""} — klient podpisuje kodem e-mail.</span>}
          </div>
          <CopyLink link={contract.link} />
        </div>
      )}

      <p className="mb-2 text-[12px] text-ink-2">Wartość i zadatek trafią do umowy. Klient dostanie link, obejrzy umowę i podpisze jednorazowym kodem. Po podpisaniu dostanie dane do wpłaty (BLIK + zadatek 24 h).</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-[12px] font-semibold text-ink-2">Wartość (zł)
          <input inputMode="numeric" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="—" className="mt-1 block w-28 rounded-field border border-border bg-surface-2 px-3 py-2 text-[14px] text-ink" />
        </label>
        <label className="text-[12px] font-semibold text-ink-2">Zadatek (zł)
          <input inputMode="numeric" value={deposit} onChange={(e) => setDeposit(e.target.value)} placeholder="—" className="mt-1 block w-28 rounded-field border border-border bg-surface-2 px-3 py-2 text-[14px] text-ink" />
        </label>
        <button onClick={preview} disabled={pending} className="min-h-[40px] rounded-field border border-border bg-surface-2 px-4 text-[13px] font-bold text-ink disabled:opacity-50">
          👁 Podgląd
        </button>
        <button onClick={send} disabled={pending} className="bg-brand min-h-[40px] rounded-field px-4 text-[13px] font-bold text-white shadow-[0_6px_18px_rgba(225,29,116,0.4)] disabled:opacity-50">
          {pending ? "Wysyłanie…" : contract && contract.status !== "draft" ? "Wyślij nową umowę" : "Utwórz i wyślij umowę"}
        </button>
      </div>

      {/* Rozwijana sekcja: wszystkie parametry umowy do zmiany. Puste pole = wartość domyślna. */}
      <details className="mt-3 rounded-card border border-border-soft bg-surface-2 px-3 py-2">
        <summary className="cursor-pointer text-[12px] font-semibold text-ink-2">Ustawienia umowy — rozwiń, aby zmienić wszystkie parametry</summary>
        <p className="mt-1.5 text-[11px] text-muted">Puste pole = wartość domyślna. Zmiany wchodzą do treści umowy przy wysyłce.</p>
        <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2.5 sm:grid-cols-3">
          <Field label="Cena pakietu (zł)" type="number" value={d.packagePrice ?? ""} onChange={(v) => set("packagePrice", v)} placeholder="auto" />
          <Field label="Dodatki — suma (zł)" type="number" value={d.addonsTotal ?? ""} onChange={(v) => set("addonsTotal", v)} placeholder="auto" />
          <Field label="Koszt dojazdu (zł)" type="number" value={d.transport ?? ""} onChange={(v) => set("transport", v)} placeholder="auto" />
          <Field label="Data imprezy" type="date" value={d.eventDate ?? ""} onChange={(v) => set("eventDate", v)} />
          <Field label="Godzina imprezy" value={d.eventStartTime ?? ""} onChange={(v) => set("eventStartTime", v)} placeholder="np. 15:00" />
          <Field label="Godzina montażu" value={d.deliveryHour ?? ""} onChange={(v) => set("deliveryHour", v)} placeholder="np. 15:00" />
          <Field label="Termin zadatku" value={d.depositDue ?? ""} onChange={(v) => set("depositDue", v)} placeholder="24 h od zawarcia" />
          <div className="col-span-2 sm:col-span-3"><Field label="Lokalizacja" value={d.location ?? ""} onChange={(v) => set("location", v)} placeholder="miejscowość / adres" /></div>
          <Field label="Namiot" value={d.tentName ?? ""} onChange={(v) => set("tentName", v)} placeholder="np. Duży 6×8" />
          <Field label="Pakiet" value={d.packageName ?? ""} onChange={(v) => set("packageName", v)} placeholder="np. VIP" />
          <div className="col-span-2 sm:col-span-3"><Field label="Wyposażenie dodatkowe (opis)" value={d.addonsNote ?? ""} onChange={(v) => set("addonsNote", v)} placeholder="Stół 180 ×4, Krzesła ×20…" /></div>
          <div className="col-span-2 sm:col-span-1"><Field label="Imię i nazwisko" value={d.customerName ?? ""} onChange={(v) => set("customerName", v)} /></div>
          <div className="col-span-2"><Field label="E-mail (adres podpisu)" type="email" value={d.customerEmail ?? ""} onChange={(v) => set("customerEmail", v)} /></div>
        </div>
      </details>

      {result && (
        <div className="mt-3 rounded-card border border-[#1e3d2a] bg-[#12241a] p-3 text-[12.5px] text-ok">
          <div className="font-semibold">{result.emailSkipped ? "Umowa utworzona. E-mail nie jest jeszcze podłączony — skopiuj link i wyślij klientowi:" : "Umowa wysłana na e-mail klienta ✓ Link (do podglądu / wysłania ręcznego):"}</div>
          {result.link && <CopyLink link={result.link} />}
        </div>
      )}
      {err && <p className="mt-2 text-[12.5px] font-medium text-bad">{err}</p>}
    </div>
  );
}
