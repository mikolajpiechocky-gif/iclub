// app/(app)/field/[id]/page.tsx — Realizacja terenowa (mobile, dane + etapy).
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pill } from "@/components/ui";
import { getJob, getJobStages } from "@/lib/data/jobs";
import { getCustomer } from "@/lib/data/customers";
import { JOB_STATUS_META } from "@/lib/data/types";
import { FieldStages } from "../field-stages";

export const dynamic = "force-dynamic";

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "long" }) : "—";

export default async function FieldRealizationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [job, stages] = await Promise.all([getJob(id), getJobStages(id)]);
  if (!job) notFound();

  const r = job.reservation;
  const customer = r?.customer_id ? await getCustomer(r.customer_id) : null;
  const m = JOB_STATUS_META[job.status];

  const phone = customer?.phone ?? null;
  const address = r?.location || customer?.address || customer?.city || null;
  const navUrl = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null;

  return (
    <div className="mx-auto max-w-md pb-6">
      {/* Nagłówek */}
      <div className="px-4 pt-4 pb-4 text-white" style={{ background: "linear-gradient(150deg,#2a1533,#191b24)" }}>
        <div className="mb-3 flex items-center gap-2.5">
          <Link href="/field" className="text-[13px] font-bold text-[#c9cddb]">‹ Realizacje</Link>
          <span className="ml-auto"><Pill label={m.label} fg={m.fg} bg={m.bg} /></span>
        </div>
        <div className="font-display text-[20px] font-bold">{r?.customer?.name ?? job.title ?? "Realizacja"}</div>
        <div className="mt-1 text-[13px] font-medium text-[#c9cddb]">{[fmtDate(job.event_date), address].filter(Boolean).join(" · ")}</div>
        <div className="mt-3.5 flex gap-2.5">
          {phone ? (
            <a href={`tel:${phone.replace(/\s+/g, "")}`} className="flex-1 rounded-[13px] bg-white/10 py-3 text-center text-[13px] font-bold text-white">Zadzwoń</a>
          ) : (
            <span className="flex-1 rounded-[13px] bg-white/5 py-3 text-center text-[13px] font-bold text-white/40">Brak telefonu</span>
          )}
          {navUrl ? (
            <a href={navUrl} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-[13px] bg-white py-3 text-center text-[13px] font-bold text-[#191b24]">Nawiguj</a>
          ) : (
            <span className="flex-1 rounded-[13px] bg-white/40 py-3 text-center text-[13px] font-bold text-[#191b24]/50">Brak adresu</span>
          )}
        </div>
      </div>

      <div className="px-4 pt-4">
        {/* Skrót danych */}
        <div className="mb-3.5 flex flex-wrap gap-2">
          {[r?.tent?.name, r?.package?.name, r?.guests != null ? `${r.guests} os.` : null].filter(Boolean).map((c) => (
            <span key={c as string} className="rounded-[10px] border border-border bg-surface px-2.5 py-2 text-[12px] font-semibold text-ink">{c}</span>
          ))}
        </div>

        {/* Etapy */}
        <FieldStages jobId={job.id} stages={stages} />

        {/* Akcje stałe */}
        <div className="mt-3.5 flex gap-2.5">
          <Link href="/media" className="flex-1 rounded-[13px] border border-[#3a1c1f] bg-[#251215] py-3 text-center text-[13px] font-bold text-bad">⚠ Zgłoś szkodę</Link>
          <Link href={`/jobs/${job.id}`} className="flex-1 rounded-[13px] border border-border bg-surface py-3 text-center text-[13px] font-bold text-ink-2">Szczegóły zlecenia</Link>
        </div>
      </div>
    </div>
  );
}
