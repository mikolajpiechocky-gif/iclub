"use client";
// app/(app)/field/[id]/page.tsx — Szczegóły realizacji (MOBILE, jedną ręką).
// Dwie NIEZALEŻNE fazy:
//  1) Pakowanie (często dzień wcześniej — otwierane/zamykane niezależnie),
//  2) Realizacja — pionowy stepper z zawsze widocznymi etapami:
//     W drodze → Montaż → Szkolenie klienta → Zdjęcia → Rozliczenie.
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { SyncBadge } from "@/components/ui";
import type { SyncState } from "@/lib/types";

type Pack = "none" | "open" | "done";
const STAGES = [
  { key: "droga", title: "W drodze", desc: "Dojazd na miejsce realizacji" },
  { key: "montaz", title: "Montaż", desc: "Namiot, nagłośnienie, światła" },
  { key: "szkolenie", title: "Szkolenie klienta", desc: "Obsługa sprzętu i bezpieczeństwo" },
  { key: "zdjecia", title: "Zdjęcia po ustawieniu", desc: "Stan zastany i namiot po montażu" },
  { key: "rozliczenie", title: "Rozliczenie", desc: "Płatność i podpis klienta" },
];
const SYNC_CYCLE: SyncState[] = ["synced", "pending", "syncing", "offline", "error"];

