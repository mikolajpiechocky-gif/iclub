// app/(app)/dashboard/page.tsx — Pulpit szefa (RSC, dane z Supabase lub demo).
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout";
import { MetricCard, SectionCard, PrimaryButton, Pill, EmptyState } from "@/components/ui";
import { listReservations } from "@/lib/data/reservations";
import { listReservationAddons } from "@/lib/data/resources";
import { listInquiries } from "@/lib/data/inquiries";
import { listJobs } from "@/lib/data/jobs";
import { listCosts } from "@/lib/data/costs";
import { listPayments } from "@/lib/data/payments";
import { listPendingAssignmentRequests, countUnsettledDoneAssignments } from "@/lib/data/assignments";
import { getCurrentProfile } from "@/lib/data/profiles";
import { fuelReminderDue } from "@/lib/data/settings";
import { listOlxAdverts } from "@/lib/data/olx-adverts";
import { analyzeFleet } from "@/lib/domain/olx-adverts";
import { olxNeedsResponse } from "@/lib/domain/lead-analysis";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { RESERVATION_STATUS_META, inquiryDisplayName } from "@/lib/data/types";
import { warsawTodayISO } from "@/lib/domain/dates";

export const dynamic = "force-dynamic";
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "short" }) : "—";
const fmtPLN = (v: number) => new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(v);

