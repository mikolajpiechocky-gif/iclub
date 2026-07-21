"use client";
// Przycisk synchronizacji ogłoszeń OLX.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { syncOlxAdvertsAction } from "./actions";

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

  return (
    <div className="flex items-center gap-2">
      {msg && <span className="text-[12px] font-semibold text-ink-2">{msg}</span>}
      <button onClick={run} disabled={pending} className="rounded-field bg-brand px-4 py-2.5 text-[13px] font-bold text-white disabled:opacity-50">
        {pending ? "Synchronizuję…" : "Synchronizuj ogłoszenia"}
      </button>
    </div>
  );
}
