"use client";
// app/(app)/costs/new/page.tsx — Formularz kosztu (MOBILE, bardzo szybki).
// Duża kwota, kategorie jako chipy, zdjęcie paragonu, przypięta akcja.
import Link from "next/link";
import { useState } from "react";
import { PrimaryButton, SelectField, TextField } from "@/components/ui";
import { Icon } from "@/components/icons";
import { COST_CATEGORIES } from "@/lib/demo-data";

export default function NewCostPage() {
  const [amount, setAmount] = useState("");
  const [cat, setCat] = useState("Paliwo");

  return (
    <div className="mx-auto max-w-md px-4 py-4 pb-28">
      <div className="mb-3 flex items-center gap-2.5">
        <Link href="/field" className="text-[13px] font-bold text-ink-2">‹ Realizacja</Link>
        <span className="ml-auto text-[12px] font-semibold text-ink-2">Zlecenie #1042</span>
      </div>
      <h1 className="mb-4 font-display text-[22px] font-bold text-white">Dodaj koszt</h1>

      {/* Kwota — duże pole */}
      <div className="mb-4 rounded-card border border-border bg-surface p-4 text-center">
        <div className="text-[11px] font-semibold uppercase tracking-[0.6px] text-ink-2">Kwota</div>
        <div className="mt-1 flex items-center justify-center gap-1">
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="0" className="w-40 bg-transparent text-center font-display text-[40px] font-bold text-white outline-none placeholder:text-muted" />
          <span className="font-display text-[24px] font-bold text-ink-2">zł</span>
        </div>
      </div>

      {/* Kategorie jako chipy */}
      <div className="mb-4">
        <div className="mb-2 text-[12.5px] font-semibold text-ink-2">Kategoria</div>
        <div className="flex flex-wrap gap-2">
          {COST_CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`rounded-[10px] border px-3 py-2 text-[12.5px] font-semibold transition ${cat === c ? "border-[#3a2a55] bg-[#271b3f] text-[#e0c8ff]" : "border-border bg-surface text-ink-2"}`}>{c}</button>
          ))}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <SelectField label="Pracownik"><option>Marek W.</option><option>Kuba L.</option><option>Ola G.</option></SelectField>
        <TextField label="Data" type="date" defaultValue="2026-07-18" />
      </div>
      <div className="mb-4">
        <TextField label="Opis (opcjonalnie)" placeholder="Np. tankowanie Orlen Poznań" />
      </div>

      {/* Zdjęcie paragonu */}
      <button className="mb-4 flex h-[110px] w-full flex-col items-center justify-center gap-2 rounded-card border border-dashed border-[#3a3d4a]" style={{ background: "repeating-linear-gradient(135deg,#171922,#171922 9px,#1f212c 9px,#1f212c 18px)" }}>
        <Icon name="camera" className="h-6 w-6 text-ink-2" />
        <span className="text-[12.5px] font-semibold text-ink-2">Dodaj zdjęcie paragonu</span>
      </button>

      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md px-4 pb-4" style={{ background: "linear-gradient(#0f101600,#0f1016 30%)" }}>
        <PrimaryButton block icon="check" disabled={!amount}>Zapisz koszt {amount ? `· ${amount} zł` : ""}</PrimaryButton>
      </div>
    </div>
  );
}
