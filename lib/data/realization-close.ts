// Przy domknięciu realizacji zapisujemy koszty realizacji jako wiersze w `costs`:
//  - Wynagrodzenie per pracownik (z zamrożonego snapshotu zarobków),
//  - Paliwo (z kalkulacji transportu: paliwo + eksploatacja).
// Dzięki temu Raporty i ekran Finansów liczą pełne koszty (nie tylko ręcznie dodane),
// spójnie z kartą Rentowność. Idempotentne: nie dubluje, gdy dana kategoria już istnieje.
import { listJobAssignments } from "./assignments";
import { listTransportCalcs } from "./transport";
import { listCosts, createCost } from "./costs";

export async function writeRealizationCosts(jobId: string): Promise<void> {
  const [assignments, transport, costs] = await Promise.all([
    listJobAssignments(jobId), listTransportCalcs(jobId), listCosts(),
  ]);
  const jobCosts = costs.filter((c) => c.job_id === jobId && c.status !== "REJECTED");
  const today = new Date().toISOString().slice(0, 10);

  // Wynagrodzenia iClub — z zamrożonego snapshotu, raz na realizację.
  if (!jobCosts.some((c) => c.category === "Wynagrodzenie")) {
    for (const a of assignments) {
      if (a.status !== "APPROVED") continue;
      const amt = Number(a.earnings_snapshot?.total ?? 0);
      if (amt > 0) {
        await createCost({ job_id: jobId, category: "Wynagrodzenie", amount: Math.round(amt * 100) / 100, spent_on: today, note: `Wynagrodzenie: ${a.employee?.full_name ?? "pracownik"}`, status: "VERIFIED" }).catch(() => {});
      }
    }
  }

  // Paliwo — z kalkulacji transportu (paliwo + eksploatacja), raz na realizację.
  if (!jobCosts.some((c) => c.category === "Paliwo")) {
    const fuel = transport.reduce((s, t) => s + Number(t.fuel_cost ?? 0) + Number(t.amortization ?? 0), 0);
    if (fuel > 0) {
      await createCost({ job_id: jobId, category: "Paliwo", amount: Math.round(fuel * 100) / 100, spent_on: today, note: "Transport (paliwo + eksploatacja)", status: "VERIFIED" }).catch(() => {});
    }
  }
}
