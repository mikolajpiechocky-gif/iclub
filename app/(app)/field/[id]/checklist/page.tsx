// app/(app)/field/[id]/checklist/page.tsx — Checklista pakowania zlecenia.
import Link from "next/link";
import { notFound } from "next/navigation";
import { getJob } from "@/lib/data/jobs";
import { listChecklistItems } from "@/lib/data/checklist";
import { ChecklistView } from "./checklist-view";

export const dynamic = "force-dynamic";

export default async function ChecklistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [job, items] = await Promise.all([getJob(id), listChecklistItems(id)]);
  if (!job) notFound();

  return (
    <div className="mx-auto max-w-md pb-6">
      <div className="px-4 pt-4 pb-2">
        <Link href={`/field/${id}`} className="text-[13px] font-bold text-ink-2">‹ Realizacja</Link>
        <h1 className="mt-2 font-display text-[20px] font-bold text-white">{job.reservation?.customer?.name ?? job.title ?? "Pakowanie"}</h1>
        <div className="text-[12px] text-ink-2">Checklista pakowania</div>
      </div>
      <ChecklistView jobId={id} items={items} backHref={`/field/${id}`} />
    </div>
  );
}
