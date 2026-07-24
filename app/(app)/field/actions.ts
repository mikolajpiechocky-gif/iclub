"use server";
// Server Actions: przebieg realizacji terenowej (§19) — postęp etapów oraz
// zgłoszenie odbioru płatności na miejscu (krok „Rozliczenie”).
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { setStageStatus, recomputeJobStatus } from "@/lib/data/jobs";
import { createPayment } from "@/lib/data/payments";
import { assignVehicle, removeJobVehicle } from "@/lib/data/vehicles";
import { saveCallDetails } from "@/lib/data/reservations";
import type { StageStatus, PaymentMethod } from "@/lib/data/types";

// §II.12 Ustalenia z telefonu do klienta przekazywane z formularza.
export interface ClientCallInput {
  assemblyTime: string;
  startTime: string;
  addonIds: string[];
  addonQty: Record<string, number>;
  skipGrass: boolean;
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
    });
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
