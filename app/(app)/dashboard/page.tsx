// app/(app)/dashboard/page.tsx — Pulpit właściciela (RSC, dane z Supabase lub demo).
import Link from "next/link";
import { PageHeader } from "@/components/layout";
import { MetricCard, SectionCard, PrimaryButton, SecondaryButton, Pill, EmptyState } from "@/components/ui";
import { listReservations } from "@/lib/data/reservations";
import { listInquiries } from "@/lib/data/inquiries";
import { listCustomers } from "@/lib/data/customers";
import { listJobs } from "@/lib/data/jobs";
import { getCurrentProfile } from "@/lib/data/profiles";
import { fuelReminderDue } from "@/lib/data/settings";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { RESERVATION_STATUS_META, type ReservationWithRefs } from "@/lib/data/types";

export const dynamic = "force-dynamic";

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "short" }) : "—";

function resRange(r: ReservationWithRefs) {
  const start = r.setup_date ?? r.event_date;
  const end = r.teardown_date ?? r.event_date ?? start;
  return { start, end };
}

function countTentConflicts(reservations: ReservationWithRefs[]): number {
  const active = reservations.filter(
    (r) => r.tent_id && (r.status === "TEMPORARY" || r.status === "CONFIRMED") && (r.setup_date || r.event_date)
  );
  let count = 0;
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      if (active[i].tent_id !== active[j].tent_id) continue;
      const a = resRange(active[i]);
      const b = resRange(active[j]);
      if (a.start && b.start && a.start <= (b.end ?? b.start) && (a.end ?? a.start) >= b.start) count++;
    }
  }
  return count;
}

