// app/(app)/field/[id]/signature/page.tsx — Podpis klienta / protokół odbioru.
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui";
import { getJob } from "@/lib/data/jobs";
import { getSignature } from "@/lib/data/signatures";
import { SignaturePad } from "./signature-pad";

export const dynamic = "force-dynamic";

const fmtPLN = (v: number | null) =>
  v == null ? "—" : new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(v);

export default async function SignaturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [job, signature] = await Promise.all([getJob(id), getSignature(id)]);
  if (!job) notFound();
  const r = job.reservation;
  const toPay = r?.price != null ? r.price - (r.deposit ?? 0) : null;

  return (
    <div className="mx-auto max-w-md px-4 py-4">
      <div className="mb-3 flex items-center gap-2.5">
        <Link href={`/field/${id}`} className="text-[13px] font-bold text-ink-2">‹ Realizacja</Link>
      </div>
      <h1 className="mb-4 font-display text-[22px] font-bold text-white">Podpis klienta</h1>

      {/* Protokół */}
      <div className="mb-4 rounded-card border border-border bg-surface p-4">
        <div className="text-[11px] font-bold uppercase tracking-[0.6px] text-ink-2">Protokół odbioru</div>
        {[["Klient", r?.customer?.name ?? "—"], ["Wydarzenie", r?.event_type ?? "—"], ["Namiot / pakiet", [r?.tent?.name, r?.package?.name].filter(Boolean).join(" · ") || "—"], ["Do zapłaty", fmtPLN(toPay)]].map(([k, v]) => (
          <div key={k} className="flex justify-between py-1.5 text-[13px] font-semibold"><span className="text-ink-2">{k}</span><span className="text-ink">{v}</span></div>
        ))}
      </div>

      {signature ? (
        <>
          <Alert tone="ok" title="Podpisano">{signature.signer_name ? `Podpisał(a): ${signature.signer_name}` : "Podpis zapisany."}</Alert>
          <div className="mt-3 rounded-card border border-border bg-surface-2 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={signature.data_url} alt="Podpis klienta" className="h-40 w-full rounded object-contain bg-[#1f212c]" />
          </div>
        </>
      ) : (
        <SignaturePad jobId={id} defaultName={r?.customer?.name ?? ""} />
      )}
    </div>
  );
}
