"use client";
// Przycisk „Oznacz zrealizowaną": kończy realizację (zlecenie → DONE) i rozlicza
// saldo „Do zapłaty" jako zapłacone. Raporty przeliczają się na żywo. Tylko OWNER.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { markRealizationDoneAction } from "./actions";

export function RealizationDoneButton({ reservationId, done }: { reservationId: string; done: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return <span className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#16301f] px-3 py-1.5 text-[12.5px] font-bold text-ok">✓ Zrealizowana</span>;
  }

  const run = () => {
    if (typeof window !== "undefined" && !window.confirm("Oznaczyć realizację jako zakończoną i rozliczyć saldo „Do zapłaty” jako zapłacone?")) return;
    setError(null);
    startTransition(async () => {
      const res = await markRealizationDoneAction(reservationId);
      if (res.ok) router.refresh();
      else setError(res.error ?? "Błąd");
    });
  };

  return (
    <span className="inline-flex items-center gap-2">
      {error && <span className="text-[11.5px] font-semibold text-bad">{error}</span>}
      <button onClick={run} disabled={pending} className="rounded-[10px] bg-ok px-3.5 py-2 text-[12.5px] font-bold text-[#08170d]">
        {pending ? "Kończenie…" : "Oznacz zrealizowaną"}
      </button>
    </span>
  );
}
