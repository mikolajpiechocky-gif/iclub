"use client";
// §wypożyczalnia Telefon do klienta przy wynajmie z transportem: TYLKO potwierdzenie godziny
// dostawy i przejęcie kontaktu przez pracownika realizującego. Odbiór własny nie wymaga telefonu.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { Alert } from "@/components/ui";
import { confirmRentalDeliveryAction } from "./actions";

export function RentalPhoneBlock({
  reservationId,
  jobId,
  phone,
  deliveryTime,
  done,
}: {
  reservationId: string;
  jobId: string;
  phone: string | null;
  deliveryTime: string | null;
  done: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [time, setTime] = useState(deliveryTime ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(done);

  const confirm = () => {
    setError(null);
    start(async () => {
      const r = await confirmRentalDeliveryAction(reservationId, jobId, time);
      if (r.ok) { setSaved(true); router.refresh(); } else setError(r.error ?? "Błąd");
    });
  };

  return (
    <div className="mb-3.5 rounded-[16px] border border-border bg-surface p-4">
      <div className="mb-3 flex items-center gap-3">
        <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-[10px] ${saved ? "bg-[#16301f] text-[#5fd68b]" : "bg-[#271b3f] text-[#b98cf5]"}`}>
          <Icon name={saved ? "check" : "phone"} className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-bold text-ink">Telefon do klienta <span className="text-[11px] font-semibold text-ink-2">· przed dostawą</span></div>
          <div className="text-[11.5px] font-medium text-ink-2">{saved ? "Kontakt przejęty, godzina dostawy potwierdzona" : "Potwierdź godzinę dostawy i przejmij kontakt"}</div>
        </div>
      </div>

      {phone ? (
        <a href={`tel:${phone.replace(/\s+/g, "")}`} className="mb-3 flex items-center justify-center gap-2 rounded-[11px] border border-border bg-surface-2 py-2.5 text-[12.5px] font-bold text-ink">
          <Icon name="phone" className="h-4 w-4" /> Zadzwoń {phone}
        </a>
      ) : (
        <div className="mb-3 rounded-[11px] border border-border bg-surface-2 py-2.5 text-center text-[12px] font-semibold text-ink-2/60">Brak numeru telefonu</div>
      )}

      <label className="block text-[11.5px] font-semibold text-ink-2">Ustalona godzina dostawy
        <input
          value={time}
          onChange={(e) => { setTime(e.target.value); setSaved(false); }}
          placeholder="np. 10:00"
          className="mt-1 w-full rounded-[10px] border border-border bg-surface-2 px-3 py-2 text-[13px] text-ink outline-none focus:border-accent"
        />
      </label>

      {error && <div className="mt-2"><Alert tone="bad" title="Błąd">{error}</Alert></div>}

      <button onClick={confirm} disabled={pending} className="mt-3 w-full rounded-[11px] bg-[#22c55e] py-2.5 text-[12.5px] font-bold text-[#08170d] disabled:opacity-60">
        {pending ? "Zapisywanie…" : saved ? "Zapisz zmianę" : "Potwierdź godzinę i przejmij kontakt"}
      </button>
    </div>
  );
}