export default function FieldRealizationPage() {
  const [sync, setSync] = useState<SyncState>("pending");
  const [pack, setPack] = useState<Pack>("none");
  const [started, setStarted] = useState(false);
  const [stage, setStage] = useState(0); // liczba ukończonych etapów
  const cycleSync = () => setSync((s) => SYNC_CYCLE[(SYNC_CYCLE.indexOf(s) + 1) % SYNC_CYCLE.length]);
  const next = () => setStage((s) => Math.min(STAGES.length, s + 1));

  const packMeta = {
    none: { label: "Nie rozpoczęto", bg: "#22242e", fg: "#9aa0b2", icon: "1" },
    open: { label: "W toku", bg: "#332814", fg: "#ebb05a", icon: "1" },
    done: { label: "Zakończone", bg: "#16301f", fg: "#5fd68b", icon: "✓" },
  }[pack];

  return (
    <div className="mx-auto max-w-md pb-6">
      {/* Nagłówek realizacji */}
      <div className="px-4 pt-4 pb-4.5 text-white" style={{ background: "linear-gradient(150deg,#2a1533,#191b24)", paddingBottom: 18 }}>
        <div className="mb-3 flex items-center gap-2.5">
          <Link href="/me" className="text-[13px] font-bold text-[#c9cddb]">‹ Wróć</Link>
          <span className="ml-auto"><SyncBadge state={sync} count={3} onClick={cycleSync} /></span>
        </div>
        <div className="font-display text-[20px] font-bold">Osiemnastka — Julia N.</div>
        <div className="mt-1 text-[13px] font-medium text-[#c9cddb]">14:00 · Tarnowo Podgórne, ul. Poznańska 14</div>
        <div className="mt-3.5 flex gap-2.5">
          <a href="tel:+48600100200" className="flex-1 rounded-[13px] bg-white/10 py-3 text-center text-[13px] font-bold text-white">Zadzwoń</a>
          <button className="flex-1 rounded-[13px] bg-white py-3 text-[13px] font-bold text-[#191b24]">Nawiguj</button>
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className="mb-3.5 flex flex-wrap gap-2">
          {["Wyjazd 12:30", "Zespół 2 os.", "Iveco Daily", "6×8 Blue · Premium"].map((c) => (
            <span key={c} className="rounded-[10px] border border-border bg-surface px-2.5 py-2 text-[12px] font-semibold text-ink">{c}</span>
          ))}
        </div>

        {/* FAZA 1 — PAKOWANIE */}
        <div className="mb-3.5 rounded-[18px] border bg-surface p-4" style={{ borderColor: pack === "done" ? "#1e3d2a" : pack === "open" ? "#33253f" : "#262935" }}>
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] text-[14px] font-bold" style={{ background: pack === "done" ? "#16301f" : "#271b3f", color: pack === "done" ? "#5fd68b" : "#b98cf5" }}>{packMeta.icon}</span>
            <div className="flex-1">
              <div className="font-display text-[15px] font-bold text-white">Pakowanie</div>
              <div className="text-[11px] font-medium text-ink-2">Zwykle dzień wcześniej · niezależnie od realizacji</div>
            </div>
            <span className="rounded-full px-2.5 py-1 text-[10.5px] font-bold" style={{ background: packMeta.bg, color: packMeta.fg }}>{packMeta.label}</span>
          </div>
          {pack === "open" && (
            <Link href="/checklist" className="mt-3.5 flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-3.5 py-3">
              <span className="flex h-6 w-6 flex-none items-center justify-center rounded-lg bg-[#271b3f] text-[#b98cf5]"><Icon name="clipboard" className="h-3.5 w-3.5" /></span>
              <div className="flex-1"><div className="text-[13px] font-bold text-ink">Checklista pakowania</div><div className="text-[11px] text-ink-2">Lista pozycji — do ustalenia · 4 z 11</div></div>
              <Icon name="chevron-right" className="h-4 w-4 text-ink-2" />
            </Link>
          )}
          <div className="mt-3.5">
            {pack === "none" && <button onClick={() => setPack("open")} className="bg-brand min-h-[44px] w-full rounded-xl text-[13px] font-bold text-white">Rozpocznij pakowanie</button>}
            {pack === "open" && <button onClick={() => setPack("done")} className="min-h-[44px] w-full rounded-xl bg-[#22c55e] text-[13px] font-bold text-[#08170d]">Zakończ pakowanie</button>}
            {pack === "done" && <button onClick={() => setPack("open")} className="min-h-[44px] w-full rounded-xl border border-border bg-surface-2 text-[13px] font-semibold text-ink-2">Otwórz ponownie</button>}
          </div>
        </div>

        {/* FAZA 2 — REALIZACJA */}
        <div className="rounded-[18px] border border-border bg-surface p-4">
          <div className="mb-1 flex items-center gap-3">
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] bg-[#271b3f] text-[#b98cf5]"><Icon name="truck" className="h-4 w-4" /></span>
            <div className="flex-1"><div className="font-display text-[15px] font-bold text-white">Realizacja</div><div className="text-[11px] font-medium text-ink-2">{started ? (stage >= 5 ? "Zakończona" : "W trakcie") : "Nie rozpoczęto"}</div></div>
            {started && <span className="font-display text-[13px] font-bold text-[#b98cf5]">{stage}/5</span>}
          </div>

          {!started ? (
            <button onClick={() => { setStarted(true); setStage(0); }} className="bg-brand mt-3 min-h-[44px] w-full rounded-[14px] text-[15px] font-bold text-white shadow-[0_8px_22px_rgba(225,29,116,0.35)]">▶ Rozpocznij realizację</button>
          ) : (
            <div className="mt-3.5">
              {STAGES.map((s, i) => {
                const done = i < stage, current = i === stage;
                return (
                  <div key={s.key} className="flex gap-3">
                    <div className="flex flex-none flex-col items-center">
                      <button onClick={() => setStage(i > stage ? stage : i)} className="flex h-7.5 w-7.5 items-center justify-center rounded-full border-2 text-[13px] font-bold" style={{ height: 30, width: 30, background: done ? "#22c55e" : "#191b24", borderColor: done ? "#22c55e" : current ? "#e11d74" : "#2a2d3a", color: done ? "#08170d" : current ? "#f26fa6" : "#6b7180" }}>
                        {done ? <Icon name="check" className="h-3.5 w-3.5" /> : i + 1}
                      </button>
                      <span className="my-0.5 w-0.5 flex-1" style={{ minHeight: 18, background: i < stage ? "#22c55e" : "#262935" }} />
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="text-[14px] font-bold" style={{ color: done ? "#7c818f" : current ? "#ecedf2" : "#9096a8" }}>{s.title}</div>
                      <div className="mt-px text-[11.5px] font-medium text-ink-2">{s.desc}</div>

                      {current && s.key === "droga" && (
                        <div className="mt-2.5 flex gap-2"><button className="flex-1 rounded-[11px] border border-border bg-surface-2 py-2.5 text-[12px] font-bold text-ink">Nawiguj</button><button onClick={next} className="flex-1 rounded-[11px] bg-[#22c55e] py-2.5 text-[12px] font-bold text-[#08170d]">Jestem na miejscu →</button></div>
                      )}
                      {current && s.key === "montaz" && (
                        <button onClick={next} className="mt-2.5 w-full rounded-[11px] bg-[#22c55e] py-2.5 text-[12px] font-bold text-[#08170d]">Montaż gotowy →</button>
                      )}
                      {current && s.key === "szkolenie" && (
                        <div className="mt-2.5 rounded-[11px] border border-border bg-surface-2 p-3">
                          <div className="mb-1.5 text-[11.5px] font-semibold text-ink-2">Omów z klientem:</div>
                          <div className="text-[12px] font-semibold leading-7 text-ink">✓ Obsługa nagłośnienia<br />✓ Sterowanie światłem i dymem<br />✓ Zasady bezpieczeństwa</div>
                          <button onClick={next} className="mt-2.5 w-full rounded-[11px] bg-[#22c55e] py-2.5 text-[12px] font-bold text-[#08170d]">Szkolenie zrobione →</button>
                        </div>
                      )}
                      {current && s.key === "zdjecia" && (
                        <>
                          <div className="mt-2.5 flex gap-2.5">
                            {["STAN ZASTANY", "PO MONTAŻU"].map((slot) => (
                              <button key={slot} className="flex h-[88px] flex-1 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-[11px] border border-[#2a2d3a]" style={{ background: "repeating-linear-gradient(135deg,#1b1d27,#1b1d27 8px,#21232e 8px,#21232e 16px)" }}>
                                <Icon name="camera" className="h-5 w-5 text-[#3a3d4a]" /><span className="font-mono text-[9px] text-muted">{slot}</span>
                              </button>
                            ))}
                          </div>
                          <button onClick={next} className="mt-2.5 w-full rounded-[11px] bg-[#22c55e] py-2.5 text-[12px] font-bold text-[#08170d]">Zdjęcia dodane →</button>
                        </>
                      )}
                      {current && s.key === "rozliczenie" && (
                        <div className="mt-2.5 rounded-[11px] border border-border bg-surface-2 p-3">
                          <div className="mb-2.5 flex items-center justify-between"><span className="text-[12px] font-semibold text-ink-2">Do zapłaty</span><span className="font-display text-[19px] font-bold text-white">4 800 zł</span></div>
                          <div className="mb-2.5 flex flex-wrap gap-1.5">
                            <span className="rounded-[9px] border border-[#3a2a55] bg-[#271b3f] px-3 py-1.5 text-[11.5px] font-semibold text-ink">Gotówka</span>
                            <span className="rounded-[9px] border border-border bg-surface px-3 py-1.5 text-[11.5px] font-semibold text-ink-2">Przelew</span>
                            <span className="rounded-[9px] border border-border bg-surface px-3 py-1.5 text-[11.5px] font-semibold text-ink-2">BLIK</span>
                          </div>
                          <button className="mb-2 w-full rounded-[11px] border border-border bg-surface py-2.5 text-[12.5px] font-bold text-ok">✓ Gotówka odebrana</button>
                          <Link href="/signature" className="mb-2 block rounded-[11px] border border-dashed border-[#3a3d4a] p-3.5 text-center"><div className="text-[12.5px] font-bold text-ink">✎ Podpis klienta</div><div className="mt-px text-[10.5px] text-muted">Dotknij, aby zebrać podpis palcem</div></Link>
                          <button onClick={next} className="w-full rounded-[11px] bg-[#22c55e] py-2.5 text-[12.5px] font-bold text-[#08170d]">Zatwierdź rozliczenie →</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {stage >= 5 && <Link href="/me" className="mt-1.5 block rounded-[14px] bg-[#22c55e] py-3.5 text-center text-[15px] font-bold text-[#08170d]">✓ Zakończ realizację</Link>}
            </div>
          )}
        </div>

        {/* Akcje stałe */}
        <div className="mt-3.5 flex gap-2.5">
          <Link href="/media" className="flex-1 rounded-[13px] border border-[#3a1c1f] bg-[#251215] py-3 text-center text-[13px] font-bold text-bad">⚠ Zgłoś szkodę</Link>
          <button className="flex-1 rounded-[13px] border border-border bg-surface py-3 text-[13px] font-bold text-ink-2">Dokumenty</button>
        </div>
      </div>
    </div>
  );
}
