"use client";
// app/(app)/jobs/[id]/page.tsx — Szczegóły zlecenia (DESKTOP-first, zakładki).
// Bez checklisty w zleceniu (checklista należy do realizacji).
// Zdjęcia: stan zastany / po montażu / demontaż.
import { useState } from "react";
import { PageHeader } from "@/components/layout";
import { SectionCard, StatusBadge, SecondaryButton } from "@/components/ui";
import { DEMO_JOB, DEMO_PAYMENTS, formatPLN } from "@/lib/demo-data";

const TABS = ["Przegląd", "Harmonogram", "Płatności", "Zdjęcia", "Szkody", "Podpis", "Historia"] as const;
type Tab = (typeof TABS)[number];

export default function JobDetailsPage() {
  const j = DEMO_JOB;
  const [tab, setTab] = useState<Tab>("Przegląd");

  const cards: { h: string; rows: [string, string][] }[] = [
    { h: "Klient", rows: [["Imię", j.customer.name], ["Telefon", j.customer.phone], ["E-mail", j.customer.email || "—"]] },
    { h: "Wydarzenie", rows: [["Typ", j.eventType], ["Goście", `${j.guests} osób`], ["Termin", j.dateRange]] },
    { h: "Lokalizacja", rows: [["Miejsce", j.customer.city], ["Adres", j.address], ["Trasa", j.route]] },
    { h: "Namiot i pakiet", rows: [["Namiot", j.tent], ["Pakiet", j.packageName], ["Dodatki", j.addons.join(", ")]] },
    { h: "Zespół i pojazd", rows: [["Monterzy", j.crew.join(", ")], ["Pojazd", j.vehicle], ["Prowadzi", "Mikołaj"]] },
    { h: "Rozliczenie", rows: [["Wartość", formatPLN(j.value)], ["Zadatek", `${formatPLN(j.deposit)} ✓`], ["Pozostało", formatPLN(j.value - j.deposit)]] },
  ];

  return (
    <div className="mx-auto max-w-[1180px] px-5 py-6 md:px-8">
      <PageHeader title={j.title} subtitle={`Zlecenie #${j.id} · ${j.eventType} · ${j.guests} osób · ${j.dateRange}`} back={{ href: "/dashboard", label: "Zlecenia" }} />

      {/* Nagłówek zlecenia */}
      <div className="mb-4 rounded-card-lg border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-[22px] font-bold text-white">#{j.id}</h2>
            <StatusBadge status={j.status} />
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <div><div className="text-[11px] font-semibold text-ink-2">Wartość</div><div className="font-display text-[20px] font-bold text-white">{formatPLN(j.value)}</div></div>
            <div><div className="text-[11px] font-semibold text-ink-2">Do zapłaty</div><div className="font-display text-[20px] font-bold text-warn">{formatPLN(j.value - j.deposit)}</div></div>
            <SecondaryButton>Edytuj</SecondaryButton>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-1 border-t border-border-soft pt-3">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-[9px] px-3.5 py-2 text-[12.5px] font-bold transition ${tab === t ? "bg-brand text-white" : "bg-surface-2 text-ink-2"}`}>{t}</button>
          ))}
        </div>
      </div>

      {tab === "Przegląd" && (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <div key={c.h} className="rounded-[14px] border border-border bg-surface p-4">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.6px] text-ink-2">{c.h}</div>
              {c.rows.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2 py-1 text-[13px] font-semibold"><span className="text-ink-2">{k}</span><span className="text-right text-ink">{v}</span></div>
              ))}
            </div>
          ))}
        </div>
      )}

      {tab === "Harmonogram" && (
        <SectionCard title="Harmonogram realizacji" className="p-5">
          <div className="px-5 pb-5">
            {j.schedule.map((s, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-24 flex-none text-right"><div className="font-display text-[14px] font-bold text-ink">{s.time}</div><div className="text-[10.5px] font-semibold text-ink-2">{s.date}</div></div>
                <div className="flex flex-none flex-col items-center"><span className="h-3.5 w-3.5 rounded-full border-[3px] border-[#271b3f] bg-[#b98cf5]" />{i < j.schedule.length - 1 && <span className="w-0.5 flex-1 bg-border" style={{ minHeight: 22 }} />}</div>
                <div className="pb-4"><div className="text-[13.5px] font-bold text-ink">{s.title}</div><div className="mt-0.5 text-[12px] text-ink-2">{s.desc}</div></div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {tab === "Płatności" && (
        <SectionCard title="Płatności" className="p-5">
          <div className="px-5 pb-5">
            {DEMO_PAYMENTS.slice(0, 3).map((p) => (
              <div key={p.id} className="flex items-center gap-3 border-t border-border-soft py-3 first:border-t-0">
                <div className="flex-1"><div className="text-[13.5px] font-bold text-ink">{p.title}</div><div className="text-[12px] text-ink-2">{p.meta}</div></div>
                <div className="font-display text-[15px] font-bold text-white">{formatPLN(p.amount)}</div>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {tab === "Zdjęcia" && (
        <SectionCard title="Zdjęcia realizacji" className="p-5">
          <div className="px-5 pb-5">
            <p className="mb-4 text-[12.5px] text-ink-2">Dokumentacja stanu sprzętu — obowiązkowa przy montażu i demontażu.</p>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
              {[
                { slot: "STAN ZASTANY", title: "Stan zastany", desc: "Teren i sprzęt przed montażem", count: "2 zdjęcia", ok: true },
                { slot: "PO MONTAŻU", title: "Po montażu", desc: "Namiot i sprzęt gotowy", count: "3 zdjęcia", ok: true },
                { slot: "DEMONTAŻ", title: "Podczas demontażu", desc: "Stan przy zwrocie", count: "brak — wymagane", ok: false },
              ].map((p) => (
                <div key={p.slot}>
                  <div className="flex h-[150px] flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-[#2a2d3a]" style={{ background: "repeating-linear-gradient(135deg,#1b1d27,#1b1d27 9px,#21232e 9px,#21232e 18px)" }}>
                    <span className="font-mono text-[10.5px] text-muted">ZDJĘCIE — {p.slot}</span>
                    <span className="text-[11px] font-semibold" style={{ color: p.ok ? "#5fd68b" : "#f58585" }}>{p.count}</span>
                  </div>
                  <div className="mt-2 text-[12.5px] font-bold text-ink">{p.title}</div>
                  <div className="text-[11px] text-ink-2">{p.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      )}

      {(tab === "Szkody" || tab === "Podpis" || tab === "Historia") && (
        <div className="rounded-card border border-dashed border-[#2e313d] p-11 text-center text-[14px] font-semibold text-ink-2">
          Sekcja „{tab}” — do zaprojektowania w kolejnej iteracji<div className="mt-1.5 text-[12px] text-warn">Do ustalenia</div>
        </div>
      )}
    </div>
  );
}
