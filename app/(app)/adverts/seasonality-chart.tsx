"use client";
// §B3 Wykres sezonowości OLX — miesięczne przyrosty wyświetleń/telefonów, rok do roku
// (jak Search Console). Bez bibliotek: proste słupki grupowane per miesiąc, kolor = rok.
import { useState } from "react";

const MONTHS = ["Sty", "Lut", "Mar", "Kwi", "Maj", "Cze", "Lip", "Sie", "Wrz", "Paź", "Lis", "Gru"];
const YEAR_COLORS = ["#b98cf5", "#5fd68b", "#ebb05a", "#7fa8f5", "#f58585", "#e879c9"];

export interface SeasonYear { year: number; views: number[]; phones: number[] }

export function SeasonalityChart({ series }: { series: SeasonYear[] }) {
  const [metric, setMetric] = useState<"views" | "phones">("views");
  const valuesOf = (s: SeasonYear) => (metric === "views" ? s.views : s.phones);
  const max = Math.max(1, ...series.flatMap((s) => valuesOf(s)));
  const colorOf = (i: number) => YEAR_COLORS[i % YEAR_COLORS.length];
  const fmt = (n: number) => n.toLocaleString("pl-PL");

  return (
    <div className="rounded-card-lg border border-border bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="font-display text-[15px] font-bold text-white">Sezonowość {metric === "views" ? "wyświetleń" : "telefonów"}</h2>
        <div className="ml-auto flex gap-1.5">
          {(["views", "phones"] as const).map((m) => (
            <button key={m} onClick={() => setMetric(m)} className={`rounded-[8px] px-2.5 py-1 text-[11.5px] font-bold ${metric === m ? "bg-brand text-white" : "border border-border bg-surface-2 text-ink-2"}`}>
              {m === "views" ? "Wyświetlenia" : "Telefony"}
            </button>
          ))}
        </div>
      </div>

      {/* Legenda lat */}
      <div className="mb-2.5 flex flex-wrap gap-x-3 gap-y-1">
        {series.map((s, i) => (
          <span key={s.year} className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-2">
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: colorOf(i) }} />{s.year}
          </span>
        ))}
      </div>

      {/* Wykres — liczba zawsze nad słupkiem (na mobilce nie ma najechania). */}
      <div className="flex items-end gap-1" style={{ height: 150 }}>
        {MONTHS.map((mon, mi) => (
          <div key={mon} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full items-end justify-center gap-[3px]" style={{ height: 128 }}>
              {series.map((s, yi) => {
                const v = valuesOf(s)[mi];
                const h = Math.round((v / max) * 108); // zostaw miejsce na liczbę nad słupkiem
                return (
                  <div key={s.year} className="flex h-full flex-1 flex-col items-center justify-end" style={{ maxWidth: 20 }} title={`${s.year}: ${fmt(v)}`}>
                    {v > 0 && <span className="mb-0.5 text-[8.5px] font-bold leading-none text-ink">{fmt(v)}</span>}
                    <div className="w-full rounded-t-[3px] transition-all" style={{ height: Math.max(v > 0 ? 3 : 0, h), background: colorOf(yi) }} />
                  </div>
                );
              })}
            </div>
            <span className="text-[10px] font-semibold text-ink-2">{mon}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11.5px] text-ink-2">Miesięczny przyrost z dziennych pomiarów. Porównanie rok-do-roku pojawi się po roku zbierania danych.</p>
    </div>
  );
}
