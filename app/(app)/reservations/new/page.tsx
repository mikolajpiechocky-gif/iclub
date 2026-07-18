"use client";
// app/(app)/reservations/new/page.tsx — Formularz zapytania / rezerwacji.
// Długi formularz podzielony na sekcje (kroki) + boczne podsumowanie.
// Mobile: kroki jeden pod drugim, podsumowanie na dole. Autozapis (demo).
import { useState } from "react";
import { PageHeader } from "@/components/layout";
import { SectionCard, TextField, SelectField, PrimaryButton, SecondaryButton } from "@/components/ui";
import { Icon } from "@/components/icons";
import { formatPLN } from "@/lib/demo-data";

const STEPS = ["Klient", "Wydarzenie", "Lokalizacja", "Termin", "Namiot", "Pakiet", "Dodatki", "Sprzęt", "Transport", "Cena", "Płatność", "Notatki"];

export default function ReservationFormPage() {
  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState(true); // autozapis demo

  const touch = () => setSaved(false);
  const autosave = () => setSaved(true); // TODO(backend): debounce + zapis do Supabase

  return (
    <div className="mx-auto max-w-[1180px] px-5 py-6 md:px-8">
      <PageHeader
        title="Nowa rezerwacja"
        subtitle="Zapytanie → rezerwacja · dane zapisują się automatycznie"
        back={{ href: "/inquiries", label: "Zapytania" }}
        actions={
          <span className="inline-flex items-center gap-1.5 self-center rounded-full bg-surface px-3 py-1.5 text-[12px] font-semibold" style={{ color: saved ? "#5fd68b" : "#ebb05a" }}>
            <Icon name={saved ? "check" : "refresh"} className="h-3.5 w-3.5" />{saved ? "Zapisano" : "Zapisywanie…"}
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]">
        <div>
          {/* Zakładki kroków — przewijane poziomo na mobile */}
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {STEPS.map((s, i) => (
              <button key={s} onClick={() => setStep(i)} className={`flex-none rounded-[9px] px-3 py-2 text-[12.5px] font-bold transition ${i === step ? "bg-brand text-white" : "border border-border bg-surface text-ink-2"}`}>
                <span className="mr-1.5 opacity-60">{i + 1}</span>{s}
              </button>
            ))}
          </div>

          <SectionCard title={`${step + 1}. ${STEPS[step]}`} className="p-5">
            <div className="grid grid-cols-1 gap-4 px-5 pb-5 sm:grid-cols-2">
              {step === 0 && (<>
                <TextField label="Imię i nazwisko" placeholder="Julia Nowicka" onChange={touch} onBlur={autosave} />
                <TextField label="Telefon" placeholder="600 100 200" onChange={touch} onBlur={autosave} />
                <TextField label="E-mail" placeholder="julia@example.pl" onChange={touch} onBlur={autosave} />
                <SelectField label="Źródło zapytania" onChange={autosave}><option>Instagram</option><option>OLX</option><option>Telefon</option><option>Formularz strony</option><option>Polecenie</option><option>Facebook Marketplace</option></SelectField>
              </>)}
              {step === 1 && (<>
                <SelectField label="Typ wydarzenia" onChange={autosave}><option>Osiemnastka</option><option>Urodziny</option><option>Wieczór panieński</option><option>Wieczór kawalerski</option><option>Impreza firmowa</option><option>Wesele</option></SelectField>
                <TextField label="Liczba gości" type="number" placeholder="45" onChange={touch} onBlur={autosave} />
              </>)}
              {step === 2 && (<>
                <TextField label="Miejscowość" placeholder="Tarnowo Podgórne" onChange={touch} onBlur={autosave} />
                <TextField label="Adres" placeholder="ul. Poznańska 14" onChange={touch} onBlur={autosave} />
              </>)}
              {step === 3 && (<>
                <TextField label="Data montażu" type="date" onChange={autosave} />
                <TextField label="Data demontażu" type="date" onChange={autosave} />
              </>)}
              {step === 4 && (
                <SelectField label="Namiot" onChange={autosave}><option>6×8 Blue</option><option>6×8 Green</option><option>5,4×5,4 Yellow</option></SelectField>
              )}
              {step === 5 && (
                <SelectField label="Pakiet" onChange={autosave}><option>Pakiet Premium</option><option>Pakiet VIP</option><option>Pakiet Podstawowy</option></SelectField>
              )}
              {step === 9 && (<>
                <TextField label="Wartość zlecenia (zł)" type="number" placeholder="6800" onChange={touch} onBlur={autosave} />
                <TextField label="Rabat (zł)" type="number" placeholder="0" onChange={touch} onBlur={autosave} />
              </>)}
              {step === 10 && (<>
                <SelectField label="Metoda płatności" onChange={autosave}><option>Gotówka</option><option>Przelew</option><option>BLIK</option><option>Karta</option></SelectField>
                <TextField label="Zadatek (zł)" type="number" placeholder="2000" onChange={touch} onBlur={autosave} />
              </>)}
              {step === 11 && (
                <div className="sm:col-span-2 flex flex-col gap-1.5">
                  <label htmlFor="notes" className="text-[12.5px] font-semibold text-ink-2">Notatki</label>
                  <textarea id="notes" rows={4} onChange={touch} onBlur={autosave} className="rounded-field border border-border bg-surface-2 px-3.5 py-3 text-[14px] text-ink outline-none focus:border-accent" placeholder="Np. wjazd od podwórza, prąd z garażu…" />
                </div>
              )}
              {[6, 7, 8].includes(step) && (
                <div className="sm:col-span-2 rounded-card border border-dashed border-[#2e313d] p-8 text-center text-[13px] font-semibold text-ink-2">
                  Sekcja „{STEPS[step]}” — pola do doprecyzowania<div className="mt-1 text-[12px] text-warn">Do ustalenia</div>
                </div>
              )}
            </div>
          </SectionCard>

          <div className="mt-4 flex justify-between">
            <SecondaryButton onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>← Wstecz</SecondaryButton>
            {step < STEPS.length - 1
              ? <PrimaryButton onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>Dalej →</PrimaryButton>
              : <PrimaryButton icon="check">Utwórz rezerwację</PrimaryButton>}
          </div>
        </div>

        {/* Boczne podsumowanie (sticky na desktop) */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <SectionCard title="Podsumowanie" className="p-4">
            <div className="px-4 pb-4">
              {[["Klient", "Julia Nowicka"], ["Wydarzenie", "Osiemnastka · 45 os."], ["Termin", "18–19 lip 2026"], ["Namiot", "6×8 Blue"], ["Pakiet", "Premium"]].map(([k, v]) => (
                <div key={k} className="flex justify-between border-t border-border-soft py-2 text-[13px] first:border-t-0"><span className="text-ink-2">{k}</span><span className="font-semibold text-ink">{v}</span></div>
              ))}
              <div className="mt-3 flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5">
                <span className="text-[12px] font-semibold text-ink-2">Wartość</span>
                <span className="font-display text-[18px] font-bold text-white">{formatPLN(6800)}</span>
              </div>
              <div className="mt-1 flex justify-between px-3 text-[12px] text-ink-2"><span>Zadatek</span><span>{formatPLN(2000)}</span></div>
            </div>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
