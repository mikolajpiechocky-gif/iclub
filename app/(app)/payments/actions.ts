"use server";
// Server Actions: płatności (§21). Weryfikacja gotówki tylko przez OWNER (§8).
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentProfile } from "@/lib/data/profiles";
import { createPayment, setPaymentStatus } from "@/lib/data/payments";
import type { PaymentMethod, PaymentStatus } from "@/lib/data/types";

export interface PaymentFormValues {
  job_id: string;
  title: string;
  method: PaymentMethod;
  amount: string;
  status: PaymentStatus;
  note: string;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

const DEMO = "Tryb demo: skonfiguruj Supabase, aby zapisywać (docs/SUPABASE_SETUP.md).";

function toNum(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t.replace(",", "."));
  return isNaN(n) ? null : n;
}

export async function createPaymentAction(v: PaymentFormValues): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  const amount = toNum(v.amount);
  const fe: Record<string, string> = {};
  if (!v.job_id) fe.job_id = "Wybierz zlecenie.";
  if (amount == null || amount < 0) fe.amount = "Podaj poprawną kwotę.";
  if (Object.keys(fe).length) return { ok: false, fieldErrors: fe };
  try {
    await createPayment({
      job_id: v.job_id,
      title: v.title.trim() || null,
      method: v.method,
      amount: amount!,
      status: v.status,
      note: v.note.trim() || null,
    });
    revalidatePath("/payments");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zapisać płatności." };
  }
}

export async function verifyPaymentAction(id: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  const p = await getCurrentProfile();
  if (p?.role !== "OWNER") return { ok: false, error: "Tylko właściciel weryfikuje płatności." };
  try {
    await setPaymentStatus(id, "PAID");
    revalidatePath("/payments");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Błąd." };
  }
}
