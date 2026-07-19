// Warstwa danych: umowy (status przy zleceniu).
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { ContractStatus } from "./types";

export interface ContractRecord {
  id: string;
  job_id: string;
  status: ContractStatus;
  sent_at: string | null;
  signed_at: string | null;
}

export async function getContract(jobId: string): Promise<ContractRecord | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("contracts").select("*").eq("job_id", jobId).maybeSingle();
  return (data as ContractRecord) ?? null;
}

export async function setContractStatus(jobId: string, status: ContractStatus): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const nowIso = new Date().toISOString();
  const patch: {
    job_id: string;
    status: ContractStatus;
    created_by: string | null;
    sent_at?: string;
    signed_at?: string;
  } = { job_id: jobId, status, created_by: user?.id ?? null };
  if (status === "SENT" || status === "SIGNED") patch.sent_at = nowIso;
  if (status === "SIGNED") patch.signed_at = nowIso;
  const { error } = await supabase.from("contracts").upsert(patch, { onConflict: "job_id" });
  if (error) throw new Error(error.message);
}
