// app/(app)/field/page.tsx — Realizacje (lista mobilna, dane z Supabase lub demo).
import Link from "next/link";
import { PageHeader } from "@/components/layout";
import { EmptyState, Pill } from "@/components/ui";
import { listJobsWithTeam, type JobWithTeam } from "@/lib/data/jobs";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { JOB_STATUS_META } from "@/lib/data/types";

export const dynamic = "force-dynamic";

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "short" }) : "—";

// §II.4 Realizacja „wymaga uwagi": nadchodząca (lub bez daty), niezakończona, nieodwołana
// i BEZ przypisanego zespołu — trzeba komuś przydzielić.
function needsAttention(j: JobWithTeam, today: string): boolean {
  if (j.assignedCount > 0) return false;
  if (j.status === "DONE") return false;
  const st = j.reservation?.status;
  if (st === "CANCELLED" || st === "EXPIRED") return false;
  if (j.event_date && j.event_date < today) return false; // przeszłe pomijamy
  return true;
}

function JobCard({ j, attention }: { j: JobWithTeam; attention?: boolean }) {
  const m = JOB_STATUS_META[j.status];
  const r = j.reservation;
  // Nieprzypisane kierujemy do rezerwacji (tam przydziela się zespół); resztę do realizacji.
  const href = attention && r?.id ? `/reservations/${r.id}` : `/field/${j.id}`;
  return (
    <Link key={j.id} href={href} className={`rounded-card border p-4 ${attention ? "border-[#3d3216] bg-[#241e10]" : "border-border bg-surface"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-[14.5px] font-bold text-ink">{r?.customer?.name ?? j.title ?? "Realizacja"}</div>
        {attention ? <Pill label="Bez zespołu" fg="#f5c451" bg="#3d3216" /> : <Pill label={m.label} fg={m.fg} bg={m.bg} />}
      </div>
      <div className="mt-1 text-[12.5px] font-medium text-ink-2">{[j.title, r?.tent?.name].filter(Boolean).join(" · ") || "—"}</div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-ink-2">
        <span>📅 {fmtDate(j.event_date)}</span>
        {r?.location && <span>📍 {r.location}</span>}
        {attention && <span className="font-semibold text-warn">➜ przydziel pracownika</span>}
      </div>
    </Link>
  );
}

export default async function FieldListPage() {
  const jobs = await listJobsWithTeam();
  const demo = !isSupabaseConfigured();
  const today = new Date().toISOString().slice(0, 10);

  const attention = jobs.filter((j) => needsAttention(j, today));
  const attentionIds = new Set(attention.map((j) => j.id));
  const rest = jobs.filter((j) => !attentionIds.has(j.id));

  return (
    <div className="mx-auto max-w-md px-4 py-4">
      <PageHeader title="Realizacje" subtitle={`${jobs.length} ${jobs.length === 1 ? "realizacja" : "realizacji"}`} />

      {demo && (
        <div className="mb-4 flex items-center gap-2 rounded-card border border-[#3d3216] bg-[#241e10] px-4 py-3 text-[12px] text-warn">
          Tryb demo — dane przykładowe.
        </div>
      )}

      {/* §II.4 Wymaga uwagi — nadchodzące realizacje bez przypisanego zespołu */}
      {attention.length > 0 && (
        <div className="mb-5">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[13px] font-bold text-warn">⚠ Wymaga uwagi</span>
            <span className="rounded-full bg-[#3d3216] px-2 py-0.5 text-[11px] font-bold text-warn">{attention.length}</span>
          </div>
          <div className="flex flex-col gap-3">
            {attention.map((j) => <JobCard key={j.id} j={j} attention />)}
          </div>
        </div>
      )}

      {jobs.length === 0 ? (
        <EmptyState icon="truck" title="Brak realizacji" desc="Realizacje pojawią się po utworzeniu rezerwacji." />
      ) : (
        <div className="flex flex-col gap-3">
          {rest.map((j) => <JobCard key={j.id} j={j} />)}
        </div>
      )}
    </div>
  );
}
