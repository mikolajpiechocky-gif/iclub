"use client";
// app/(app)/media/page.tsx — Zdjęcia i szkody (MOBILE).
// Zdjęcia obowiązkowe: po montażu i podczas demontażu.
// Zgłoszenie szkody: zdjęcie, opis, sprzęt, pilność, zapis offline.
import Link from "next/link";
import { useState } from "react";
import { PrimaryButton, SelectField, Alert } from "@/components/ui";
import { Icon } from "@/components/icons";

const PHOTO_SLOTS = [
  { slot: "PO MONTAŻU", required: true, count: "3 zdjęcia", ok: true },
  { slot: "PODCZAS DEMONTAŻU", required: true, count: "brak — wymagane", ok: false },
  { slot: "DODATKOWE", required: false, count: "opcjonalne", ok: true },
];
const URGENCY = ["Niska", "Średnia", "Wysoka"] as const;

export default function MediaPage() {
  const [urgency, setUrgency] = useState<(typeof URGENCY)[number]>("Wysoka");
  const [desc, setDesc] = useState("");
  const [saved, setSaved] = useState(false);

  return (
    <div className="mx-auto max-w-md px-4 py-4 pb-8">
      <div className="mb-3 flex items-center gap-2.5">
        <Link href="/field/1042" className="text-[13px] font-bold text-ink-2">‹ Realizacja</Link>
        <span className="ml-auto text-[12px] font-semibold text-ink-2">Zlecenie #1042</span>
      </div>
      <h1 className="mb-4 font-display text-[22px] font-bold text-white">Zdjęcia i szkody</h1>

      {/* Zdjęcia */}
      <div className="mb-3 text-[13px] font-bold text-white">Zdjęcia realizacji</div>
      <div className="mb-5 grid grid-cols-3 gap-2.5">
        {PHOTO_SLOTS.map((p) => (
          <button key={p.slot} className="flex h-[104px] flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border border-[#2a2d3a]" style={{ background: "repeating-linear-gradient(135deg,#1b1d27,#1b1d27 8px,#21232e 8px,#21232e 16px)" }}>
            <Icon name="camera" className="h-5 w-5 text-[#3a3d4a]" />
            <span className="px-1 text-center font-mono text-[8.5px] leading-tight text-muted">{p.slot}</span>
            <span className="text-[10px] font-semibold" style={{ color: p.ok ? "#5fd68b" : "#f58585" }}>{p.count}</span>
          </button>
        ))}
      </div>

      {/* Zgłoszenie szkody */}
      <div className="rounded-card-lg border border-[#3a1c1f] bg-surface p-4">
        <div className="mb-3 flex items-center gap-2 text-bad"><Icon name="warning" className="h-5 w-5" /><span className="font-display text-[15px] font-bold">Zgłoś szkodę</span></div>

        {saved ? (
          <Alert tone="ok" title="Szkoda zapisana na telefonie">Zgłoszenie wyśle się automatycznie, gdy wróci zasięg. Nie musisz nic robić.</Alert>
        ) : (
          <div className="flex flex-col gap-3">
            <button className="flex h-[100px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#3a3d4a]" style={{ background: "repeating-linear-gradient(135deg,#171922,#171922 9px,#1f212c 9px,#1f212c 18px)" }}>
              <Icon name="camera" className="h-6 w-6 text-ink-2" /><span className="text-[12.5px] font-semibold text-ink-2">Zrób zdjęcie szkody</span>
            </button>
            <SelectField label="Sprzęt"><option>Namiot 6×8 Green — poszycie</option><option>Kolumna aktywna</option><option>Głowica LED</option><option>Stół koktajlowy</option></SelectField>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-semibold text-ink-2">Opis problemu</label>
              <textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} className="rounded-field border border-border bg-surface-2 px-3.5 py-3 text-[14px] text-ink outline-none focus:border-accent" placeholder="Np. rozdarcie ~15 cm przy wejściu" />
            </div>
            <div>
              <div className="mb-2 text-[12.5px] font-semibold text-ink-2">Pilność</div>
              <div className="flex gap-2">
                {URGENCY.map((u) => (
                  <button key={u} onClick={() => setUrgency(u)} className={`flex-1 rounded-[10px] border py-2.5 text-[12.5px] font-bold transition ${urgency === u ? "border-bad bg-[#341a1d] text-bad" : "border-border bg-surface-2 text-ink-2"}`}>{u}</button>
                ))}
              </div>
            </div>
            <PrimaryButton block icon="warning" disabled={desc.trim().length < 3} onClick={() => setSaved(true)}>Zapisz zgłoszenie</PrimaryButton>
          </div>
        )}
      </div>
    </div>
  );
}