export default async function DashboardPage() {
  const [reservations, inquiries, customers, jobs, profile, fuelDue] = await Promise.all([
    listReservations(),
    listInquiries(),
    listCustomers(),
    listJobs(),
    getCurrentProfile(),
    fuelReminderDue(),
  ]);
  const demo = !isSupabaseConfigured();
  const isOwner = profile?.role === "OWNER";

  const now = new Date();
  const todayStr = isoDay(now);
  const plus7 = new Date(now);
  plus7.setDate(now.getDate() + 7);
  const plus7Str = isoDay(plus7);

  const upcoming = reservations
    .filter((r) => r.event_date && r.event_date >= todayStr && r.status !== "CANCELLED")
    .sort((a, b) => (a.event_date! < b.event_date! ? -1 : 1));

  const near7 = upcoming.filter((r) => r.event_date! <= plus7Str).length;
  const toConfirm = upcoming.filter((r) => r.event_date! <= plus7Str && !r.client_confirmed);
  const newInquiries = inquiries.filter((q) => q.status === "NEW").length;
  const noDeposit = reservations.filter(
    (r) => (r.status === "TEMPORARY" || r.status === "CONFIRMED") && (!r.deposit || r.deposit === 0)
  );
  const conflicts = countTentConflicts(reservations);
  const plannedJobs = jobs.filter((j) => j.status === "PLANNED").length;

  const kpis = [
    { label: "Najbliższe (7 dni)", value: String(near7), sub: toConfirm.length ? `${toConfirm.length} do potwierdzenia` : `${upcoming.length} nadchodzących`, tone: (toConfirm.length ? "warn" : "neutral") as "warn" | "neutral" },
    { label: "Nowe zapytania", value: String(newInquiries), sub: `${inquiries.length} łącznie`, tone: "neutral" as const },
    { label: "Rezerwacje bez zadatku", value: String(noDeposit.length), sub: noDeposit.length ? "wymaga uwagi" : "brak", tone: (noDeposit.length ? "warn" : "neutral") as "warn" | "neutral" },
    { label: "Konflikty namiotu", value: String(conflicts), sub: conflicts ? "sprawdź terminy" : "brak", tone: (conflicts ? "bad" : "neutral") as "bad" | "neutral" },
    { label: "Zlecenia zaplanowane", value: String(plannedJobs), sub: `${jobs.length} zleceń`, tone: "neutral" as const },
    { label: "Klienci", value: String(customers.length), sub: "w bazie", tone: "neutral" as const },
  ];

  const attention: { tone: "bad" | "warn"; title: string; desc: string; href: string }[] = [];
  if (isOwner && fuelDue) attention.push({ tone: "warn", title: "Zaktualizuj ceny paliwa", desc: "Minęły 2 tygodnie od ostatniej aktualizacji cen paliwa.", href: "/settings" });
  if (conflicts > 0) attention.push({ tone: "bad", title: `Konflikt namiotu (${conflicts})`, desc: "Nakładające się rezerwacje tego samego namiotu.", href: "/calendar" });
  for (const r of toConfirm.slice(0, 4)) {
    attention.push({ tone: "warn", title: "Potwierdź z klientem (≤7 dni)", desc: `${r.customer?.name ?? "—"} · ${r.event_type ?? ""} ${fmtDate(r.event_date)}`, href: `/reservations/${r.id}` });
  }
  const invoicesToDo = reservations.filter(
    (r) => r.is_invoice && !r.invoice_issued && r.status !== "CANCELLED" && r.event_date && r.event_date <= todayStr,
  );
  for (const r of invoicesToDo.slice(0, 4)) {
    attention.push({ tone: "warn", title: "Wystaw fakturę VAT", desc: `${r.customer?.name ?? "—"} · ${r.event_type ?? ""} ${fmtDate(r.event_date)}`, href: `/reservations/${r.id}` });
  }
  for (const r of noDeposit.slice(0, 4)) {
    attention.push({ tone: "warn", title: "Rezerwacja bez zadatku", desc: `${r.customer?.name ?? "—"} · ${r.event_type ?? ""} ${fmtDate(r.event_date)}`, href: `/reservations/${r.id}/edit` });
  }

  const recentInquiries = inquiries.slice(0, 5);

  return (
    <div className="mx-auto max-w-[1280px] px-5 py-6 md:px-8">
      <PageHeader
        title="Pulpit"
        subtitle={now.toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        actions={
          <>
            <Link href="/reservations/new"><SecondaryButton>Nowa rezerwacja</SecondaryButton></Link>
            <Link href="/inquiries/new"><PrimaryButton icon="plus">Nowe zapytanie</PrimaryButton></Link>
          </>
        }
      />

      {demo && (
        <div className="mb-4 flex items-center gap-2 rounded-card border border-[#3d3216] bg-[#241e10] px-4 py-3 text-[12.5px] text-warn">
          Tryb demo — dane przykładowe. Po skonfigurowaniu Supabase pulpit liczy z prawdziwych danych.
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <MetricCard key={k.label} label={k.label} value={k.value} sub={k.sub} tone={k.tone} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="flex flex-col gap-4">
          <SectionCard title="Najbliższe realizacje" action={<Link href="/calendar" className="text-[12.5px] font-semibold">Kalendarz →</Link>} className="p-1.5 pb-2">
            {upcoming.length === 0 ? (
              <div className="px-3 py-4"><EmptyState icon="calendar" title="Brak nadchodzących" desc="Utwórz rezerwację, aby zobaczyć ją tutaj." /></div>
            ) : (
              upcoming.slice(0, 6).map((r) => {
                const m = RESERVATION_STATUS_META[r.status];
                return (
                  <Link key={r.id} href={`/reservations/${r.id}/edit`} className="flex items-center gap-3.5 rounded-[13px] px-3.5 py-3 transition hover:bg-surface-2">
                    <div className="w-14 flex-none text-center">
                      <div className="font-display text-[13px] font-bold text-accent-soft">{fmtDate(r.event_date)}</div>
                    </div>
                    <div className="h-9 w-px flex-none bg-border" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-bold text-ink">{r.customer?.name ?? r.event_type ?? "Rezerwacja"}</div>
                      <div className="mt-0.5 truncate text-[12px] font-medium text-ink-2">{[r.location, r.tent?.name, r.package?.name].filter(Boolean).join(" · ") || "—"}</div>
                    </div>
                    <Pill label={m.label} fg={m.fg} bg={m.bg} />
                  </Link>
                );
              })
            )}
          </SectionCard>

          <SectionCard title="Najnowsze zapytania" action={<Link href="/inquiries" className="text-[12.5px] font-semibold">Wszystkie →</Link>} className="p-1.5 pb-2">
            {recentInquiries.length === 0 ? (
              <div className="px-3 py-4"><EmptyState title="Brak zapytań" desc="Dodaj pierwsze zapytanie." /></div>
            ) : (
              recentInquiries.map((q) => (
                <Link key={q.id} href={`/inquiries/${q.id}/edit`} className="flex items-center gap-3 rounded-[13px] px-3.5 py-2.5 transition hover:bg-surface-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-bold text-ink">{q.customer?.name ?? "— bez klienta —"}</div>
                    <div className="truncate text-[12px] text-ink-2">{[q.event_type, q.location].filter(Boolean).join(" · ") || "—"}</div>
                  </div>
                  <div className="text-[12px] font-semibold text-ink-2">{fmtDate(q.event_date)}</div>
                </Link>
              ))
            )}
          </SectionCard>
        </div>

        <div className="flex flex-col gap-4">
          <SectionCard className="px-4 pt-4 pb-2">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-bad" />
              <h2 className="font-display text-[15px] font-bold text-white">Wymaga uwagi</h2>
              <span className="ml-auto text-[12px] font-bold text-bad">{attention.length}</span>
            </div>
            {attention.length === 0 ? (
              <p className="px-1 py-3 text-[13px] text-ink-2">Nic nie wymaga uwagi 👍</p>
            ) : (
              attention.map((a, i) => (
                <Link key={i} href={a.href} className="flex gap-3 border-t border-border-soft py-3 first:border-t-0">
                  <span className="mt-1.5 h-2.5 w-2.5 flex-none rounded-[3px]" style={{ background: a.tone === "bad" ? "#f58585" : "#ebb05a" }} />
                  <div className="flex-1">
                    <div className="text-[13px] font-bold text-ink">{a.title}</div>
                    <div className="mt-0.5 text-[12px] font-medium text-ink-2">{a.desc}</div>
                  </div>
                </Link>
              ))
            )}
          </SectionCard>

          <section className="rounded-card-lg border border-[#33253f] p-5" style={{ background: "linear-gradient(155deg,#2a1533,#171922)" }}>
            <div className="mb-3.5 font-display text-[14px] font-bold text-white">Podsumowanie</div>
            <div className="grid grid-cols-2 gap-3.5">
              {[
                { label: "Rezerwacje", value: String(reservations.length) },
                { label: "Zlecenia", value: String(jobs.length) },
                { label: "Zapytania", value: String(inquiries.length) },
                { label: "Klienci", value: String(customers.length) },
              ].map((f) => (
                <div key={f.label}>
                  <div className="text-[11px] font-semibold text-[#9aa0b2]">{f.label}</div>
                  <div className="mt-0.5 font-display text-[19px] font-bold text-white">{f.value}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
