"use client";
// app/(app)/checklist/page.tsx — Checklista (MOBILE). Dynamiczne kategorie,
// postęp, braki, problemy, elementy obowiązkowe. Zakończenie mimo braków
// wymaga ostrzeżenia + jednego końcowego wyjaśnienia.
import Link from "next/link";
import { useState } from "react";
import { ChecklistItem, ProgressBar, PrimaryButton, SecondaryButton, BottomSheet, Alert, TextField } from "@/components/ui";
import { DEMO_CHECKLIST, CHECKLIST_CATEGORIES } from "@/lib/demo-data";

export default function ChecklistPage() {
  const [items, setItems] = useState(DEMO_CHECKLIST);
  const [sheet, setSheet] = useState(false);
  const [reason, setReason] = useState("");

  const toggle = (id: string) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  const done = items.filter((x) => x.done).length;
  const missingRequired = items.filter((x) => x.required && !x.done).length;
  const problems = items.filter((x) => x.problem).length;
  const pct = (done / items.length) * 100;

  const finish = () => {
    if (missingRequired > 0 || done < items.length) setSheet(true); // ostrzeżenie o brakach
    else alert("Checklista zakończona ✓"); // TODO(backend): zapis
  };

  return (
    <div className="mx-auto max-w-md pb-28">
      {/* Sticky nagłówek z postępem */}
      <div className="sticky top-0 z-10 border-b border-border-soft bg-workspace px-4 py-3.5">
        <div className="mb-3 flex items-center gap-2.5">
          <Link href="/field" className="text-[13px] font-bold text-ink-2">‹ Realizacja</Link>
          <span className="ml-auto text-[13px] font-bold text-ink">{done} / {items.length}</span>
        </div>
        <div className="font-display text-[17px] font-bold text-white">Checklista pakowania</div>
        <div className="mt-0.5 text-[11px] text-ink-2">Zawartość listy — do ustalenia na późniejszym etapie</div>
        <ProgressBar value={pct} className="mt-3" />
        <div className="mt-2.5 flex gap-3.5 text-[11.5px] font-semibold">
          <span className="text-ok">✓ {done} gotowe</span>
          <span className="text-warn">▲ {problems} problem</span>
          <span className="text-bad">● {items.length - done} braki</span>
        </div>
      </div>

      <div className="px-4">
        {CHECKLIST_CATEGORIES.map((cat) => {
          const group = items.filter((x) => x.category === cat);
          if (!group.length) return null;
          return (
            <div key={cat}>
              <div className="mt-4 mb-2 px-0.5 text-[11px] font-bold uppercase tracking-[0.7px] text-muted">{cat}</div>
              <div className="flex flex-col gap-2">
                {group.map((it) => (
                  <ChecklistItem key={it.id} label={it.label} meta={it.qty} done={it.done} required={it.required} onToggle={() => toggle(it.id)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky akcja zakończenia */}
      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md px-4 pb-4" style={{ background: "linear-gradient(#0f101600,#0f1016 30%)" }}>
        <PrimaryButton block onClick={finish}>Zakończ checklistę</PrimaryButton>
      </div>

      {/* Ostrzeżenie o brakach + końcowe wyjaśnienie */}
      <BottomSheet open={sheet} onClose={() => setSheet(false)} title="Kończysz mimo braków">
        <div className="mb-3"><Alert tone="warn" title={`${missingRequired} pozycji obowiązkowych bez odhaczenia`}>Możesz zakończyć, ale musisz podać jedno końcowe wyjaśnienie.</Alert></div>
        <div className="mb-4"><TextField label="Wyjaśnienie" placeholder="Np. kotwy uzupełnimy na miejscu z zapasu w aucie" value={reason} onChange={(e) => setReason(e.target.value)} /></div>
        <div className="flex gap-2.5">
          <SecondaryButton block onClick={() => setSheet(false)}>Wróć</SecondaryButton>
          <PrimaryButton block disabled={reason.trim().length < 3} onClick={() => setSheet(false)}>Zakończ mimo braków</PrimaryButton>
        </div>
      </BottomSheet>
    </div>
  );
}
