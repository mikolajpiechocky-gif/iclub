"use client";
// Panel umowy na leadzie (Szef): wyślij umowę do podpisu + status/link do skopiowania.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendContractForInquiryAction } from "./actions";
import { sendContractForJobAction } from "../reservations/actions";

const STATUS_PL: Record<string, { label: string; fg: string; bg: string }> = {
  draft: { label: "Szkic", fg: "#9aa0b2", bg: "#22242e" },
  sent: { label: "Wysłana do podpisu", fg: "#7fa8f5", bg: "#141f33" },
  signed: { label: "Podpisana ✓", fg: "#5fd68b", bg: "#12241a" },
  expired: { label: "Wygasła", fg: "#ebb05a", bg: "#241e10" },
  cancelled: { label: "Anulowana", fg: "#f58585", bg: "#251215" },
};

interface ExistingContract { status: string; link: string; signerEmail: string | null; signedAt: string | null; orderNo: string | null; }

function CopyLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <input readOnly value={link} className="min-w-0 flex-1 rounded-[9px] border border-border bg-surface-2 px-2.5 py-1.5 text-[11.5px] text-ink-2" />
      <button
        type="button"
        onClick={() => { navigator.clipboard?.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {}); }}
        className="flex-none rounded-[9px] border border-border bg-surface-2 px-3 py-1.5 text-[12px] font-semibold text-ink"
      >
        {copied ? "Skopiowano ✓" : "Kopiuj"}
      </button>
    </div>
  );
}

export function LeadContractPanel({ inquiryId, jobId, defaultTotal, defaultDeposit, contract }: {
  inquiryId?: string;
  jobId?: string;   // gdy podane → umowa ze zlecenia (rezerwacji), inaczej z zapytania
  defaultTotal: string;
  defaultDeposit: string;
  contract: ExistingContract | null;
}) {
  const router = useRouter();
  const [total, setTotal] = useState(defaultTotal);
  const [deposit, setDeposit] = useState(defaultDeposit);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ link?: string; emailSkipped?: boolean } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const send = () => {
    setErr(null); setResult(null);
    const t = Number(total.replace(",", ".")) || null;
    const d = Number(deposit.replace(",", ".")) || null;
    start(async () => {
      const r = jobId ? await sendContractForJobAction(jobId, t, d) : await sendContractForInquiryAction(inquiryId ?? "", t, d);
      if (!r.ok) { setErr(r.error ?? "Nie udało się wysłać."); return; }
      setResult({ link: r.link, emailSkipped: r.emailSkipped });
      router.refresh();
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
        <button onClick={send} disabled={pending} className="bg-brand min-h-[40px] rounded-field px-4 text-[13px] font-bold text-white shadow-[0_6px_18px_rgba(225,29,116,0.4)] disabled:opacity-50">
          {pending ? "Wysyłanie…" : contract && contract.status !== "draft" ? "Wyślij nową umowę" : "Utwórz i wyślij umowę"}
        </button>
      </div>

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
