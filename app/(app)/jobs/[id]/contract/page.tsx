// app/(app)/jobs/[id]/contract/page.tsx — Umowa iClub (podgląd + druk/PDF + status).
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui";
import { getJob } from "@/lib/data/jobs";
import { getCustomer } from "@/lib/data/customers";
import { listAddons } from "@/lib/data/resources";
import { getContract } from "@/lib/data/contracts";
import { getCurrentProfile } from "@/lib/data/profiles";
import { buildContract } from "@/lib/domain/contract";
import { ContractActions } from "./contract-actions";

export const dynamic = "force-dynamic";

export default async function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [job, contract, addons, profile] = await Promise.all([
    getJob(id),
    getContract(id),
    listAddons(),
    getCurrentProfile(),
  ]);
  if (!job) notFound();

  const r = job.reservation;
  const customer = r?.customer_id ? await getCustomer(r.customer_id) : null;
  const addonNames = (r?.addon_ids ?? [])
    .map((aid) => addons.find((a) => a.id === aid)?.name)
    .filter((n): n is string => Boolean(n));

  const data = buildContract({
    jobId: id,
    customerName: r?.customer?.name ?? customer?.name,
    customerAddress: customer?.address,
    customerTaxId: customer?.tax_id,
    customerPhone: customer?.phone,
    eventType: r?.event_type,
    eventDate: r?.event_date,
    setupDate: r?.setup_date,
    teardownDate: r?.teardown_date,
    location: r?.location,
    tentName: r?.tent?.name,
    packageName: r?.package?.name,
    addonNames,
    price: r?.price,
    deposit: r?.deposit,
  });

  const status = contract?.status ?? "DRAFT";
  const isOwner = profile?.role === "OWNER";

  return (
    <div className="mx-auto max-w-[820px] px-5 py-6 md:px-8">
      <Link href={`/jobs/${id}`} className="no-print mb-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink-2">‹ Zlecenie</Link>

      {job.business_line !== "ICLUB" && (
        <div className="no-print mb-4"><Alert tone="info" title="Umowa dotyczy zleceń iClub">Dla wypożyczalni umowa jest opcjonalna.</Alert></div>
      )}

      <ContractActions jobId={id} status={status} isOwner={isOwner} />

      <article className="contract-doc rounded-card border border-border bg-surface p-6 md:p-8">
        <h1 className="font-display text-[22px] font-bold text-white">{data.title}</h1>
        <div className="mt-4 space-y-1 text-[13px] text-ink">
          <div><span className="font-bold">Wynajmujący:</span> {data.lessor}</div>
          <div><span className="font-bold">Najemca:</span> {data.lessee}</div>
        </div>
        <div className="mt-5 space-y-4">
          {data.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-[14px] font-bold text-white">{s.heading}</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{s.body}</p>
            </section>
          ))}
        </div>
        <div className="mt-10 grid grid-cols-2 gap-8 text-[12px] text-ink-2">
          <div className="border-t border-border pt-2 text-center">Wynajmujący</div>
          <div className="border-t border-border pt-2 text-center">Najemca</div>
        </div>
      </article>
    </div>
  );
}
