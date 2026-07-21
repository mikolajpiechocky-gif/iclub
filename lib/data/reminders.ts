// §9.4 Przypomnienia dzień wcześniej: realizacja iClub z dodatkami → powiadomienie
// dla przypisanego pracownika (większy czas pakowania i montażu). Uruchamiane cronem.
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

interface JobRow {
  id: string;
  reservation: { addon_ids: string[] | null; event_type: string | null; customer: { name: string | null } | null } | null;
}

export async function notifyAddonRealizations(): Promise<{ notified: number }> {
  if (!isSupabaseConfigured() || !isServiceRoleConfigured()) return { notified: 0 };
  const admin = createAdminClient();

  const t = new Date();
  t.setDate(t.getDate() + 1);
  const tomorrow = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;

  const { data: jobs } = await admin
    .from("jobs")
    .select("id, reservation:reservations(addon_ids, event_type, customer:customers(name))")
    .eq("business_line", "ICLUB")
    .eq("event_date", tomorrow)
    .neq("status", "CANCELLED");

  const rows = (jobs ?? []) as unknown as JobRow[];
  let notified = 0;

  for (const j of rows) {
    const addonIds = j.reservation?.addon_ids;
    if (!Array.isArray(addonIds) || addonIds.length === 0) continue;

    const { data: assigns } = await admin
      .from("job_assignments")
      .select("profile_id")
      .eq("job_id", j.id)
      .eq("status", "APPROVED");

    for (const a of (assigns ?? []) as { profile_id: string }[]) {
      // Idempotencja: jedno przypomnienie na zlecenie i pracownika.
      const { data: existing } = await admin
        .from("notifications")
        .select("id")
        .eq("job_id", j.id)
        .eq("recipient", a.profile_id)
        .eq("type", "addon_reminder")
        .limit(1);
      if (existing && existing.length) continue;

      const who = j.reservation?.customer?.name ?? j.reservation?.event_type ?? "Realizacja";
      await admin.from("notifications").insert({
        recipient: a.profile_id,
        title: "Jutro realizacja z dodatkami",
        body: `${who}: realizacja zawiera dodatkowy sprzęt (${addonIds.length}). Uwzględnij większy czas pakowania i montażu.`,
        type: "addon_reminder",
        job_id: j.id,
      });
      notified++;
    }
  }
  return { notified };
}
