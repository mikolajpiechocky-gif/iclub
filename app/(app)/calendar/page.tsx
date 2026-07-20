// app/(app)/calendar/page.tsx — Kalendarz wspólny (RSC, dane z Supabase lub demo).
// Pokazuje rezerwacje na siatce miesiąca; nawigacja prev/next przez ?month=YYYY-MM.
import Link from "next/link";
import { PageHeader } from "@/components/layout";
import { Icon, type IconName } from "@/components/icons";
import { listReservations } from "@/lib/data/reservations";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { reservationCalendarTitle } from "@/lib/domain/calendar";
import { getEventWeather, type EventWeather, type WeatherWarningKind } from "@/lib/integrations/weather";
import { RESERVATION_STATUS_META, type ReservationStatus } from "@/lib/data/types";

const WARN_ICON: Record<WeatherWarningKind, IconName> = { wind: "wind", heat: "sun", rain: "droplet" };
const WEATHER_OK_MSG = "Cycuś pizdeczka, pogoda będzie lux 😎";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nd"];
const LEGEND: { status: ReservationStatus }[] = [
  { status: "TEMPORARY" }, { status: "CONFIRMED" }, { status: "CANCELLED" }, { status: "EXPIRED" },
];

const pad2 = (n: number) => String(n).padStart(2, "0");

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month: monthParam } = await searchParams;
  const now = new Date();

  let year = now.getFullYear();
  let month0 = now.getMonth(); // 0-based
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split("-").map(Number);
    year = y;
    month0 = m - 1;
  }

  const reservations = await listReservations();
  const demo = !isSupabaseConfigured();
  const monthPrefix = `${year}-${pad2(month0 + 1)}`;

  // Rezerwacje w tym miesiącu, pogrupowane po dniu (wg daty imprezy).
  const byDay = new Map<number, { id: string; label: string; status: ReservationStatus }[]>();
  for (const r of reservations) {
    if (!r.event_date || !r.event_date.startsWith(monthPrefix)) continue;
    const day = Number(r.event_date.slice(8, 10));
    const list = byDay.get(day) ?? [];
    const label = reservationCalendarTitle({
      businessLine: r.business_line,
      tentSizes: [r.tent?.size ?? null, r.tent2?.size ?? null],
      packageName: r.package?.name ?? null,
      location: r.location,
      customerCity: r.customer?.city ?? null,
      customerName: r.customer?.name ?? null,
      rentalItems: r.rental_items,
    });
    list.push({ id: r.id, label, status: r.status });
    byDay.set(day, list);
  }

  // Pogoda dla rezerwacji w tym miesiącu. getEventWeather zwraca null poza oknem
  // prognozy (~16 dni) BEZ odpytywania API, więc dla dalszych miesięcy brak kosztu.
  const monthResvs = reservations.filter((r) => r.event_date && r.event_date.startsWith(monthPrefix));
  const weatherEntries = await Promise.all(
    monthResvs.map(async (r) => [r.id, r.location && r.event_date ? await getEventWeather(r.location, r.event_date) : null] as const),
  );
  const weatherById = new Map<string, EventWeather | null>(weatherEntries);

  // Siatka miesiąca
  const firstWeekday = (new Date(year, month0, 1).getDay() + 6) % 7; // Pon=0
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const todayDay = now.getFullYear() === year && now.getMonth() === month0 ? now.getDate() : -1;

  const cells: { day: number | null; today: boolean }[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push({ day: null, today: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, today: d === todayDay });
  while (cells.length % 7 !== 0) cells.push({ day: null, today: false });

  const monthLabel = new Date(year, month0, 1).toLocaleDateString("pl-PL", { month: "long", year: "numeric" });
  const prev = month0 === 0 ? `${year - 1}-12` : `${year}-${pad2(month0)}`;
  const next = month0 === 11 ? `${year + 1}-01` : `${year}-${pad2(month0 + 2)}`;

  return (
    <div className="mx-auto max-w-[1280px] px-5 py-6 md:px-8">
      <PageHeader
        title="Kalendarz"
        subtitle={monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/calendar?month=${prev}`} className="rounded-[10px] border border-border bg-surface px-3 py-2 text-[13px] font-bold text-ink-2">‹</Link>
            <Link href="/calendar" className="rounded-[10px] border border-border bg-surface px-3 py-2 text-[12.5px] font-semibold text-ink-2">Dziś</Link>
            <Link href={`/calendar?month=${next}`} className="rounded-[10px] border border-border bg-surface px-3 py-2 text-[13px] font-bold text-ink-2">›</Link>
          </div>
        }
      />

      {demo && (
        <div className="mb-4 flex items-center gap-2 rounded-card border border-[#3d3216] bg-[#241e10] px-4 py-3 text-[12.5px] text-warn">
          Tryb demo — dane przykładowe. Po skonfigurowaniu Supabase kalendarz pokaże prawdziwe rezerwacje.
        </div>
      )}

      <div className="mb-3.5 flex flex-wrap gap-3.5">
        {LEGEND.map((l) => {
          const m = RESERVATION_STATUS_META[l.status];
          return (
            <span key={l.status} className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink">
              <span className="h-2.5 w-3.5 rounded-[3px]" style={{ background: m.fg }} />{m.label}
            </span>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-card border border-border bg-surface">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-7 border-b border-border bg-[#12131a]">
            {WEEKDAYS.map((w) => (
              <div key={w} className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.5px] text-muted">{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((c, i) => {
              const events = c.day ? byDay.get(c.day) ?? [] : [];
              return (
                <div key={i} className="min-h-[104px] border-b border-r border-[#21232e] p-2" style={{ background: c.today ? "#241019" : c.day ? "#171922" : "#12131a" }}>
                  <div className="mb-1.5 text-[12px] font-bold" style={{ color: c.today ? "#f26fa6" : c.day ? "#b4b9c6" : "#3a3d4a" }}>{c.day ?? ""}</div>
                  {events.map((e) => {
                    const m = RESERVATION_STATUS_META[e.status];
                    const w = weatherById.get(e.id) ?? null;
                    const bad = w && w.warnings.length > 0;
                    const title = w ? (bad ? w.warnings.map((x) => x.text).join(" · ") : WEATHER_OK_MSG) : undefined;
                    return (
                      <Link key={e.id} href={`/reservations/${e.id}/edit`} title={title} className="mb-1 block rounded border-l-[3px] px-1.5 py-1 text-[10.5px] font-semibold" style={{ background: m.bg, color: m.fg, borderColor: m.fg }}>
                        <span className="block truncate">{e.label}</span>
                        {w && (
                          <span className="mt-0.5 flex items-center gap-1" style={{ color: bad ? "#f4b23c" : "#5fd68b" }}>
                            {bad ? (
                              w.warnings.map((x) => <Icon key={x.kind} name={WARN_ICON[x.kind]} className="h-3 w-3" />)
                            ) : (
                              <>
                                <Icon name="check" className="h-3 w-3" />
                                <span className="truncate text-[9px] font-bold">pogoda lux</span>
                              </>
                            )}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
