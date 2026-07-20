// Warstwa danych: zdjęcia z realizacji. Metadane w job_photos, pliki w prywatnym
// buckecie Storage 'realizations'. Podgląd przez signed URL (ważny 1h).
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { REALIZATIONS_BUCKET } from "@/lib/config/storage";

export interface JobPhoto {
  id: string;
  url: string;
  caption: string | null;
  created_at: string;
}

export async function listJobPhotos(jobId: string): Promise<JobPhoto[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_photos")
    .select("id, path, caption, created_at")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });
  if (error || !data || data.length === 0) return [];

  const paths = data.map((d) => d.path as string);
  const { data: signed } = await supabase.storage.from(REALIZATIONS_BUCKET).createSignedUrls(paths, 3600);
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  return data.map((d) => ({
    id: d.id as string,
    url: urlByPath.get(d.path as string) ?? "",
    caption: (d.caption as string | null) ?? null,
    created_at: d.created_at as string,
  }));
}

export async function createJobPhoto(jobId: string, path: string, caption: string | null): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("job_photos").insert({
    job_id: jobId,
    path,
    caption,
    created_by: user?.id ?? null,
  });
  if (error) throw new Error(error.message);
}
