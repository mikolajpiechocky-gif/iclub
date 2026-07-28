"use client";
// §9.4 Ostrzeżenie o dodatkowym sprzęcie — możliwe do zamknięcia (zapamiętane per zlecenie
// w przeglądarce, żeby po odhaczeniu nie wracało przy każdym wejściu).
import { useEffect, useState } from "react";

export function AddonWarning({ jobId, addonNames }: { jobId: string; addonNames: string[] }) {
  const key = `addonwarn-dismissed:${jobId}`;
  const [dismissed, setDismissed] = useState(true); // domyślnie ukryte do czasu odczytu (bez mignięcia)

  useEffect(() => {
    // Odczyt po zamontowaniu (SSR i pierwszy render dają domyślnie ukryte — brak rozjazdu hydratacji).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(localStorage.getItem(key) === "1");
  }, [key]);

  if (dismissed || addonNames.length === 0) return null;

  const close = () => { localStorage.setItem(key, "1"); setDismissed(true); };

  return (
    <div className="mb-3.5 rounded-[13px] border border-[#3d3216] bg-[#241e10] px-3.5 py-3 text-[12.5px] text-warn">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <div className="font-bold">⚠ Realizacja zawiera dodatkowy sprzęt ({addonNames.length})</div>
          <div className="mt-0.5 text-[12px] text-warn">Uwzględnij większy czas pakowania i montażu. Dodatki: {addonNames.join(", ")}.</div>
        </div>
        <button onClick={close} aria-label="Zamknij ostrzeżenie" className="flex-none rounded-[8px] px-2 py-0.5 text-[16px] font-bold leading-none text-warn/70 hover:text-warn">×</button>
      </div>
    </div>
  );
}
