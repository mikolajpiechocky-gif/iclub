"use server";
// Jednorazowe doliczenie kosztów (wynagrodzenia + paliwo) dla JUŻ zakończonych realizacji.
// Idempotentne: writeRealizationCosts nie dubluje, gdy koszt danej kategorii już istnieje.
// Dla realizacji bez zamrożonego snapshotu zarobków — najpierw go liczymy (best-effort, historyczny
// indeks miesiąca może być przybliżony).
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentProfile } from "@/lib/data/profiles";
import { listJobs } from "@/lib/data/jobs";
import { getSettings } from "@/lib/data/settings";
import { listJobAssignments, setAssignmentEarningsSnapshot } from "@/lib/data/assignments";
import { listTransportCalcs } from "@/lib/data/transport";
import { jobEarningsCtx, buildAssignmentEarnings } from "@/lib/data/job-earnings";
import { writeRealizationCosts } from "@/lib/data/realization-close";

export async function backfillRealizationCostsAction() {
  if (!isSupabaseConfigured()) return { ok: false as const, error: "Tryb demo." };
  const me = await getCurrentProfile();
  if (me?.role !== "OWNER") return { ok: false as const, error: "Tylko szef." };
  try {
    const jobs = (await listJobs()).filter((j) => j.status === "DONE");
    const settings = await getSettings();
    let processed = 0;
    for (const job of jobs) {
      const [assignments, transportCalcs] = await Promise.all([listJobAssignments(job.id), listTransportCalcs(job.id)]);
      // iClub: zamroź brakujące snapshoty zarobków (żeby powstał koszt „Wynagrodzenie").
      if (job.business_line === "ICLUB") {
        const ctx = jobEarningsCtx(job, settings, transportCalcs.some((c) => (c.one_way_km ?? 0) > 100));
        for (const a of assignments) {
          if (a.status !== "APPROVED" || a.earnings_snapshot) continue;
          const eb = await buildAssignmentEarnings(ctx, a.rate, a.profile_id, a.is_lead);
          await setAssignmentEarningsSnapshot(a.id, eb ?? { base: 0, baseLabel: "Brak stawki", ownerBonus: 0, total: 0, possibleBonuses: [] });
        }
      }
      await writeRealizationCosts(job.id);
      processed++;
    }
    revalidatePath("/reports");
    revalidatePath("/costs");
    return { ok: true as const, processed };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Nie udało się doliczyć." };
  }
}
