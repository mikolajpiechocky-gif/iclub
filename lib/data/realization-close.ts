// Przy domknięciu realizacji zapisujemy koszty realizacji jako wiersze w `costs`:
//  - Wynagrodzenie per pracownik (z zamrożonego snapshotu zarobków),
//  - Paliwo (z kalkulacji transportu: paliwo + eksploatacja).
// Dzięki temu Raporty i ekran Finansów liczą pełne koszty (nie tylko ręcznie dodane),
// spójnie z kartą Rentowność. Idempotentne: nie dubluje, gdy dana kategoria już istnieje.
import { listJobAssignments, setAssignmentEarningsSnapshot } from "./assignments";
import { listTransportCalcs } from "./transport";
import { listCosts, createCost, updateCost } from "./costs";
import { getJob, getJobStages, setJobStatus } from "./jobs";
import { getSettings } from "./settings";
import { createPayment, listPayments } from "./payments";
import { jobEarningsCtx, buildAssignmentEarnings } from "./job-earnings";
import { rentalWorkMs, rentalLabor } from "@/lib/domain/rental";

// Przychód realizacji: przy domknięciu wartość rezerwacji staje się przychodem (płatność PAID),
// niezależnie od ręcznego rejestrowania płatności. Idempotentne (nie dubluje „Przychód realizacji").
// Kwota = cena rezerwacji − już zarejestrowane płatności PAID (zadatek wliczony — nie był płatnością).
export async function recordRealizationIncome(jobId: string): Promise<void> {
  const [job, payments] = await Promise.all([getJob(jobId), listPayments()]);
  const price = Number(job?.reservation?.price ?? 0) || 0;
  if (price <= 0) return;
  const jobPaid = payments.filter((p) => p.job_id === jobId && p.status === "PAID");
  if (jobPaid.some((p) => p.title === "Przychód realizacji")) return; // już zaksięgowany
  const already = jobPaid.reduce((s, p) => s + (Number(p.amount || 0) || 0), 0);
  const income = Math.round((price - already) * 100) / 100;
  if (income > 0) {
    await createPayment({ job_id: jobId, title: "Przychód realizacji", method: "TRANSFER", amount: income, status: "PAID", note: "Wartość realizacji (auto przy domknięciu)" });
  }
}

// Wspólne domknięcie realizacji (iClub i wypożyczalnia): zamraża snapshot zarobków, ustawia DONE,
// księguje przychód i pisze koszty (wynagrodzenia, paliwo, robocizna wypożyczalni). Idempotentne.
export async function closeRealization(jobId: string): Promise<void> {
  const job = await getJob(jobId);
  if (!job || job.status === "DONE") return;
  // Zamrożenie rozliczenia zarobków per przypisany pracownik → podstawa kosztu „Wynagrodzenie".
  try {
    const [settings, assignments, transportCalcs] = await Promise.all([getSettings(), listJobAssignments(jobId), listTransportCalcs(jobId)]);
    const ctx = jobEarningsCtx(job, settings, transportCalcs.some((c) => (c.one_way_km ?? 0) > 100));
    for (const a of assignments) {
      if (a.status !== "APPROVED") continue;
      const eb = await buildAssignmentEarnings(ctx, a.rate, a.profile_id, a.is_lead);
      await setAssignmentEarningsSnapshot(a.id, eb ?? { base: 0, baseLabel: "Brak stawki", ownerBonus: 0, total: 0, possibleBonuses: [] });
    }
  } catch (e) { console.error("closeRealization: snapshot", e); }
  await setJobStatus(jobId, "DONE");
  await recordRealizationIncome(jobId).catch(() => {});
  await writeRealizationCosts(jobId).catch(() => {});
  if (job.business_line === "EQUIPMENT_RENTAL") await syncRentalLaborCost(jobId).catch(() => {});
}

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

// §16 Koszt „Paliwo" widoczny OD RAZU po zapisaniu kalkulacji transportu (nie dopiero przy domknięciu).
// Jeden wiersz „Paliwo" na zlecenie = suma paliwo + eksploatacja ze wszystkich kalkulacji. Idempotentny:
// aktualizuje istniejący wiersz (writeRealizationCosts przy domknięciu i tak go nie zdubluje).
export async function syncTransportFuelCost(jobId: string): Promise<void> {
  const [transport, costs] = await Promise.all([listTransportCalcs(jobId), listCosts()]);
  const fuel = transport.reduce((s, t) => s + (Number(t.fuel_cost ?? 0) || 0) + (Number(t.amortization ?? 0) || 0), 0);
  const amount = Math.round(fuel * 100) / 100;
  const existing = costs.find((c) => c.job_id === jobId && c.category === "Paliwo" && c.status !== "REJECTED");
  const note = "Transport (paliwo + eksploatacja)";
  if (existing) {
    if (Number(existing.amount || 0) !== amount) await updateCost(existing.id, { amount, note, status: "VERIFIED" });
  } else if (amount > 0) {
    await createCost({ job_id: jobId, category: "Paliwo", amount, spent_on: new Date().toISOString().slice(0, 10), note, status: "VERIFIED" });
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
