"use server";
// Server Actions: przebieg realizacji terenowej (§19) — postęp etapów oraz
// zgłoszenie odbioru płatności na miejscu (krok „Rozliczenie”).
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { setStageStatus, recomputeJobStatus, getJob, getJobStages, setJobStatus } from "@/lib/data/jobs";
import { createPayment, markJobPlannedPaid } from "@/lib/data/payments";
import { createCost, listCosts } from "@/lib/data/costs";
import { writeRealizationCosts } from "@/lib/data/realization-close";
import { rentalWorkMs, rentalLabor } from "@/lib/domain/rental";
import { assignVehicle, removeJobVehicle } from "@/lib/data/vehicles";
import { saveCallDetails, setDepositDeduction, setRentalDeliveryConfirmed } from "@/lib/data/reservations";
import { generateChecklistForJob } from "@/lib/data/checklist-gen";
import { listJobAssignments, setAssignmentEarningsSnapshot } from "@/lib/data/assignments";
import { jobEarningsCtx, buildAssignmentEarnings } from "@/lib/data/job-earnings";
import { getSettings } from "@/lib/data/settings";
import { listTransportCalcs } from "@/lib/data/transport";
import { createIncident } from "@/lib/data/incidents";
import type { StageStatus, PaymentMethod } from "@/lib/data/types";

// §II.12 Ustalenia z telefonu do klienta przekazywane z formularza.
export interface ClientCallInput {
  assemblyTime: string;
  startTime: string;
  addonIds: string[];
  addonQty: Record<string, number>;
  skipGrass: boolean;
  upsellValue: number; // §II.12 wartość dodatków dosprzedanych w rozmowie (premia 15%)
  reason?: string;     // §II.9 powód, gdy zapisano mimo niepotwierdzenia wszystkich punktów
}

export interface ActionResult {
  ok: boolean;
  error?: string;
}

// §wypożyczalnia Telefon do klienta: pracownik potwierdza godzinę dostawy i przejmuje kontakt.
// Zapisuje godzinę dostawy na rezerwacji i oznacza telefon jako wykonany. (Odbiór własny nie wymaga.)
export async function confirmRentalDeliveryAction(reservationId: string, jobId: string, deliveryTime: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Tryb demo: skonfiguruj Supabase, aby zapisać." };
  try {
    await setRentalDeliveryConfirmed(reservationId, deliveryTime.trim() || null);
    revalidatePath(`/field/${jobId}`);
    revalidatePath(`/reservations/${reservationId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zapisać." };
  }
}

// Wypożyczalnia: gdy wszystkie kroki zrobione — policz wynagrodzenie (ryczałt albo czas × stawka),
// dodaj je jako zatwierdzony koszt „Robocizna" (raz), oznacz PLANOWANE płatności i zamknij zlecenie.
async function finalizeRentalIfDone(jobId: string): Promise<void> {
  const job = await getJob(jobId);
  if (!job || job.business_line !== "EQUIPMENT_RENTAL" || job.status === "DONE") return;
  const stages = await getJobStages(jobId);
  if (!stages.length || stages.some((s) => s.status !== "DONE")) return;
  try {
    const settings = await getSettings();
    const flat = job.reservation?.rental_settlement_flat != null ? Number(job.reservation.rental_settlement_flat) : null;
    const labor = rentalLabor(rentalWorkMs(stages), { flat, hourlyRate: Number(settings.iclub_hourly_rate ?? 0) });
    const costs = await listCosts();
    const already = costs.some((c) => c.job_id === jobId && c.category === "Robocizna");
    if (!already && labor.amount > 0) {
      await createCost({
        job_id: jobId, category: "Robocizna", amount: labor.amount,
        spent_on: new Date().toISOString().slice(0, 10),
        note: labor.isFlat ? "Ryczałt za realizację" : `Czas pracy ${labor.hours} h × stawka`,
        status: "VERIFIED",
      });
    }
  } catch (e) { console.error("Wypożyczalnia: koszt robocizny nie powiódł się", e); }
  await setJobStatus(jobId, "DONE");
  await markJobPlannedPaid(jobId);
  await writeRealizationCosts(jobId).catch(() => {}); // paliwo do kosztów realizacji
}

export async function advanceStageAction(stageId: string, jobId: string, status: StageStatus, reason?: string): Promise<ActionResult> {
  if (!isSupabaseConfigured())
    return { ok: false, error: "Tryb demo: skonfiguruj Supabase, aby zapisywać postęp." };
  try {
    await setStageStatus(stageId, status);
    // §II.9 Zakończenie kroku mimo braków z powodem → zapisz powód jako Uwagę (Szef go zobaczy).
    if (status === "DONE" && reason && reason.trim().length >= 3) {
      await createIncident({ job_id: jobId, category: "Uwaga", description: `Krok zakończony mimo braków: ${reason.trim()}`, equipment: null, priority: "LOW" }).catch(() => {});
    }
    // §II.11/§II.15 Zaktualizuj status zlecenia wg postępu etapów (Zaplanowane → W realizacji).
    await recomputeJobStatus(jobId);
    // Wypożyczalnia: po ostatnim kroku domknij realizację (koszt robocizny + status Zakończone).
    await finalizeRentalIfDone(jobId).catch(() => {});
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
    // §II.9 Powód, gdy nie potwierdzono wszystkich punktów rozmowy → Uwaga dla Szefa.
    if (input.reason && input.reason.trim().length >= 3) {
      await createIncident({ job_id: jobId, category: "Uwaga", description: `Telefon do klienta zapisany mimo braków: ${input.reason.trim()}`, equipment: null, priority: "LOW" }).catch(() => {});
    }
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
    await writeRealizationCosts(jobId).catch(() => {}); // wynagrodzenia + paliwo do kosztów
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
