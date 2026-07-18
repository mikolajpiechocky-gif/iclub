"use client";
// app/(app)/conflicts/page.tsx — Widok konfliktu dostępności.
// Konflikt NIE blokuje właściciela, ale musi być bardzo czytelny.
// Client: świadome nadpisanie ostrzeżenia (modal potwierdzenia).
import { useState } from "react";
import { PageHeader } from "@/components/layout";
import { SectionCard, PrimaryButton, SecondaryButton, Alert, Modal, StatusBadge } from "@/components/ui";
import { Icon } from "@/components/icons";

const OVERLAP = [
  { id: "1042", title: "Osiemnastka — Julia N.", when: "18 lip 13:30 → 19 lip 12:00", place: "Tarnowo Podgórne", status: "inprogress" as const },
  { id: "1047", title: "Impreza firmowa — Volt", when: "19 lip 12:00 → 19 lip 22:00", place: "Swarzędz", status: "planned" as const },
];
const TIMELINE = [
  { t: "Demontaż #1042", time: "19 lip 10:00–12:00", c: "#b98cf5" },
  { t: "Przejazd (24 km)", time: "19 lip 12:00–12:40", c: "#ebb05a" },
  { t: "Montaż #1047", time: "19 lip 12:40–14:00 ⚠ za późno", c: "#f58585" },
];

export default function ConflictsPage() {
  const [confirm, setConfirm] = useState(false);
  const [overridden, setOverridden] = useState(false);

  return (
    <div className="mx-auto max-w-[900px] px-5 py-6 md:px-8">
      <PageHeader title="Konflikt dostępności" subtitle="Sprzęt zarezerwowany w dwóch nakładających się zleceniach" back={{ href: "/dashboard", label: "Pulpit" }} />

      <div className="mb-4"><Alert tone="bad" title="Namiot 6×8 Blue jest w konflikcie">Nie zdążysz z demontażem, przejazdem i montażem między zleceniami #1042 i #1047.</Alert></div>

      {overridden && <div className="mb-4"><Alert tone="warn" title="Ostrzeżenie nadpisane">Zapisano świadomą decyzję właściciela. Zespół zobaczy adnotację przy obu zleceniach.</Alert></div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SectionCard title="Nakładające się zlecenia" className="p-4">
          <div className="flex flex-col gap-3 px-4 pb-4">
            {OVERLAP.map((o) => (
              <div key={o.id} className="rounded-[13px] border border-border bg-surface-2 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[13.5px] font-bold text-ink">#{o.id}</span>
                  <StatusBadge status={o.status} />
                </div>
                <div className="mt-1 text-[13px] font-semibold text-ink">{o.title}</div>
                <div className="mt-1 text-[12px] text-ink-2">{o.when}</div>
                <div className="text-[12px] text-ink-2">{o.place}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Czas: demontaż → przejazd → montaż" className="p-4">
          <div className="px-4 pb-4">
            {TIMELINE.map((s, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-none flex-col items-center">
                  <span className="h-3 w-3 rounded-full" style={{ background: s.c }} />
                  {i < TIMELINE.length - 1 && <span className="w-0.5 flex-1 bg-border" style={{ minHeight: 26 }} />}
                </div>
                <div className="pb-4">
                  <div className="text-[13px] font-bold text-ink">{s.t}</div>
                  <div className="text-[12px] text-ink-2">{s.time}</div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Możliwe rozwiązania" className="mt-4 p-4">
        <ul className="flex flex-col gap-2 px-4 pb-4 text-[13px] text-ink">
          {["Przesuń montaż #1047 na godz. 15:00", "Użyj do #1047 namiotu 6×8 Green (po serwisie)", "Dodaj drugi zespół i pojazd", "Skróć czas montażu z pomocą klienta"].map((r) => (
            <li key={r} className="flex items-center gap-2.5 rounded-[11px] border border-border bg-surface-2 px-3.5 py-2.5"><Icon name="check" className="h-4 w-4 text-ok" />{r}</li>
          ))}
        </ul>
      </SectionCard>

      <div className="mt-5 flex flex-wrap justify-end gap-2.5">
        <SecondaryButton>Zmień rezerwację</SecondaryButton>
        <PrimaryButton onClick={() => setConfirm(true)}>Świadomie nadpisz ostrzeżenie</PrimaryButton>
      </div>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Nadpisać ostrzeżenie o konflikcie?"
        footer={
          <>
            <SecondaryButton onClick={() => setConfirm(false)}>Anuluj</SecondaryButton>
            <PrimaryButton onClick={() => { setOverridden(true); setConfirm(false); }}>Tak, nadpisuję</PrimaryButton>
          </>
        }
      >
        <p className="text-[13.5px] text-ink-2">Bierzesz odpowiedzialność za rezerwację mimo nakładania się terminów. Decyzja zostanie zapisana w historii obu zleceń.</p>
      </Modal>
    </div>
  );
}
