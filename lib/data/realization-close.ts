// Przy domknięciu realizacji zapisujemy koszty realizacji jako wiersze w `costs`:
//  - Wynagrodzenie per pracownik (z zamrożonego snapshotu zarobków),
//  - Paliwo (z kalkulacji transportu: paliwo + eksploatacja).
// Dzięki temu Raporty i ekran Finansów liczą pełne koszty (nie tylko ręcznie dodane),
// spójnie z kartą Rentowność. Idempotentne: nie dubluje, gdy dana kategoria już istnieje.
import { listJobAssignments } from "./assignments";
import { listTransportCalcs } from "./transport";
import { listCosts, createCost, updateCost } from "./costs";
import { getJob, getJobStages } from "./jobs";
import { getSettings } from "./settings";
import { rentalWorkMs, rentalLabor } from "@/lib/domain/rental";

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

// §18 Wypożyczalnia: ryczałt (rental_settlement_flat) można dodać/zmienić „w dowolnym momencie" — także
// PO domknięciu realizacji. Saldo pracownika czyta ryczałt na żywo, więc zapisany koszt „Robocizna" musi
// za nim nadążać (inaczej rozjazd koszt↔wypłata i zawyżona rentowność). Self-guarded: no-op poza
// EQUIPMENT_RENTAL + DONE. Przelicza (nie ustawia na sztywno flat), więc usunięcie ryczałtu wraca do godzinowego.
export async function syncRentalLaborCost(jobId: string): Promise<void> {
  const job = await getJob(jobId);
  if (!job || job.business_line !== "EQUIPMENT_RENTAL" || job.status !== "DONE") return;
  const [stages, settings, costs] = await Promise.all([getJobStages(jobId), getSettings(), listCosts()]);
  const flat = job.reservation?.rental_settlement_flat != null ? Number(job.reservation.rental_settlement_flat) : null;
  const labor = rentalLabor(rentalWorkMs(stages), { flat, hourlyRate: Number(settings.iclub_hourly_rate ?? 0) });
  const note = labor.isFlat ? "Ryczałt za realizację" : `Czas pracy ${labor.hours} h × stawka`;
  const existing = costs.find((c) => c.job_id === jobId && c.category === "Robocizna" && c.status !== "REJECTED");
  if (existing) {
    if (Number(existing.amount || 0) !== labor.amount || existing.note !== note) {
      await updateCost(existing.id, { amount: labor.amount, note, status: "VERIFIED" });
    }
  } else if (labor.amount > 0) {
    // Przy domknięciu nie powstał wiersz (0 h w trybie godzinowym), a teraz jest ryczałt → utwórz.
    await createCost({ job_id: jobId, category: "Robocizna", amount: labor.amount, spent_on: new Date().toISOString().slice(0, 10), note, status: "VERIFIED" });
  }
}
