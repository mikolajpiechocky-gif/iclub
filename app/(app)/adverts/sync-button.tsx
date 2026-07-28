"use client";
// Przyciski: synchronizacja ogłoszeń OLX + czyszczenie (naprawa po błędnym spięciu).
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { syncOlxAdvertsAction, clearOlxAdvertsAction } from "./actions";

export function AdvertsSyncButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const run = () => {
    setMsg(null);
    start(async () => {
      const r = await syncOlxAdvertsAction();
      if (r.ok) {
        setMsg(`Zsynchronizowano ${r.synced} ogłoszeń.`);
        router.refresh();
      } else {
        setMsg(r.error ?? "Nie udało się zsynchronizować.");
      }
    });
  };

  const clear = () => {
    if (typeof window !== "undefined" && !window.confirm("Usunąć wszystkie zaimportowane ogłoszenia OLX? Konto pozostaje podpięte — kolejna synchronizacja pobierze ogłoszenia z aktualnego konta na czysto.")) return;
    setMsg(null);
    start(async () => {
      const r = await clearOlxAdvertsAction();
      if (r.ok) { setMsg(`Usunięto ${r.removed} ogłoszeń.`); router.refresh(); }
      else setMsg(r.error ?? "Nie udało się usunąć.");
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {msg && <span className="text-[12px] font-semibold text-ink-2">{msg}</span>}
      <button onClick={clear} disabled={pending} className="rounded-field border border-[#3a1c1f] bg-[#251215] px-3.5 py-2.5 text-[13px] font-bold text-bad disabled:opacity-50">
        Usuń wszystkie
      </button>
      <button onClick={run} disabled={pending} className="rounded-field bg-brand px-4 py-2.5 text-[13px] font-bold text-white disabled:opacity-50">
        {pending ? "Synchronizuję…" : "Synchronizuj ogłoszenia"}
      </button>
    </div>
  );
}
