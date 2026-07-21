"use client";
// Zarządzanie niedostępnością: dodawanie zakresu + lista z usuwaniem.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SectionCard, TextField, PrimaryButton, Alert } from "@/components/ui";
import { addAvailabilityAction, removeAvailabilityAction } from "./actions";

export interface AvailabilityEntry {
  id: string;
  who: string | null; // nazwa pracownika (widok szefa) lub null
  start_date: string;
  end_date: string;
  note: string | null;
  canRemove: boolean;
}

const fmt = (iso: string) => new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "short", year: "numeric" });

export function AvailabilityManager({ entries }: { entries: AvailabilityEntry[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await addAvailabilityAction(start, end, note);
      if (res.ok) { setStart(""); setEnd(""); setNote(""); router.refresh(); return; }
      setError(res.error ?? "Błąd");
    });
  };
  const remove = (id: string) => {
    setError(null);
    startTransition(async () => {
      const res = await removeAvailabilityAction(id);
      if (res.ok) router.refresh();
      else setError(res.error ?? "Błąd");
    });
  };

  return (
    <>
      {error && <div className="mb-4"><Alert tone="bad" title="Błąd">{error}</Alert></div>}

      <SectionCard title="Oznacz niedostępność" className="mb-4 p-5">
        <form onSubmit={add} className="grid grid-cols-1 gap-4 px-5 pb-5 sm:grid-cols-2">
          <TextField label="Od" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          <TextField label="Do (opcjonalnie)" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          <div className="sm:col-span-2"><TextField label="Powód (opcjonalnie)" placeholder="Np. urlop, sprawy rodzinne" value={note} onChange={(e) => setNote(e.target.value)} /></div>
          <div className="sm:col-span-2 flex justify-end"><PrimaryButton type="submit" icon="plus" disabled={pending}>{pending ? "Zapisywanie…" : "Dodaj niedostępność"}</PrimaryButton></div>
        </form>
      </SectionCard>

      {entries.length === 0 ? (
        <p className="text-[13px] text-ink-2">Brak zgłoszonych niedostępności.</p>
      ) : (
        <div className="overflow-hidden rounded-card border border-border bg-surface">
          {entries.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-3 border-b border-border-soft px-4 py-3.5 last:border-0">
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-bold text-ink">{a.who ? `${a.who} · ` : ""}{fmt(a.start_date)}{a.end_date !== a.start_date ? ` – ${fmt(a.end_date)}` : ""}</div>
                {a.note && <div className="mt-0.5 text-[12px] text-ink-2">{a.note}</div>}
              </div>
              {a.canRemove && <button onClick={() => remove(a.id)} disabled={pending} className="rounded-[9px] border border-[#3a1c1f] bg-[#251215] px-2.5 py-1.5 text-[11.5px] font-semibold text-bad">Usuń</button>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
