// app/(app)/field/[id]/page.tsx — Realizacja terenowa (mobile).
// Pakowanie jest osobnym blokiem, a właściwa realizacja to kroki z własnymi
// czynnościami (W drodze / Montaż / Szkolenie / Zdjęcia / Rozliczenie / Demontaż).
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pill } from "@/components/ui";
import { getJob, getJobStages } from "@/lib/data/jobs";
import { getCustomer } from "@/lib/data/customers";
import { listReservationAddons, listPackageItems } from "@/lib/data/resources";
import { listChecklistItems } from "@/lib/data/checklist";
import { listPayments } from "@/lib/data/payments";
import { getSignature } from "@/lib/data/signatures";
import { listJobPhotos } from "@/lib/data/photos";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { JOB_STATUS_META } from "@/lib/data/types";
import { PackingBlock, RealizationFlow, type RealizationContext } from "../realization-flow";

export const dynamic = "force-dynamic";

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "long" }) : "—";

export default async function FieldRealizationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [job, stages] = await Promise.all([getJob(id), getJobStages(id)]);
  if (!job) notFound();

  const r = job.reservation;
  const [customer, checklist, payments, signature, photos, addonList, packageItems] = await Promise.all([
    r?.customer_id ? getCustomer(r.customer_id) : Promise.resolve(null),
    listChecklistItems(job.id),
    listPayments(),
    getSignature(job.id),
    listJobPhotos(job.id),
    listReservationAddons(),
    r?.package_id ? listPackageItems(r.package_id) : Promise.resolve([]),
  ]);
  const m = JOB_STATUS_META[job.status];

  // §9.4 Dodatki realizacji → ostrzeżenie o większym czasie pakowania i montażu.
  const addonName = new Map(addonList.map((a) => [a.id, a.name]));
  const addonNames = (r?.addon_ids ?? []).map((aid) => addonName.get(aid)).filter((n): n is string => Boolean(n));

  const phone = customer?.phone ?? null;
  const address = r?.location || customer?.address || customer?.city || null;
  const navUrl = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null;

  // Pakowanie = osobny blok; reszta kroków to właściwa realizacja.
  const packing = stages.find((s) => s.stage_key === "PACKING") ?? null;
  const flowSteps = stages.filter((s) => s.stage_key !== "PACKING");

  const toPay = r?.price != null ? r.price - (r.deposit ?? 0) : null;
  const paymentReported = payments.some((p) => p.job_id === job.id);

  const ctx: RealizationContext = {
    navUrl,
    toPay,
    hasSignature: Boolean(signature),
    paymentReported,
    signatureHref: `/field/${job.id}/signature`,
    photos: photos.map((p) => ({ id: p.id, url: p.url })),
    canUpload: isSupabaseConfigured(),
  };

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
          {[
            r?.assembly_time ? `Montaż ${r.assembly_time}` : null,
            r?.event_start_time ? `Start ${r.event_start_time}` : null,
            r?.tent?.name, r?.package?.name, r?.guests != null ? `${r.guests} os.` : null,
          ].filter(Boolean).map((c) => (
            <span key={c as string} className="rounded-[10px] border border-border bg-surface px-2.5 py-2 text-[12px] font-semibold text-ink">{c}</span>
          ))}
        </div>

        {/* §9.4 Ostrzeżenie o dodatkach — większy czas pakowania i montażu. */}
        {addonNames.length > 0 && (
          <div className="mb-3.5 rounded-[13px] border border-[#3d3216] bg-[#241e10] px-3.5 py-3 text-[12.5px] text-warn">
            <div className="font-bold">⚠ Realizacja zawiera dodatkowy sprzęt ({addonNames.length})</div>
            <div className="mt-0.5 text-[12px] text-warn">Uwzględnij większy czas pakowania i montażu. Dodatki: {addonNames.join(", ")}.</div>
          </div>
        )}

        {/* §11.1 Zawartość pakietu — do spakowania. */}
        {packageItems.length > 0 && (
          <div className="mb-3.5 rounded-[13px] border border-border bg-surface px-3.5 py-3">
            <div className="mb-1.5 text-[12.5px] font-bold text-ink">Zawartość pakietu{r?.package?.name ? ` · ${r.package.name}` : ""}</div>
            <div className="flex flex-wrap gap-1.5">
              {packageItems.map((it) => (
                <span key={it.id} className="rounded-[8px] border border-border bg-surface-2 px-2 py-1 text-[11.5px] font-semibold text-ink-2">{it.equipment?.name ?? "—"} × {it.quantity}</span>
              ))}
            </div>
          </div>
        )}

        {/* Blok: Pakowanie (osobny etap, dzień przed) */}
        <PackingBlock
          jobId={job.id}
          stage={packing}
          checklistHref={`/field/${job.id}/checklist`}
          progress={{ done: checklist.filter((i) => i.done).length, total: checklist.length }}
        />

        {/* Blok: Realizacja (kroki z własnymi czynnościami) */}
        <RealizationFlow jobId={job.id} steps={flowSteps} ctx={ctx} />

        {/* Akcje stałe */}
        <div className="mt-3.5 flex gap-2.5">
          <Link href="/media" className="flex-1 rounded-[13px] border border-[#3a1c1f] bg-[#251215] py-3 text-center text-[13px] font-bold text-bad">⚠ Zgłoś szkodę</Link>
          <Link href={`/reservations/${r?.id ?? ""}`} className="flex-1 rounded-[13px] border border-border bg-surface py-3 text-center text-[13px] font-bold text-ink-2">Szczegóły rezerwacji</Link>
        </div>
      </div>
    </div>
  );
}
