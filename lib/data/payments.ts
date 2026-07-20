// Warstwa danych: płatności. Odczyt/zapis Supabase; fallback demo.
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { PaymentWithJob, PaymentMethod, PaymentStatus } from "./types";

const now = "2026-07-14T10:00:00.000Z";

const DEMO_PAYMENTS: PaymentWithJob[] = [
  { id: "demo-pay1", job_id: "demo-job-1", job: { id: "demo-job-1", title: "Osiemnastka" }, title: "Zadatek", method: "TRANSFER", amount: 2000, status: "PAID", note: "Przelew 05 lip", created_at: now, updated_at: now },
  { id: "demo-pay2", job_id: "demo-job-1", job: { id: "demo-job-1", title: "Osiemnastka" }, title: "Dopłata na miejscu", method: "CASH", amount: 4800, status: "REPORTED", note: "zgłosił Marek W.", created_at: now, updated_at: now },
  { id: "demo-pay3", job_id: "demo-job-2", job: { id: "demo-job-2", title: "Wesele" }, title: "Zaległość", method: "TRANSFER", amount: 1800, status: "OVERDUE", note: "9 dni po terminie", created_at: now, updated_at: now },
];

export interface PaymentInput {
  job_id: string | null;
  title: string | null;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  note: string | null;
}

export async function listPayments(): Promise<PaymentWithJob[]> {
  if (!isSupabaseConfigured()) return DEMO_PAYMENTS;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*, job:jobs(id, title)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as PaymentWithJob[];
}

export async function createPayment(input: PaymentInput): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const reported = input.method === "CASH" && input.status === "REPORTED";
  const { error } = await supabase.from("payments").insert({
    ...input,
    created_by: user?.id ?? null,
    reported_by: reported ? user?.id ?? null : null,
  });
  if (error) throw new Error(error.message);
}

export async function setPaymentStatus(id: string, status: PaymentStatus): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const patch: { status: PaymentStatus; verified_by?: string | null } = { status };
  if (status === "PAID") patch.verified_by = user?.id ?? null;
  const { error } = await supabase.from("payments").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

// Rozliczenie salda przy zakończeniu realizacji: zaplanowane/zgłoszone → zapłacone.
export async function markJobPlannedPaid(jobId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("payments")
    .update({ status: "PAID", verified_by: user?.id ?? null })
    .eq("job_id", jobId)
    .in("status", ["PLANNED", "REPORTED", "OVERDUE"]);
  if (error) throw new Error(error.message);
}
