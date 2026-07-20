"use server";
// Server Actions: przebieg realizacji terenowej (§19) — postęp etapów oraz
// zgłoszenie odbioru płatności na miejscu (krok „Rozliczenie”).
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { setStageStatus } from "@/lib/data/jobs";
import { createPayment } from "@/lib/data/payments";
import type { StageStatus, PaymentMethod } from "@/lib/data/types";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function advanceStageAction(stageId: string, jobId: string, status: StageStatus): Promise<ActionResult> {
  if (!isSupabaseConfigured())
    return { ok: false, error: "Tryb demo: skonfiguruj Supabase, aby zapisywać postęp." };
  try {
    await setStageStatus(stageId, status);
    revalidatePath(`/field/${jobId}`);
    revalidatePath(`/jobs/${jobId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zapisać." };
  }
}

// Krok „Rozliczenie”: pracownik zgłasza odbiór płatności na miejscu.
// Gotówka trafia do weryfikacji przez właściciela (status REPORTED),
// pozostałe metody oznaczamy jako opłacone.
export async function reportFieldPaymentAction(jobId: string, method: PaymentMethod, amount: number): Promise<ActionResult> {
  if (!isSupabaseConfigured())
    return { ok: false, error: "Tryb demo: skonfiguruj Supabase, aby zapisać płatność." };
  if (!(amount > 0)) return { ok: false, error: "Podaj kwotę większą od zera." };
  try {
    await createPayment({
      job_id: jobId,
      title: "Płatność na miejscu",
      method,
      amount,
      status: method === "CASH" ? "REPORTED" : "PAID",
      note: "Zgłoszona z realizacji terenowej",
    });
    revalidatePath(`/field/${jobId}`);
    revalidatePath(`/jobs/${jobId}`);
    revalidatePath(`/payments`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zapisać płatności." };
  }
}
