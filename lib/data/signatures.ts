// Warstwa danych: podpisy klienta.
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export interface SignatureRecord {
  id: string;
  job_id: string | null;
  data_url: string;
  signer_name: string | null;
  created_at: string;
}

export async function getSignature(jobId: string): Promise<SignatureRecord | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("signatures")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as SignatureRecord) ?? null;
}

export async function saveSignature(jobId: string, dataUrl: string, signerName: string | null): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("signatures")
    .insert({ job_id: jobId, data_url: dataUrl, signer_name: signerName, signed_by: user?.id ?? null });
  if (error) throw new Error(error.message);
}
