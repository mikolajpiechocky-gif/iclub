// app/(app)/media/page.tsx — Zgłoszenia i szkody (RSC + formularz kliencki).
import { PageHeader } from "@/components/layout";
import { EmptyState, Pill } from "@/components/ui";
import { listIncidents } from "@/lib/data/incidents";
import { listJobs } from "@/lib/data/jobs";
import { getCurrentProfile } from "@/lib/data/profiles";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { INCIDENT_PRIORITY_META, INCIDENT_STATUS_META } from "@/lib/data/types";
import { IncidentForm } from "./incident-form";
import { IncidentStatusButtons } from "./status-buttons";

export const dynamic = "force-dynamic";

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "short" });

export default async function MediaPage() {
  const [incidents, jobsRaw, profile] = await Promise.all([listIncidents(), listJobs(), getCurrentProfile()]);
  const demo = !isSupabaseConfigured();
  const isOwner = profile?.role === "OWNER";
  const jobs = jobsRaw.map((j) => ({ id: j.id, label: `${j.reservation?.customer?.name ?? j.title ?? "Zlecenie"}${j.event_date ? " · " + j.event_date : ""}` }));

  return (
    <div className="mx-auto max-w-md px-4 py-4 pb-8">
      <PageHeader title="Zgłoszenia i szkody" subtitle="Zgłoś problem — szef go obsłuży" />

      {demo && (
        <div className="mb-4 flex items-center gap-2 rounded-card border border-[#3d3216] bg-[#241e10] px-4 py-3 text-[12px] text-warn">Tryb demo — dane przykładowe.</div>
      )}

      <IncidentForm jobs={jobs} />

      <div className="mt-5">
        <div className="mb-2 text-[13px] font-bold text-white">Zgłoszenia ({incidents.length})</div>
        {incidents.length === 0 ? (
          <EmptyState icon="warning" title="Brak zgłoszeń" desc="Zgłoszone szkody i incydenty pojawią się tutaj." />
        ) : (
          <div className="flex flex-col gap-2.5">
            {incidents.map((it) => {
              const pm = INCIDENT_PRIORITY_META[it.priority];
              const sm = INCIDENT_STATUS_META[it.status];
              return (
                <div key={it.id} className="rounded-card border border-border bg-surface p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-[13.5px] font-bold text-ink">{it.category}{it.equipment ? ` · ${it.equipment}` : ""}</div>
                    <Pill label={pm.label} fg={pm.fg} bg={pm.bg} />
                  </div>
                  {it.description && <div className="mt-1 text-[12.5px] text-ink-2">{it.description}</div>}
                  {it.resolution && <div className="mt-1.5 rounded-[8px] border border-[#1e4a2c] bg-[#12251a] px-2.5 py-1.5 text-[12px] text-ok">Odpowiedź szefa: {it.resolution}</div>}
                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[11.5px] text-muted">
                      <Pill label={sm.label} fg={sm.fg} bg={sm.bg} />
                      <span>{it.job?.title ?? "—"} · {fmtDate(it.created_at)}</span>
                    </div>
                    {isOwner && <IncidentStatusButtons id={it.id} status={it.status} resolution={it.resolution} equipment={it.equipment} category={it.category} description={it.description} />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
