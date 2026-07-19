// app/(app)/me/page.tsx — Ekran pracownika (MOBILE, dane z Supabase lub demo).
import Link from "next/link";
import { EmptyState, Pill } from "@/components/ui";
import { getCurrentProfile } from "@/lib/data/profiles";
import { listAssignedJobs } from "@/lib/data/jobs";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { JOB_STATUS_META } from "@/lib/data/types";

export const dynamic = "force-dynamic";

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "long" }) : "—";

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? "U") + (p[1]?.[0] ?? "")).toUpperCase();
}

export default async function EmployeeDashboardPage() {
  const profile = await getCurrentProfile();
  const jobs = profile ? await listAssignedJobs(profile.id) : [];
  const demo = !isSupabaseConfigured();

  const todayStr = new Date().toISOString().slice(0, 10);
  const upcoming = jobs
    .filter((j) => j.event_date && j.event_date >= todayStr)
    .sort((a, b) => (a.event_date! < b.event_date! ? -1 : 1));
  const next = upcoming[0] ?? jobs[0];
  const name = profile?.full_name?.trim() || "Pracowniku";

  return (
    <div className="mx-auto max-w-md px-4 py-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-iclub.png" alt="iClub" className="mb-4 h-7 w-auto" />
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-[13px] text-[16px] font-bold text-white" style={{ background: "linear-gradient(135deg,#7c3aed,#e11d74)" }}>{initials(name)}</span>
        <div>
          <div className="font-display text-[18px] font-bold text-white">Cześć, {name}</div>
          <div className="text-[12.5px] font-medium text-ink-2">{jobs.length} {jobs.length === 1 ? "realizacja" : "realizacji"} przypisanych</div>
        </div>
      </div>

      {demo && (
        <div className="mb-4 flex items-center gap-2 rounded-card border border-[#3d3216] bg-[#241e10] px-4 py-3 text-[12px] text-warn">Tryb demo — dane przykładowe.</div>
      )}

      {next ? (
        <div className="mb-4 rounded-[20px] border border-[#33253f] p-4.5 text-white" style={{ background: "linear-gradient(150deg,#2a1533,#191b24)", padding: 18 }}>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#b9becf]">Najbliższa realizacja</span>
            <Pill label={JOB_STATUS_META[next.status].label} fg={JOB_STATUS_META[next.status].fg} bg={JOB_STATUS_META[next.status].bg} />
          </div>
          <div className="font-display text-[19px] font-bold">{next.reservation?.customer?.name ?? next.title ?? "Realizacja"}</div>
          <div className="mt-1 text-[13px] font-medium text-[#c9cddb]">{[fmtDate(next.event_date), next.reservation?.location].filter(Boolean).join(" · ")}</div>
          <div className="mt-3.5 flex gap-2.5">
            {[["NAMIOT", next.reservation?.tent?.name ?? "—"], ["PAKIET", next.reservation?.package?.name ?? "—"], ["OSOBY", next.reservation?.guests != null ? String(next.reservation.guests) : "—"]].map(([k, v]) => (
              <div key={k} className="flex-1 rounded-xl bg-white/[0.07] px-3 py-2.5">
                <div className="text-[10px] font-semibold text-[#9aa0b2]">{k}</div>
                <div className="mt-0.5 truncate font-display text-[13px] font-bold">{v}</div>
              </div>
            ))}
          </div>
          <Link href={`/field/${next.id}`} className="bg-brand mt-3 flex min-h-[44px] w-full items-center justify-center rounded-[13px] text-[14px] font-bold text-white">Otwórz realizację</Link>
        </div>
      ) : (
        <div className="mb-4"><EmptyState icon="truck" title="Brak przypisanych realizacji" desc="Gdy właściciel przypisze Cię do zlecenia (lub podejmiesz wolne), pojawi się tutaj." /></div>
      )}

      {upcoming.length > 1 && (
        <div className="rounded-card border border-border bg-surface p-1.5">
          <div className="px-3 pt-2 pb-1 text-[13px] font-bold text-white">Kolejne realizacje</div>
          {upcoming.slice(1).map((j) => (
            <Link key={j.id} href={`/field/${j.id}`} className="flex items-center gap-3 rounded-[12px] px-3 py-2.5 transition hover:bg-surface-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-bold text-ink">{j.reservation?.customer?.name ?? j.title ?? "Realizacja"}</div>
                <div className="truncate text-[12px] text-ink-2">{j.reservation?.location ?? "—"}</div>
              </div>
              <div className="text-[12px] font-semibold text-ink-2">{fmtDate(j.event_date)}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
