"use server";
// Server Actions: przebieg realizacji terenowej (§19) — postęp etapów oraz
// zgłoszenie odbioru płatności na miejscu (krok „Rozliczenie”).
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { setStageStatus, recomputeJobStatus, getJob, setJobStatus } from "@/lib/data/jobs";
import { createPayment, markJobPlannedPaid } from "@/lib/data/payments";
import { assignVehicle, removeJobVehicle } from "@/lib/data/vehicles";
import { saveCallDetails, setDepositDeduction } from "@/lib/data/reservations";
import { generateChecklistForJob } from "@/lib/data/checklist-gen";
import { listJobAssignments, setAssignmentEarningsSnapshot } from "@/lib/data/assignments";
import { jobEarningsCtx, buildAssignmentEarnings } from "@/lib/data/job-earnings";
import { getSettings } from "@/lib/data/settings";
import { listTransportCalcs } from "@/lib/data/transport";
import type { StageStatus, PaymentMethod } from "@/lib/data/types";

// §II.12 Ustalenia z telefonu do klienta przekazywane z formularza.
export interface ClientCallInput {
  assemblyTime: string;
  startTime: string;
  addonIds: string[];
  addonQty: Record<string, number>;
  skipGrass: boolean;
  upsellValue: number; // §II.12 wartość dodatków dosprzedanych w rozmowie (premia 15%)
}

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function advanceStageAction(stageId: string, jobId: string, status: StageStatus): Promise<ActionResult> {
  if (!isSupabaseConfigured())
    return { ok: false, error: "Tryb demo: skonfiguruj Supabase, aby zapisywać postęp." };
  try {
    await setStageStatus(stageId, status);
    // §II.11/§II.15 Zaktualizuj status zlecenia wg postępu etapów (Zaplanowane → W realizacji → Zakończone).
    await recomputeJobStatus(jobId);
    revalidatePath(`/field/${jobId}`);
    revalidatePath(`/jobs/${jobId}`);
    revalidatePath(`/field`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zapisać." };
  }
}

// §II.12 Telefon do klienta: zapis godziny montażu + startu imprezy, decyzji o sztucznej
// trawie i zaktualizowanej listy dodatków (dosprzedaż) + potwierdzenie z klientem.
export async function saveClientCallAction(reservationId: string, jobId: string, input: ClientCallInput): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Tryb demo: skonfiguruj Supabase." };
  try {
    await saveCallDetails(reservationId, {
      assemblyTime: input.assemblyTime.trim() || null,
      eventStartTime: input.startTime.trim() || null,
      addonIds: input.addonIds,
      addonQty: input.addonQty,
      skipGrass: input.skipGrass,
      upsellValue: input.upsellValue,
    });
    // §S3 Po telefonie (ustalono zakres/dodatki) wygeneruj checklistę pakowania, jeśli jej nie ma.
    await generateChecklistForJob(jobId, { onlyIfEmpty: true }).catch(() => {});
    revalidatePath(`/field/${jobId}`);
    revalidatePath(`/reservations/${reservationId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zapisać." };
  }
}

// §II.17 „Zakończ realizację" z rozładunku — domyka zlecenie: zamraża rozliczenie zarobków
// (z premią za dosprzedaż dla prowadzącego), oznacza PLANOWANE płatności jako opłacone i ustawia DONE.
export async function finishRealizationAction(jobId: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Tryb demo." };
  try {
    const job = await getJob(jobId);
    if (!job) return { ok: false, error: "Brak zlecenia." };
    try {
      const [settings, assignments, transportCalcs] = await Promise.all([getSettings(), listJobAssignments(jobId), listTransportCalcs(jobId)]);
      const ctx = jobEarningsCtx(job, settings, transportCalcs.some((c) => (c.one_way_km ?? 0) > 100));
      for (const a of assignments) {
        if (a.status !== "APPROVED") continue;
        const eb = await buildAssignmentEarnings(ctx, a.rate, a.profile_id, a.is_lead);
        await setAssignmentEarningsSnapshot(a.id, eb ?? { base: 0, baseLabel: "Brak stawki", ownerBonus: 0, total: 0, possibleBonuses: [] });
      }
    } catch (e) { console.error("snapshot", e); }
    await setJobStatus(jobId, "DONE");
    await markJobPlannedPaid(jobId);
    revalidatePath(`/field/${jobId}`);
    revalidatePath(`/reservations/${job.reservation_id ?? ""}`);
    revalidatePath(`/field`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zakończyć realizacji." };
  }
}

// §II.16 Zapis potrącenia z kaucji przy demontażu (wchodzi w przychód/rentowność realizacji).
export async function saveDepositDeductionAction(reservationId: string, jobId: string, amount: number): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Tryb demo." };
  if (!reservationId) return { ok: true }; // brak rezerwacji — nic do zapisania
  try {
    await setDepositDeduction(reservationId, amount);
    revalidatePath(`/field/${jobId}`);
    revalidatePath(`/reservations/${reservationId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zapisać." };
  }
}

// §II.14 Przypisanie / usunięcie pojazdu do realizacji z widoku pracownika.
export async function assignFieldVehicleAction(jobId: string, vehicleId: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Tryb demo: skonfiguruj Supabase." };
  if (!vehicleId) return { ok: false, error: "Wybierz pojazd." };
  try {
    await assignVehicle(jobId, vehicleId);
    revalidatePath(`/field/${jobId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się przypisać pojazdu." };
  }
}

export async function removeFieldVehicleAction(jobVehicleId: string, jobId: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Tryb demo." };
  try {
    await removeJobVehicle(jobVehicleId);
    revalidatePath(`/field/${jobId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Błąd." };
  }
}

// Krok „Rozliczenie”: pracownik zgłasza odbiór płatności na miejscu.
// Gotówka trafia do weryfikacji przez szefa (status REPORTED),
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
