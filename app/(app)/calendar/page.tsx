// app/(app)/calendar/page.tsx — Kalendarz (widok miesiąca; RSC).
// Mobile: pozioma legenda + kompaktowa siatka (przewijana). Desktop: pełna siatka.
import { PageHeader } from "@/components/layout";
import { DEMO_CALENDAR, CALENDAR_KIND_COLORS } from "@/lib/demo-data";

const WEEKDAYS = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nd"];
const LEGEND = [
  { t: "iClub", c: "#e11d74", b: "none" },
  { t: "Wypożyczalnia", c: "#14b8c4", b: "none" },
  { t: "Rezerw. tymcz.", c: "#171922", b: "2px dashed #3a3d4a" },
  { t: "Potwierdzone", c: "#22c55e", b: "none" },
  { t: "Konflikt", c: "#ef4444", b: "none" },
  { t: "Anulowane", c: "#3a3d4a", b: "none" },
];

// Lipiec 2026: 1 lip = środa → 2 puste komórki (Pon, Wt) na starcie.
function buildCells() {
  const cells: { day: string; today: boolean; events: { label: string; kind: string }[] }[] = [];
  for (let i = 0; i < 2; i++) cells.push({ day: "", today: false, events: [] });
  for (let d = 1; d <= 31; d++) cells.push({ day: String(d), today: d === 18, events: DEMO_CALENDAR[d] || [] });
  while (cells.length % 7 !== 0) cells.push({ day: "", today: false, events: [] });
  return cells;
}

export default function CalendarPage() {
  const cells = buildCells();
  return (
    <div className="mx-auto max-w-[1280px] px-5 py-6 md:px-8">
      <PageHeader
        title="Kalendarz"
        subtitle="Lipiec 2026"
        actions={
          <div className="flex gap-2 rounded-[11px] border border-border bg-surface p-1">
            <button className="bg-brand rounded-lg px-3.5 py-1.5 text-[12.5px] font-bold text-white">Miesiąc</button>
            <button className="rounded-lg px-3.5 py-1.5 text-[12.5px] font-semibold text-ink-2">Tydzień</button>
            <button className="rounded-lg px-3.5 py-1.5 text-[12.5px] font-semibold text-ink-2">Lista</button>
          </div>
        }
      />

      <div className="mb-3.5 flex flex-wrap gap-3.5">
        {LEGEND.map((l) => (
          <span key={l.t} className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink">
            <span className="h-2.5 w-3.5 rounded-[3px]" style={{ background: l.c, border: l.b }} />{l.t}
          </span>
        ))}
      </div>

      {/* Poziomy scroll na wąskich ekranach zamiast łamania siatki */}
      <div className="overflow-x-auto rounded-card border border-border bg-surface">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-7 border-b border-border bg-[#12131a]">
            {WEEKDAYS.map((w) => (
              <div key={w} className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.5px] text-muted">{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((c, i) => (
              <div key={i} className="min-h-[104px] border-b border-r border-[#21232e] p-2" style={{ background: c.today ? "#241019" : c.day ? "#171922" : "#12131a" }}>
                <div className="mb-1.5 text-[12px] font-bold" style={{ color: c.today ? "#f26fa6" : c.day ? "#b4b9c6" : "#3a3d4a" }}>{c.day}</div>
                {c.events.map((e, j) => {
                  const col = CALENDAR_KIND_COLORS[e.kind];
                  return (
                    <div key={j} className="mb-1 truncate rounded border-l-[3px] px-1.5 py-1 text-[10.5px] font-semibold" style={{ background: col.bg, color: col.fg, borderColor: col.br }}>{e.label}</div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
