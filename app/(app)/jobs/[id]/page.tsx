// app/(app)/jobs/[id]/page.tsx — Szczegóły zlecenia (RSC, dane + etapy).
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout";
import { SectionCard, Pill } from "@/components/ui";
import { getJob, getJobStages } from "@/lib/data/jobs";
import { listJobAssignments } from "@/lib/data/assignments";
import { listEmployees } from "@/lib/data/employees";
import { getCurrentProfile } from "@/lib/data/profiles";
import { predictedEarnings } from "@/lib/domain/earnings";
import { JOB_STATUS_META, STAGE_STATUS_META } from "@/lib/data/types";
import { JobTeam, type AssignmentView } from "../job-team";

export const dynamic = "force-dynamic";

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "long", year: "numeric" }) : "—";
const fmtPLN = (v: number | null) =>
  v == null ? "—" : new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(v);

export default async function JobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [job, stages, assignments, employees, profile] = await Promise.all([
    getJob(id),
    getJobStages(id),
    listJobAssignments(id),
    listEmployees(),
    getCurrentProfile(),
  ]);
  if (!job) notFound();

  const r = job.reservation;
  const m = JOB_STATUS_META[job.status];
  const done = stages.filter((s) => s.status === "DONE").length;

  const isOwner = profile?.role === "OWNER";
  const ownerBonus = job.owner_bonus ?? 0;
  const assignmentViews: AssignmentView[] = assignments.map((a) => ({
    id: a.id,
    profile_id: a.profile_id,
    full_name: a.employee?.full_name ?? "—",
    is_lead: a.is_lead,
    earnings: a.rate ? predictedEarnings(a.rate, job.business_line, ownerBonus) : null,
  }));
  const assignedIds = new Set(assignments.map((a) => a.profile_id));
  const availableEmployees = employees
    .filter((e) => !assignedIds.has(e.id))
    .map((e) => ({ id: e.id, full_name: e.full_name || "—" }));
  const myRate = employees.find((e) => e.id === profile?.id)?.rate ?? null;
  const myEarnings = myRate ? predictedEarnings(myRate, job.business_line, ownerBonus) : null;
  const amIAssigned = profile ? assignedIds.has(profile.id) : false;

  const cards: { h: string; rows: [string, string][] }[] = [
    { h: "Klient", rows: [["Klient", r?.customer?.name ?? "—"], ["Źródło", r?.source ?? "—"]] },
    { h: "Wydarzenie", rows: [["Typ", r?.event_type ?? "—"], ["Goście", r?.guests != null ? `${r.guests} osób` : "—"], ["Data", fmtDate(r?.event_date ?? null)]] },
    { h: "Terminy", rows: [["Montaż", fmtDate(r?.setup_date ?? null)], ["Demontaż", fmtDate(r?.teardown_date ?? null)], ["Lokalizacja", r?.location ?? "—"]] },
    { h: "Namiot i pakiet", rows: [["Namiot", r?.tent?.name ?? "—"], ["Pakiet", r?.package?.name ?? "—"]] },
    { h: "Rozliczenie", rows: [["Wartość", fmtPLN(r?.price ?? null)], ["Rabat", fmtPLN(r?.discount ?? 0)], ["Zaliczka", fmtPLN(r?.deposit ?? 0)]] },
  ];

  return (
    <div className="mx-auto max-w-[1180px] px-5 py-6 md:px-8">
      <PageHeader
        title={job.title || "Zlecenie"}
        subtitle={`Zlecenie · ${job.reservation?.event_type ?? ""}`}
        back={{ href: "/jobs", label: "Zlecenia" }}
        actions={r ? <Link href={`/reservations/${r.id}/edit`} className="rounded-field border border-border bg-surface-2 px-4 py-2.5 text-[13px] font-semibold text-ink">Edytuj rezerwację</Link> : undefined}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-card-lg border border-border bg-surface p-5">
        <Pill label={m.label} fg={m.fg} bg={m.bg} />
        <span className="text-[13px] font-semibold text-ink-2">Etapy: {done}/{stages.length} gotowe</span>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.h} className="rounded-[14px] border border-border bg-surface p-4">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.6px] text-ink-2">{c.h}</div>
            {c.rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2 py-1 text-[13px] font-semibold"><span className="text-ink-2">{k}</span><span className="text-right text-ink">{v}</span></div>
            ))}
          </div>
        ))}
      </div>

      <SectionCard title="Etapy realizacji" className="mt-4 p-5">
        <div className="px-5 pb-5">
          {stages.length === 0 ? (
            <p className="text-[13px] text-ink-2">Brak etapów.</p>
          ) : (
            stages.map((s, i) => {
              const sm = STAGE_STATUS_META[s.status];
              return (
                <div key={s.id} className="flex items-center gap-4 border-t border-border-soft py-3 first:border-t-0">
                  <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full border border-border text-[12px] font-bold text-ink-2">{i + 1}</span>
                  <div className="flex-1"><div className="text-[13.5px] font-bold text-ink">{s.title}</div></div>
                  <Pill label={sm.label} fg={sm.fg} bg={sm.bg} />
                </div>
              );
            })
          )}
        </div>
      </SectionCard>

      <JobTeam
        jobId={job.id}
        isOwner={isOwner}
        currentProfileId={profile?.id ?? null}
        ownerBonus={ownerBonus}
        assignments={assignmentViews}
        availableEmployees={availableEmployees}
        myEarnings={myEarnings}
        amIAssigned={amIAssigned}
      />
    </div>
  );
}
