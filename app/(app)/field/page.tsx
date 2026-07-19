// app/(app)/field/page.tsx — Realizacje (lista mobilna, dane z Supabase lub demo).
import Link from "next/link";
import { PageHeader } from "@/components/layout";
import { EmptyState, Pill } from "@/components/ui";
import { listJobs } from "@/lib/data/jobs";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { JOB_STATUS_META } from "@/lib/data/types";

export const dynamic = "force-dynamic";

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "short" }) : "—";

export default async function FieldListPage() {
  const jobs = await listJobs();
  const demo = !isSupabaseConfigured();

  return (
    <div className="mx-auto max-w-md px-4 py-4">
      <PageHeader title="Realizacje" subtitle={`${jobs.length} ${jobs.length === 1 ? "realizacja" : "realizacji"}`} />

      {demo && (
        <div className="mb-4 flex items-center gap-2 rounded-card border border-[#3d3216] bg-[#241e10] px-4 py-3 text-[12px] text-warn">
          Tryb demo — dane przykładowe.
        </div>
      )}

      {jobs.length === 0 ? (
        <EmptyState icon="truck" title="Brak realizacji" desc="Realizacje pojawią się po utworzeniu rezerwacji." />
      ) : (
        <div className="flex flex-col gap-3">
          {jobs.map((j) => {
            const m = JOB_STATUS_META[j.status];
            const r = j.reservation;
            return (
              <Link key={j.id} href={`/field/${j.id}`} className="rounded-card border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-[14.5px] font-bold text-ink">{r?.customer?.name ?? j.title ?? "Realizacja"}</div>
                  <Pill label={m.label} fg={m.fg} bg={m.bg} />
                </div>
                <div className="mt-1 text-[12.5px] font-medium text-ink-2">{[j.title, r?.tent?.name].filter(Boolean).join(" · ") || "—"}</div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-ink-2">
                  <span>📅 {fmtDate(j.event_date)}</span>
                  {r?.location && <span>📍 {r.location}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
