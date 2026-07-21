"use client";
// Karta integracji OLX: status, „Połącz OLX” (OAuth) i ręczna synchronizacja.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { syncOlxAction } from "./olx-actions";

export function OlxIntegrationCard({ connected, lastSyncAt }: { connected: boolean; lastSyncAt: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const sync = () => {
    setMsg(null);
    start(async () => {
      const r = await syncOlxAction();
      if (r.ok) {
        setMsg(`Gotowe: zaimportowano ${r.imported}, zaktualizowano ${r.updated} rozmów.`);
        router.refresh();
      } else {
        setMsg(r.error ?? "Nie udało się zsynchronizować.");
      }
    });
  };

  return (
    <div className="mt-5 rounded-card-lg border border-border bg-surface p-5">
      <div className="mb-2 flex items-center gap-2">
        <h2 className="font-display text-[15px] font-bold text-white">Integracja OLX</h2>
        <span className={`ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-bold ${connected ? "bg-[#16301f] text-ok" : "bg-[#241e10] text-warn"}`}>
          {connected ? "Połączono" : "Niepołączone"}
        </span>
      </div>
      <p className="mb-3 text-[12.5px] text-ink-2">
        Rozmowy z OLX trafiają do apki jako zapytania (leady) — potem oznaczasz je jako przegrane albo zmieniasz w rezerwację.
        {connected && lastSyncAt ? ` Ostatnia synchronizacja: ${new Date(lastSyncAt).toLocaleString("pl-PL")}.` : ""}
      </p>
      <div className="flex flex-wrap gap-2">
        <a href="/api/olx/connect" className="rounded-field bg-brand px-4 py-2.5 text-[13px] font-bold text-white">
          {connected ? "Połącz ponownie" : "Połącz OLX"}
        </a>
        {connected && (
          <button onClick={sync} disabled={pending} className="rounded-field border border-border bg-surface-2 px-4 py-2.5 text-[13px] font-bold text-ink disabled:opacity-50">
            {pending ? "Synchronizuję…" : "Synchronizuj rozmowy"}
          </button>
        )}
      </div>
      {msg && <p className="mt-2 text-[12px] font-semibold text-ink-2">{msg}</p>}
    </div>
  );
}
