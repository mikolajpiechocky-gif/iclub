// app/(app)/jobs/page.tsx — Lista zleceń (RSC, Supabase lub demo).
import Link from "next/link";
import { PageHeader } from "@/components/layout";
import { EmptyState, Pill } from "@/components/ui";
import { listJobs } from "@/lib/data/jobs";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { JOB_STATUS_META } from "@/lib/data/types";

export const dynamic = "force-dynamic";

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "short" }) : "—";

export default async function JobsPage() {
  const jobs = await listJobs();
  const demo = !isSupabaseConfigured();

  return (
    <div className="mx-auto max-w-[1280px] px-5 py-6 md:px-8">
      <PageHeader
        title="Zlecenia"
        subtitle={`${jobs.length} ${jobs.length === 1 ? "zlecenie" : "zleceń"} · tworzone automatycznie z rezerwacji`}
      />

      {demo && (
        <div className="mb-4 flex items-center gap-2 rounded-card border border-[#3d3216] bg-[#241e10] px-4 py-3 text-[12.5px] text-warn">
          Tryb demo — dane przykładowe. Zlecenia powstają automatycznie po utworzeniu rezerwacji.
        </div>
      )}

      {jobs.length === 0 ? (
        <EmptyState
          icon="clipboard"
          title="Brak zleceń"
          desc="Zlecenia powstają automatycznie z rezerwacji. Utwórz rezerwację, aby zobaczyć tu zlecenie."
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-card border border-border bg-surface md:block">
            <table className="w-full text-left">
              <thead className="border-b border-border bg-[#12131a] text-[11px] font-bold uppercase tracking-[0.5px] text-muted">
                <tr>
                  {["Zlecenie", "Klient", "Termin", "Namiot", "Pakiet", "Status", ""].map((h, i) => (
                    <th key={i} className="px-4 py-3 font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => {
                  const m = JOB_STATUS_META[j.status];
                  return (
                    <tr key={j.id} className="border-b border-border-soft last:border-0 hover:bg-surface-2">
                      <td className="px-4 py-3"><Link href={`/jobs/${j.id}`} className="text-[13.5px] font-bold text-ink">{j.title || "Zlecenie"}</Link></td>
                      <td className="px-4 py-3 text-[13px] text-ink-2">{j.reservation?.customer?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-[13px] text-ink">{fmtDate(j.event_date)}</td>
                      <td className="px-4 py-3 text-[13px] text-ink-2">{j.reservation?.tent?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-[13px] text-ink-2">{j.reservation?.package?.name ?? "—"}</td>
                      <td className="px-4 py-3"><Pill label={m.label} fg={m.fg} bg={m.bg} /></td>
                      <td className="px-4 py-3 text-right"><Link href={`/jobs/${j.id}`} className="text-[12.5px] font-semibold">Otwórz →</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {jobs.map((j) => {
              const m = JOB_STATUS_META[j.status];
              return (
                <Link key={j.id} href={`/jobs/${j.id}`} className="rounded-card border border-border bg-surface p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-[14.5px] font-bold text-ink">{j.title || "Zlecenie"}</div>
                    <Pill label={m.label} fg={m.fg} bg={m.bg} />
                  </div>
                  <div className="mt-1 text-[12.5px] font-medium text-ink-2">{[j.reservation?.customer?.name, j.reservation?.tent?.name, j.reservation?.package?.name].filter(Boolean).join(" · ") || "—"}</div>
                  <div className="mt-2 text-[12px] text-ink-2">📅 {fmtDate(j.event_date)}</div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