export default async function DashboardPage() {
  const [reservations, addonList, inquiries, jobs, profile, fuelDue, adverts, costs, assignmentRequests, unsettledCount, payments] = await Promise.all([
    listReservations(),
    listReservationAddons(),
    listInquiries(),
    listJobs(),
    getCurrentProfile(),
    fuelReminderDue(),
    listOlxAdverts(),
    listCosts(),
    listPendingAssignmentRequests(),
    countUnsettledDoneAssignments(),
    listPayments(),
  ]);
  // §4.5 Skrót dodatków realizacji (liczba + najważniejsze nazwy).
  const addonName = new Map(addonList.map((a) => [a.id, a.name]));
  const addonSummary = (ids: string[] | null | undefined) => {
    const names = (ids ?? []).map((id) => addonName.get(id)).filter((n): n is string => Boolean(n));
    if (names.length === 0) return null;
    const head = names.slice(0, 3).join(", ");
    const extra = names.length > 3 ? ` +${names.length - 3}` : "";
    return { count: names.length, text: head + extra };
  };
  // Pulpit jest dla szefa — pracownika odsyłamy na jego ekran Start.
  if (profile && profile.role !== "OWNER") redirect("/me");
  const demo = !isSupabaseConfigured();
  const isOwner = profile?.role === "OWNER";

  // §strefa Dziś liczone w Europe/Warsaw (nie UTC) — inaczej po lokalnej północy okno „nadchodzące"
  // i faktury przesuwały się o dzień.
  const todayStr = warsawTodayISO();
  const plus7 = new Date(todayStr + "T00:00:00Z");
  plus7.setUTCDate(plus7.getUTCDate() + 7);
  const plus7Str = plus7.toISOString().slice(0, 10);

  const upcoming = reservations
    .filter((r) => r.event_date && r.event_date >= todayStr && r.status !== "CANCELLED" && r.status !== "EXPIRED")
    .sort((a, b) => (a.event_date! < b.event_date! ? -1 : 1));

  const near7 = upcoming.filter((r) => r.event_date! <= plus7Str).length;
  // §pulpit „Nowe zapytania" liczymy z ostatnich 14 dni (nie od początku).
  const days14 = new Date(todayStr + "T00:00:00Z");
  days14.setUTCDate(days14.getUTCDate() - 14);
  const days14Str = days14.toISOString().slice(0, 10);
  const newInquiries = inquiries.filter((q) => q.status === "NEW" && (q.created_at ?? "").slice(0, 10) >= days14Str).length;
  const plannedJobs = jobs.filter((j) => j.status === "PLANNED").length;

  // §pulpit Zgłoszenia z konfiguratora dostają WŁASNE, wyróżnione miejsce na górze (gorące leady
  // gotowe do założenia rezerwacji). Najnowsze pierwsze; pełne dane kontaktowe od razu widoczne.
  const configLeads = inquiries
    .filter((q) => q.source === "WEBSITE_FORM" && q.status === "NEW")
    .sort((a, b) => ((a.created_at ?? "") < (b.created_at ?? "") ? 1 : -1));
  const configEstValue = (q: (typeof configLeads)[number]): number | null =>
    (q.config_json as { estimate?: { value?: number } } | null)?.estimate?.value ?? null;

  // §pulpit Zysk w tym miesiącu = przychód − koszty realizacji, których DATA (event_date) wypada
  // w tym miesiącu. Po dacie realizacji (a nie wpisania płatności) — inaczej świeżo wprowadzone
  // dane z całego okresu wpadały do „tego miesiąca".
  const monthPrefix = todayStr.slice(0, 7);
  const jobMonth = new Map<string, string>();
  for (const j of jobs) jobMonth.set(j.id, (j.event_date ?? j.reservation?.event_date ?? "").slice(0, 7));
  const revenueMonth = payments.filter((p) => p.status === "PAID" && p.job_id && jobMonth.get(p.job_id) === monthPrefix).reduce((s, p) => s + Number(p.amount || 0), 0);
  const costsMonth = costs.filter((c) => c.status !== "REJECTED" && c.job_id && jobMonth.get(c.job_id) === monthPrefix).reduce((s, c) => s + Number(c.amount || 0), 0);
  const profitMonth = Math.round((revenueMonth - costsMonth) * 100) / 100;
  const monthName = new Date(todayStr + "T00:00:00Z").toLocaleDateString("pl-PL", { month: "long" });

  // §4.2 Każdy kafelek prowadzi do przefiltrowanej listy rekordów, których dotyczy liczba.
  const kpis = [
    { label: "Najbliższe (7 dni)", value: String(near7), sub: `${upcoming.length} nadchodzących`, tone: "neutral" as const, href: "/reservations?filter=upcoming7" },
    { label: "Nowe zapytania", value: String(newInquiries), sub: "z ostatnich 14 dni", tone: "neutral" as const, href: "/inquiries?status=NEW" },
    { label: "Zlecenia zaplanowane", value: String(plannedJobs), sub: `${jobs.length} zleceń`, tone: "neutral" as const, href: "/reservations?filter=upcoming" },
    { label: "Zysk w tym miesiącu", value: fmtPLN(profitMonth), sub: monthName, tone: (profitMonth >= 0 ? "neutral" : "warn") as "warn" | "neutral", href: "/reports" },
  ];

  // §pulpit „Wymaga uwagi" — wszystko wymagające decyzji szefa: prośby o przypisanie, koszty do
  // akceptacji, rozliczenia pracowników, faktury, paliwo, ogłoszenia OLX.
  const attention: { tone: "bad" | "warn" | "info"; title: string; desc: string; href: string }[] = [];
  if (isOwner) {
    // Nieodpisane leady OLX (konfigurator ma własną sekcję na górze). Tylko gdy FAKTYCZNIE
    // wymagają odpowiedzi (nie „dziękuję"/po naszej odmowie) i tylko świeże (14 dni).
    const olxLeads = inquiries
      .filter((q) => q.status === "NEW" && q.source === "OLX"
        && (q.last_activity_at ?? q.created_at ?? "").slice(0, 10) >= days14Str
        && olxNeedsResponse(q.olx_messages ?? []))
      .sort((a, b) => ((a.created_at ?? "") < (b.created_at ?? "") ? -1 : 1));
    for (const q of olxLeads.slice(0, 6)) {
      attention.push({
        tone: "info",
        title: "💬 Nowy lead OLX — odpisz",
        desc: `${inquiryDisplayName(q)}${q.event_type ? " · " + q.event_type : ""}${q.created_at ? " · " + fmtDate(q.created_at) : ""}`,
        href: `/inquiries/${q.id}/edit`,
      });
    }
    // Prośby pracowników o przypisanie — priorytet (blokują realizację).
    for (const req of assignmentRequests.slice(0, 5)) {
      attention.push({ tone: "bad", title: "Prośba o przypisanie", desc: `${req.employeeName} → ${req.title}${req.eventDate ? " · " + fmtDate(req.eventDate) : ""}`, href: req.reservationId ? `/reservations/${req.reservationId}` : `/jobs/${req.jobId}` });
    }
    // Koszty do akceptacji (PENDING).
    const pendingCosts = costs.filter((c) => c.status === "PENDING");
    if (pendingCosts.length > 0) {
      attention.push({ tone: "warn", title: `Koszty do akceptacji (${pendingCosts.length})`, desc: "Zweryfikuj i zatwierdź zgłoszone koszty realizacji.", href: "/costs" });
    }
    // Pracownicy z saldem do wypłaty (zakończone realizacje, nierozliczone).
    if (unsettledCount > 0) {
      attention.push({ tone: "warn", title: `Rozliczenia pracowników (${unsettledCount})`, desc: "Zakończone realizacje z wynagrodzeniem do wypłaty.", href: "/employees" });
    }
    if (fuelDue) attention.push({ tone: "warn", title: "Zaktualizuj ceny paliwa", desc: "Minęły 2 tygodnie od ostatniej aktualizacji cen paliwa.", href: "/settings" });
    const advToReact = analyzeFleet(adverts).summary.toReact;
    if (advToReact > 0) attention.push({ tone: "warn", title: `Ogłoszenia do reakcji (${advToReact})`, desc: "Wygasają wkrótce lub już wygasły — sprawdź moduł Ogłoszenia OLX.", href: "/adverts" });
    const invoicesToDo = reservations.filter(
      (r) => r.is_invoice && !r.invoice_issued && r.status !== "CANCELLED" && r.event_date && r.event_date <= todayStr,
    );
    for (const r of invoicesToDo.slice(0, 4)) {
      attention.push({ tone: "warn", title: "Wystaw fakturę VAT", desc: `${r.customer?.name ?? "—"} · ${r.event_type ?? ""} ${fmtDate(r.event_date)}`, href: `/reservations/${r.id}` });
    }
  }

  const recentInquiries = inquiries.slice(0, 5);

  return (
    <div className="mx-auto max-w-[1280px] px-5 py-6 md:px-8">
      <PageHeader
        title="Pulpit"
        subtitle={new Date(todayStr + "T00:00:00Z").toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
        actions={
          <Link href="/reservations/new"><PrimaryButton icon="plus">Nowa rezerwacja</PrimaryButton></Link>
        }
      />

      {demo && (
        <div className="mb-4 flex items-center gap-2 rounded-card border border-[#3d3216] bg-[#241e10] px-4 py-3 text-[12.5px] text-warn">
          Tryb demo — dane przykładowe. Po skonfigurowaniu Supabase pulpit liczy z prawdziwych danych.
        </div>
      )}

      {/* §pulpit Zgłoszenia z konfiguratora — wyróżnione miejsce na samej górze (gorące leady). */}
      {isOwner && configLeads.length > 0 && (
        <div className="mb-5 rounded-card-lg border border-[#274063] bg-gradient-to-b from-[#12203a] to-[#0e1826] p-4 shadow-[0_10px_30px_rgba(20,40,80,0.35)]">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[16px]">🌐</span>
            <h2 className="font-display text-[15px] font-bold text-white">Zgłoszenia z konfiguratora</h2>
            <span className="rounded-[7px] bg-[#1b2f4d] px-2 py-0.5 text-[12px] font-bold text-[#9fc0ff]">{configLeads.length}</span>
            <Link href="/inquiries?status=NEW" className="ml-auto text-[12.5px] font-semibold text-[#9fc0ff]">Wszystkie →</Link>
          </div>
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
            {configLeads.slice(0, 6).map((q) => {
              const est = configEstValue(q);
              return (
                <Link key={q.id} href={`/inquiries/${q.id}/edit`} className="flex items-start gap-3 rounded-[12px] border border-[#243654] bg-[#0f1a2b] px-3.5 py-3 transition hover:border-[#37527e] hover:bg-[#132238]">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="truncate text-[14px] font-bold text-white">{inquiryDisplayName(q)}</span>
                      {q.contact_phone && <span className="text-[12.5px] font-semibold text-[#9fc0ff]">{q.contact_phone}</span>}
                    </div>
                    <div className="mt-0.5 truncate text-[12px] text-ink-2">
                      {[q.event_type, q.location, q.guests ? `${q.guests} os.` : null].filter(Boolean).join(" · ") || "—"}
                    </div>
                    {q.contact_email && <div className="mt-0.5 truncate text-[11.5px] text-ink-2">{q.contact_email}</div>}
                  </div>
                  <div className="flex-none text-right">
                    <div className="font-display text-[13px] font-bold text-accent-soft">{fmtDate(q.event_date)}</div>
                    {est != null && <div className="mt-0.5 text-[11.5px] font-semibold text-[#9fc0ff]">{fmtPLN(est)}</div>}
                    <div className="mt-1 text-[11px] font-semibold text-[#7fa8f5]">Otwórz →</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-5">
        {kpis.map((k) => (
          <MetricCard key={k.label} label={k.label} value={k.value} sub={k.sub} tone={k.tone} href={k.href} />
        ))}
      </div>

      {/* Wymaga uwagi (§4.1 — nad listami) */}
      <SectionCard className="mb-4 px-4 pt-4 pb-2">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-bad" />
          <h2 className="font-display text-[15px] font-bold text-white">Wymaga uwagi</h2>
          <span className="ml-auto text-[12px] font-bold text-bad">{attention.length}</span>
        </div>
        {attention.length === 0 ? (
          <p className="px-1 py-3 text-[13px] text-ink-2">Nic nie wymaga uwagi 👍</p>
        ) : (
          attention.map((a, i) => (
            <Link key={i} href={a.href} className={`flex gap-3 border-t border-border-soft py-3 first:border-t-0 ${a.tone === "info" ? "-mx-2 rounded-[10px] border-t-0 bg-[#111c2e] px-2" : ""}`}>
              <span className="mt-1.5 h-2.5 w-2.5 flex-none rounded-[3px]" style={{ background: a.tone === "bad" ? "#f58585" : a.tone === "info" ? "#7fa8f5" : "#ebb05a" }} />
              <div className="flex-1">
                <div className="text-[13px] font-bold text-ink" style={a.tone === "info" ? { color: "#7fa8f5" } : undefined}>{a.title}</div>
                <div className="mt-0.5 text-[12px] font-medium text-ink-2">{a.desc}</div>
              </div>
            </Link>
          ))
        )}
      </SectionCard>

      {/* Najnowsze zapytania (wyżej) i najbliższe realizacje (§4.1) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Najnowsze zapytania" action={<Link href="/inquiries" className="text-[12.5px] font-semibold">Wszystkie →</Link>} className="p-1.5 pb-2">
          {recentInquiries.length === 0 ? (
            <div className="px-3 py-4"><EmptyState title="Brak zapytań" desc="Pojawią się automatycznie z OLX i formularza strony." /></div>
          ) : (
            recentInquiries.map((q) => (
              <Link key={q.id} href={`/inquiries/${q.id}/edit`} className="flex items-center gap-3 rounded-[13px] px-3.5 py-2.5 transition hover:bg-surface-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-bold text-ink">{inquiryDisplayName(q)}</div>
                  <div className="truncate text-[12px] text-ink-2">{[q.event_type, q.location].filter(Boolean).join(" · ") || "—"}</div>
                </div>
                <div className="text-[12px] font-semibold text-ink-2">{fmtDate(q.event_date)}</div>
              </Link>
            ))
          )}
        </SectionCard>

        <SectionCard title="Najbliższe realizacje" action={<Link href="/calendar" className="text-[12.5px] font-semibold">Kalendarz →</Link>} className="p-1.5 pb-2">
          {upcoming.length === 0 ? (
            <div className="px-3 py-4"><EmptyState icon="calendar" title="Brak nadchodzących" desc="Utwórz rezerwację, aby zobaczyć ją tutaj." /></div>
          ) : (
            upcoming.slice(0, 6).map((r) => {
              const m = RESERVATION_STATUS_META[r.status];
              const addons = addonSummary(r.addon_ids);
              return (
                <Link key={r.id} href={`/reservations/${r.id}/edit`} className="flex items-center gap-3.5 rounded-[13px] px-3.5 py-3 transition hover:bg-surface-2">
                  <div className="w-14 flex-none text-center">
                    <div className="font-display text-[13px] font-bold text-accent-soft">{fmtDate(r.event_date)}</div>
                  </div>
                  <div className="h-9 w-px flex-none bg-border" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-bold text-ink">{r.customer?.name ?? r.event_type ?? "Rezerwacja"}</div>
                    <div className="mt-0.5 truncate text-[12px] font-medium text-ink-2">{[r.location, r.tent?.name, r.package?.name].filter(Boolean).join(" · ") || "—"}</div>
                    {addons && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="rounded-[6px] bg-[#271b3f] px-1.5 py-0.5 text-[10px] font-bold text-[#c9b6f2]">Dodatki: {addons.count}</span>
                        <span className="truncate text-[11px] text-ink-2">{addons.text}</span>
                      </div>
                    )}
                  </div>
                  <Pill label={m.label} fg={m.fg} bg={m.bg} />
                </Link>
              );
            })
          )}
        </SectionCard>
      </div>
    </div>
  );
}
