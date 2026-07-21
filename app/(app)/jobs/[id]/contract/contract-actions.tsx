"use client";
// Pasek akcji umowy: druk/PDF + zmiana statusu (szef).
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SecondaryButton, PrimaryButton, Pill } from "@/components/ui";
import { CONTRACT_STATUS_META, type ContractStatus } from "@/lib/data/types";
import { setContractStatusAction } from "./actions";

export function ContractActions({ jobId, status, isOwner }: { jobId: string; status: ContractStatus; isOwner: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const m = CONTRACT_STATUS_META[status];

  const go = (next: ContractStatus) => {
    setError(null);
    startTransition(async () => {
      const res = await setContractStatusAction(jobId, next);
      if (res.ok) router.refresh();
      else setError(res.error ?? "Błąd");
    });
  };

  return (
    <div className="no-print mb-4 flex flex-wrap items-center gap-2.5">
      <Pill label={m.label} fg={m.fg} bg={m.bg} />
      <SecondaryButton onClick={() => window.print()}>Drukuj / PDF</SecondaryButton>
      {isOwner && status === "DRAFT" && <PrimaryButton onClick={() => go("SENT")} disabled={pending}>Oznacz wysłaną</PrimaryButton>}
      {isOwner && status === "SENT" && <PrimaryButton onClick={() => go("SIGNED")} disabled={pending}>Oznacz podpisaną</PrimaryButton>}
      {isOwner && status === "SIGNED" && <SecondaryButton onClick={() => go("SENT")} disabled={pending}>Cofnij do „wysłana”</SecondaryButton>}
      {error && <span className="text-[11.5px] font-semibold text-bad">{error}</span>}
    </div>
  );
}
