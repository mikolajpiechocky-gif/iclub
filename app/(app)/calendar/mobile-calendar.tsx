"use client";
// §5.2 Mobilny kalendarz na wzór Google Calendar: cały tydzień mieści się na
// ekranie (bez poziomego przewijania), krótkie nazwy dni, kompaktowe znaczniki,
// kliknięcie dnia otwiera agendę. Weekend (Pt–Nd) ma wyższy priorytet + osobny widok.
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { RESERVATION_STATUS_META, type ReservationStatus } from "@/lib/data/types";
import { WEATHER_KIND_STYLE, WEATHER_OK_COLOR, type WeatherWarningKind } from "@/lib/integrations/weather";

export type CalEvent = {
  id: string;
  date: string; // YYYY-MM-DD (data imprezy)
  label: string;
  status: ReservationStatus;
  weather: { ok: boolean; kinds: WeatherWarningKind[] } | null;
};

const DAY_NAMES = ["PN", "WT", "ŚR", "CZ", "PT", "SB", "ND"];
const MONTHS = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];
const FULL_DAYS = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];

const addDaysIso = (iso: string, n: number): string => {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
};

export function MobileCalendar({ events, weekStart, today }: { events: CalEvent[]; weekStart: string; today: string }) {
  const [start, setStart] = useState(weekStart);
  const [mode, setMode] = useState<"week" | "weekend">("week");
  const [selected, setSelected] = useState(() =>
    // domyślnie dziś, jeśli mieści się w tygodniu; inaczej pierwszy dzień tygodnia
    today >= weekStart && today <= addDaysIso(weekStart, 6) ? today : weekStart,
  );

  const days = Array.from({ length: 7 }, (_, i) => addDaysIso(start, i));
  const byDay = new Map<string, CalEvent[]>();
  for (const e of events) byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]);

  const monthTitle = () => {
    const [, m] = days[0].split("-").map(Number);
    const [, m2] = days[6].split("-").map(Number);
    const d1 = Number(days[0].slice(8, 10));
    const d2 = Number(days[6].slice(8, 10));
    if (m === m2) return `${d1}–${d2} ${MONTHS[m - 1]}`;
    return `${d1} ${MONTHS[m - 1]} – ${d2} ${MONTHS[m2 - 1]}`;
  };

  const goPrev = () => { const s = addDaysIso(start, -7); setStart(s); };
  const goNext = () => { const s = addDaysIso(start, 7); setStart(s); };
  const goToday = () => { setStart(weekStart); setSelected(today); setMode("week"); };

  const weekendDays = days.slice(4); // Pt, Sb, Nd

  return (
    <div className="md:hidden">
      {/* Pasek nawigacji tygodnia */}
      <div className="mb-3 flex items-center gap-2">
        <button onClick={goPrev} aria-label="Poprzedni tydzień" className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-border bg-surface text-ink-2">
          <Icon name="chevron-left" className="h-4 w-4" />
        </button>
        <div className="flex-1 text-center text-[13.5px] font-bold text-ink">{monthTitle()}</div>
        <button onClick={goNext} aria-label="Następny tydzień" className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-border bg-surface text-ink-2">
          <Icon name="chevron-right" className="h-4 w-4" />
        </button>
      </div>

      {/* Przełącznik Tydzień / Weekend + Dziś */}
      <div className="mb-3 flex items-center gap-2">
        <div className="flex overflow-hidden rounded-[10px] border border-border">
          <button onClick={() => setMode("week")} className={`px-3 py-1.5 text-[12.5px] font-bold ${mode === "week" ? "bg-accent text-white" : "bg-surface text-ink-2"}`}>Tydzień</button>
          <button onClick={() => setMode("weekend")} className={`px-3 py-1.5 text-[12.5px] font-bold ${mode === "weekend" ? "bg-accent text-white" : "bg-surface text-ink-2"}`}>Weekend</button>
        </div>
        <button onClick={goToday} className="ml-auto rounded-[10px] border border-border bg-surface px-3 py-1.5 text-[12.5px] font-semibold text-ink-2">Dziś</button>
      </div>

      {/* Pasek tygodnia — 7 kolumn, cały tydzień na ekranie */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((iso, i) => {
          const isWeekend = i >= 4; // Pt, Sb, Nd — wyższy priorytet
          const isToday = iso === today;
          const isSel = mode === "week" && iso === selected;
          const count = (byDay.get(iso) ?? []).length;
          const bad = (byDay.get(iso) ?? []).some((e) => e.weather && !e.weather.ok);
          return (
            <button
              key={iso}
              onClick={() => { setSelected(iso); setMode("week"); }}
              className={`flex flex-col items-center rounded-[11px] border py-1.5 ${isSel ? "border-accent bg-[#271017]" : isWeekend ? "border-[#2a2340] bg-[#1a1626]" : "border-border bg-surface"}`}
            >
              <span className={`text-[10px] font-bold uppercase ${isWeekend ? "text-[#c9b6f2]" : "text-muted"}`}>{DAY_NAMES[i]}</span>
              <span className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-bold ${isToday ? "bg-accent text-white" : isSel ? "text-accent-soft" : "text-ink"}`}>{Number(iso.slice(8, 10))}</span>
              <span className="mt-0.5 flex h-3 items-center gap-0.5">
                {count === 0 ? (
                  <span className="text-[9px] text-transparent">·</span>
                ) : count <= 3 ? (
                  Array.from({ length: count }).map((_, k) => <span key={k} className="h-1.5 w-1.5 rounded-full" style={{ background: bad ? "#f6a94a" : "#e11d74" }} />)
                ) : (
                  <span className="text-[9.5px] font-bold text-accent-soft">{count}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Agenda */}
      <div className="mt-4">
        {mode === "week" ? (
          <DayAgenda iso={selected} events={byDay.get(selected) ?? []} />
        ) : (
          <div className="flex flex-col gap-4">
            {weekendDays.map((iso) => (
              <DayAgenda key={iso} iso={iso} events={byDay.get(iso) ?? []} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DayAgenda({ iso, events }: { iso: string; events: CalEvent[] }) {
  const [y, m, d] = iso.split("-").map(Number);
  const weekdayIdx = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  const heading = `${FULL_DAYS[weekdayIdx]}, ${d} ${MONTHS[m - 1]}`;
  return (
    <div>
      <div className="mb-2 text-[13px] font-bold text-white">{heading}</div>
      {events.length === 0 ? (
        <p className="rounded-card border border-border bg-surface px-4 py-3 text-[12.5px] text-ink-2">Brak wydarzeń.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {events.map((e) => {
            const meta = RESERVATION_STATUS_META[e.status];
            return (
              <Link key={e.id} href={`/reservations/${e.id}/edit`} className="flex items-center gap-2.5 rounded-card border border-border bg-surface px-3.5 py-2.5" style={{ borderLeft: `3px solid ${meta.fg}` }}>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-bold text-ink">{e.label}</div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className="text-[11px] font-bold" style={{ color: meta.fg }}>{meta.label}</span>
                    {e.weather && !e.weather.ok && e.weather.kinds.map((k) => (
                      <Icon key={k} name={WEATHER_KIND_STYLE[k].icon} className="h-3.5 w-3.5" style={{ color: WEATHER_KIND_STYLE[k].color }} />
                    ))}
                    {e.weather && e.weather.ok && <Icon name="check" className="h-3.5 w-3.5" style={{ color: WEATHER_OK_COLOR }} />}
                  </div>
                </div>
                <Icon name="chevron-right" className="h-4 w-4 flex-none text-muted" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
