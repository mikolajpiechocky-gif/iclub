// §II.7 Historia zmian (audyt) — generyczny log aktywności dla kosztów i zgłoszeń.
// Zapis nie może wywrócić operacji biznesowej (błąd tylko logujemy).
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export interface ActivityRecord {
  id: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  action: string;
  detail: string | null;
  actor_name: string | null;
  created_at: string;
}

export async function logActivity(entityType: string, entityId: string, label: string | null, action: string, detail?: string | null): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    let actorName: string | null = null;
    if (user) {
      const { data } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      actorName = (data as { full_name?: string } | null)?.full_name ?? null;
    }
    const { error } = await supabase.from("activity_log").insert({
      entity_type: entityType, entity_id: entityId, entity_label: label, action, detail: detail ?? null,
      actor: user?.id ?? null, actor_name: actorName,
    });
    if (error) console.error("[activity_log] nie zapisano wpisu:", error.message);
  } catch (e) {
    console.error("[activity_log]", e);
  }
}

export async function listActivity(entityType?: string, entityId?: string, limit = 30): Promise<ActivityRecord[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  let q = supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(limit);
  if (entityType) q = q.eq("entity_type", entityType);
  if (entityId) q = q.eq("entity_id", entityId);
  const { data, error } = await q;
  if (error) return [];
  return (data ?? []) as ActivityRecord[];
}
