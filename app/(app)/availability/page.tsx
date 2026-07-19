// app/(app)/availability/page.tsx — Dostępność pracowników (§11).
import { PageHeader } from "@/components/layout";
import { getCurrentProfile } from "@/lib/data/profiles";
import { listAllAvailability, listMyAvailability } from "@/lib/data/availability";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { AvailabilityManager, type AvailabilityEntry } from "./availability-manager";

export const dynamic = "force-dynamic";

export default async function AvailabilityPage() {
  const profile = await getCurrentProfile();
  const isOwner = profile?.role === "OWNER";
  const demo = !isSupabaseConfigured();

  let entries: AvailabilityEntry[] = [];
  if (isOwner) {
    const all = await listAllAvailability();
    entries = all.map((a) => ({ id: a.id, who: a.profile?.full_name ?? "—", start_date: a.start_date, end_date: a.end_date, note: a.note, canRemove: true }));
  } else if (profile) {
    const mine = await listMyAvailability(profile.id);
    entries = mine.map((a) => ({ id: a.id, who: null, start_date: a.start_date, end_date: a.end_date, note: a.note, canRemove: true }));
  }

  return (
    <div className="mx-auto max-w-[900px] px-5 py-6 md:px-8">
      <PageHeader title="Dostępność" subtitle={isOwner ? "Niedostępności wszystkich pracowników" : "Oznacz, kiedy jesteś niedostępny"} />
      {demo && (
        <div className="mb-4 flex items-center gap-2 rounded-card border border-[#3d3216] bg-[#241e10] px-4 py-3 text-[12.5px] text-warn">Tryb demo — dane przykładowe.</div>
      )}
      <AvailabilityManager entries={entries} />
    </div>
  );
}
