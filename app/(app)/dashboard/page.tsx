// app/(app)/dashboard/page.tsx — Pulpit właściciela (DESKTOP-first).
// React Server Component — brak interaktywności, dane z warstwy demo.
import Link from "next/link";
import { PageHeader, JobCard } from "@/components/layout";
import { MetricCard, SectionCard, PrimaryButton, SecondaryButton } from "@/components/ui";
import { DEMO_KPIS, DEMO_UPCOMING, DEMO_ATTENTION, DEMO_CREW, formatPLN } from "@/lib/demo-data";

const TONE_DOT: Record<string, string> = { bad: "#f58585", warn: "#ebb05a", ok: "#5fd68b", neutral: "#9096a8" };

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-[1280px] px-5 py-6 md:px-8">
      <PageHeader
        title="Pulpit"
        subtitle="Najbliższy weekend · 18–19 lipca 2026"
        actions={
          <>
            <SecondaryButton>Eksport</SecondaryButton>
            <PrimaryButton icon="plus">Nowe zapytanie</PrimaryButton>
          </>
        }
      />

      {/* KPI — 2 kol. mobile, 3 tablet, 6 desktop */}
      <div className="mb-5 grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-6">
        {DEMO_KPIS.map((k) => (
          <MetricCard key={k.label} label={k.label} value={k.value} sub={k.sub} tone={k.tone} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4.5 lg:grid-cols-[1.35fr_1fr]" style={{ gap: 18 }}>
        {/* Lewa kolumna */}
        <div className="flex flex-col gap-4.5" style={{ gap: 18 }}>
          <SectionCard
            title="Najbliższe realizacje"
            action={<Link href="/calendar" className="text-[12.5px] font-semibold">Kalendarz →</Link>}
            className="p-1.5 pb-2"
          >
            {DEMO_UPCOMING.map((r) => (
              <JobCard key={r.id} href={`/jobs/${r.id}`} day={r.day} time={r.time} client={r.client} place={r.place} tent={r.tent} team={r.team} status={r.status} />
            ))}
          </SectionCard>

          <SectionCard title="Pracownicy na realizacji" className="p-4.5" >
            <div className="grid grid-cols-1 gap-2.5 px-4 pb-4 sm:grid-cols-2">
              {DEMO_CREW.map((c) => (
                <div key={c.name} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5">
                  <span className="flex h-8.5 w-8.5 flex-none items-center justify-center rounded-[10px] text-[13px] font-bold text-white" style={{ background: "linear-gradient(135deg,#7c3aed,#e11d74)", height: 34, width: 34 }}>{c.initials}</span>
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold text-ink">{c.name}</div>
                    <div className="truncate text-[11.5px] font-medium text-ink-2">{c.job} · od {c.since}</div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* Prawa kolumna */}
        <div className="flex flex-col gap-4.5" style={{ gap: 18 }}>
          <SectionCard className="px-4.5 pt-4 pb-1">
            <div className="mb-1.5 flex items-center gap-2 px-4.5" style={{ paddingLeft: 2, paddingRight: 2 }}>
              <span className="h-2 w-2 rounded-full bg-bad" />
              <h2 className="font-display text-[15px] font-bold text-white">Wymaga uwagi</h2>
              <span className="ml-auto text-[12px] font-bold text-bad">{DEMO_ATTENTION.length}</span>
            </div>
            <div className="px-4.5 pb-1" style={{ paddingLeft: 2, paddingRight: 2 }}>
              {DEMO_ATTENTION.map((a, i) => (
                <div key={i} className="flex gap-3 border-t border-border-soft py-3 first:border-t-0">
                  <span className="mt-1.5 h-2.5 w-2.5 flex-none rounded-[3px]" style={{ background: TONE_DOT[a.tone] }} />
                  <div className="flex-1">
                    <div className="text-[13px] font-bold text-ink">{a.title}</div>
                    <div className="mt-0.5 text-[12px] font-medium text-ink-2">{a.desc}</div>
                  </div>
                  <Link href="#" className="self-center text-[12px] font-semibold">{a.cta}</Link>
                </div>
              ))}
            </div>
          </SectionCard>

          <section className="rounded-card-lg border border-[#33253f] p-5" style={{ background: "linear-gradient(155deg,#2a1533,#171922)" }}>
            <div className="mb-3.5 font-display text-[14px] font-bold text-white">Wyniki · lipiec</div>
            <div className="grid grid-cols-2 gap-3.5">
              {[
                { label: "Przychód", value: formatPLN(42300), c: "#5fd68b" },
                { label: "Koszty", value: formatPLN(11200), c: "#fff" },
                { label: "Zadatki", value: formatPLN(8900), c: "#fff" },
                { label: "Do rozliczenia", value: formatPLN(4890), c: "#fbbf7a" },
              ].map((f) => (
                <div key={f.label}>
                  <div className="text-[11px] font-semibold text-[#9aa0b2]">{f.label}</div>
                  <div className="mt-0.5 font-display text-[19px] font-bold" style={{ color: f.c }}>{f.value}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
