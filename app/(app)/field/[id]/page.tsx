// app/(app)/field/[id]/page.tsx — Realizacja terenowa (mobile).
// Pakowanie jest osobnym blokiem, a właściwa realizacja to kroki z własnymi
// czynnościami (W drodze / Montaż / Szkolenie / Zdjęcia / Rozliczenie / Demontaż).
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pill } from "@/components/ui";
import { getJob, getJobStages, syncJobStages } from "@/lib/data/jobs";
import { getCurrentProfile } from "@/lib/data/profiles";
import { getSettings } from "@/lib/data/settings";
import { getEmployee } from "@/lib/data/employees";
import { listJobAssignments } from "@/lib/data/assignments";
import { jobEarningsCtx, buildAssignmentEarnings } from "@/lib/data/job-earnings";
import { getCustomer } from "@/lib/data/customers";
import { listReservationAddons, listPackageItems } from "@/lib/data/resources";
import { listChecklistItems } from "@/lib/data/checklist";
import { listPayments } from "@/lib/data/payments";
import { getSignature } from "@/lib/data/signatures";
import { listJobPhotos } from "@/lib/data/photos";
import { listCosts } from "@/lib/data/costs";
import { listIncidents } from "@/lib/data/incidents";
import { listTransportCalcs } from "@/lib/data/transport";
import { listVehicles, listJobVehicles } from "@/lib/data/vehicles";
import { FieldVehicle } from "../field-vehicle";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { JOB_STATUS_META } from "@/lib/data/types";
import { PackingBlock, RealizationFlow, type RealizationContext } from "../realization-flow";
import { ProtocolBlock } from "../protocol-block";
import { TelefonBlock } from "../telefon-block";
import { RentalPhoneBlock } from "../rental-phone-block";
import { AddonWarning } from "./addon-warning";
import { settlementBreakdown, type AddonPriceMap } from "@/lib/domain/billing";

export const dynamic = "force-dynamic";

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "long" }) : "—";

export default async function FieldRealizationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [job, stagesRaw] = await Promise.all([getJob(id), getJobStages(id)]);
  if (!job) notFound();

  // §II.15 Samonaprawianie: dołóż brakujące etapy (np. „Wynajem trwa") do starszych
  // zleceń bez odtwarzania rezerwacji. Po zmianie przeładuj listę w prawidłowej kolejności.
  const stagesChanged = await syncJobStages(job.id, job.business_line, stagesRaw, job.reservation?.self_pickup ?? false).catch(() => false);
  const stages = stagesChanged ? await getJobStages(id) : stagesRaw;

  const r = job.reservation;
  const [customer, checklist, payments, signature, photos, addonList, packageItems, costsAll, incidentsAll, transportCalcs] = await Promise.all([
    r?.customer_id ? getCustomer(r.customer_id) : Promise.resolve(null),
    listChecklistItems(job.id),
    listPayments(),
    getSignature(job.id),
    listJobPhotos(job.id),
    listReservationAddons(),
    r?.package_id ? listPackageItems(r.package_id) : Promise.resolve([]),
    listCosts(),
    listIncidents(),
    listTransportCalcs(job.id),
  ]);
  const [vehicles, jobVehicles] = await Promise.all([listVehicles(), listJobVehicles(job.id)]);
  const assignedVehicleIds = new Set(jobVehicles.map((jv) => jv.vehicle_id));
  const hasVehicle = jobVehicles.length > 0;

  // Blok 3 (protokół): koszty + zgłoszenia dla tego zlecenia + podsumowanie transportu.
  const jobCosts = costsAll.filter((c) => c.job_id === job.id);
  const jobIncidents = incidentsAll.filter((i) => i.job_id === job.id);
  const distanceKm = transportCalcs.reduce((m, t) => Math.max(m, Number(t.one_way_km ?? t.distance_km ?? 0)), 0) || null;
  const transportCost = transportCalcs.reduce((s, t) => s + Number(t.fuel_cost ?? 0) + Number(t.amortization ?? 0), 0) || null;
  const costsTotal = jobCosts.reduce((s, c) => s + Number(c.amount ?? 0), 0);
  const m = JOB_STATUS_META[job.status];

  // §II.19/§W1 Wynagrodzenie pracownika za tę realizację (forma + premie + łącznie).
  // Dla ZAKOŃCZONEJ realizacji pokazujemy ZAMROŻONY snapshot (zmiana stawek nie zmienia historii),
  // dla trwającej — wyliczenie na żywo tą samą funkcją co strona rezerwacji (spójność).
  const profile = await getCurrentProfile();
  let earnings: { baseLabel: string; total: number } | null = null;
  if (profile && job.business_line === "ICLUB") {
    const [settings, employee, assignments] = await Promise.all([getSettings(), getEmployee(profile.id), listJobAssignments(job.id)]);
    const mine = assignments.find((a) => a.profile_id === profile.id) ?? null;
    const eb = job.status === "DONE" && mine?.earnings_snapshot
      ? mine.earnings_snapshot
      : await buildAssignmentEarnings(jobEarningsCtx(job, settings, (distanceKm ?? 0) > 100), employee?.rate ?? null, profile.id, mine?.is_lead ?? false);
    if (eb) earnings = { baseLabel: eb.baseLabel, total: eb.total };
  } else if (profile && job.business_line === "EQUIPMENT_RENTAL") {
    // §wypożyczalnia Pracownik widzi wynagrodzenie TYLKO gdy jest ryczałt lub bonus szefa.
    // Stawka godzinowa = czas obsługi liczony jako koszt zlecenia, ale bez dodatkowej wypłaty → nic nie pokazujemy.
    const flat = r?.rental_settlement_flat != null ? Number(r.rental_settlement_flat) : null;
    const ownerBonus = Number(job.owner_bonus ?? 0) || 0;
    if (flat != null) earnings = { baseLabel: "Ryczałt za realizację", total: Math.round((flat + ownerBonus) * 100) / 100 };
    else if (ownerBonus > 0) earnings = { baseLabel: "Bonus szefa", total: ownerBonus };
  }

  // §9.4 Dodatki realizacji → ostrzeżenie o większym czasie pakowania i montażu.
  const addonName = new Map(addonList.map((a) => [a.id, a.name]));
  const addonNames = (r?.addon_ids ?? []).map((aid) => addonName.get(aid)).filter((n): n is string => Boolean(n));

  // §II.2 Rozbicie rozliczenia (pakiet/dodatki/transport/suma/zadatek/do zapłaty na miejscu).
  const addonPrice: AddonPriceMap = new Map(addonList.map((a) => [a.id, { name: a.name, price: Number(a.price ?? 0) }]));
  // §K1 Skład pakietu (equipmentId → ilość w pakiecie) — do liczenia dodatków tylko od nadwyżki.
  const included: Record<string, number> = {};
  for (const it of packageItems) included[it.equipment_id] = Number(it.quantity ?? 0);
  const billing = r ? settlementBreakdown(r, addonPrice, included) : null;

  const phone = customer?.phone ?? null;
  const address = r?.location || customer?.address || customer?.city || null;
  // §II.13 Szczegóły do nagłówka: wielkość namiotu (Duży/Mały), pakiet, dodatki.
  const tentSizeLabel = r?.tent_main === "M" ? "Mały" : (r?.tent_main === "D" || r?.tent_main === "D_BACKDOOR") ? "Duży" : (r?.tent?.name ?? null);
  const navUrl = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null;

  // Pakowanie = osobny blok; reszta kroków to właściwa realizacja.
  const packing = stages.find((s) => s.stage_key === "PACKING") ?? null;
  const flowSteps = stages.filter((s) => s.stage_key !== "PACKING");

  const toPay = r?.price != null ? r.price - (r.deposit ?? 0) : null;
  const paymentReported = payments.some((p) => p.job_id === job.id);

  const ctx: RealizationContext = {
    reservationId: r?.id ?? "",
    navUrl,
    toPay,
    billing,
    hasSignature: Boolean(signature),
    paymentReported,
    signatureHref: `/field/${job.id}/signature`,
    photos: photos.map((p) => ({ id: p.id, url: p.url })),
    canUpload: isSupabaseConfigured(),
    teardownItems: checklist.filter((i) => i.category !== "Dokumenty").map((i) => i.label),
    hasVehicle,
    roundTripKm: distanceKm != null ? distanceKm * 2 : null,
    earnings,
    departedAt: job.departed_at ?? null,
  };

  return (
    <div className="mx-auto max-w-md pb-6">
      {/* Nagłówek */}
      <div className="px-4 pt-4 pb-4 text-white" style={{ background: "linear-gradient(150deg,#2a1533,#191b24)" }}>
        <div className="mb-3 flex items-center gap-2.5">
          <Link href="/field" className="text-[13px] font-bold text-[#c9cddb]">‹ Realizacje</Link>
          <span className="ml-auto"><Pill label={m.label} fg={m.fg} bg={m.bg} /></span>
        </div>
        <div className="font-display text-[20px] font-bold">{r?.customer?.name ?? job.title ?? "Realizacja"}</div>
        <div className="mt-1 text-[13px] font-medium text-[#c9cddb]">{[fmtDate(job.event_date), address].filter(Boolean).join(" · ")}</div>
        {/* §II.13 Szczegóły w nagłówku: namiot, pakiet, dodatki */}
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {tentSizeLabel && <span className="rounded-[8px] bg-white/[0.12] px-2 py-1 text-[11px] font-bold text-white">⛺ {tentSizeLabel}</span>}
          {r?.package?.name && <span className="rounded-[8px] bg-white/[0.12] px-2 py-1 text-[11px] font-bold text-white">{r.package.name}</span>}
          {addonNames.length > 0 && <span className="rounded-[8px] bg-white/[0.12] px-2 py-1 text-[11px] font-bold text-white">+ {addonNames.join(", ")}</span>}
        </div>
        <div className="mt-3.5 flex gap-2.5">
          {phone ? (
            <a href={`tel:${phone.replace(/\s+/g, "")}`} className="flex-1 rounded-[13px] bg-white/10 py-3 text-center text-[13px] font-bold text-white">Zadzwoń</a>
          ) : (
            <span className="flex-1 rounded-[13px] bg-white/5 py-3 text-center text-[13px] font-bold text-white/40">Brak telefonu</span>
          )}
          {navUrl ? (
            <a href={navUrl} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-[13px] bg-white py-3 text-center text-[13px] font-bold text-[#191b24]">Nawiguj</a>
          ) : (
            <span className="flex-1 rounded-[13px] bg-white/40 py-3 text-center text-[13px] font-bold text-[#191b24]/50">Brak adresu</span>
          )}
        </div>
      </div>

      <div className="px-4 pt-4">
        {/* Skrót danych — wypożyczalnia: dostawa/odbiór własny/zwrot; iClub: montaż/start/goście */}
        <div className="mb-3.5 flex flex-wrap gap-2">
          {(job.business_line === "EQUIPMENT_RENTAL"
            ? [
                r?.self_pickup ? "Odbiór własny" : "Transport",
                r?.delivery_time ? `Dostawa ${r.delivery_time}` : null,
                r?.teardown_date ? `Zwrot ${fmtDate(r.teardown_date)}` : null,
              ]
            : [
                r?.assembly_time ? `Montaż ${r.assembly_time}` : null,
                r?.event_start_time ? `Start ${r.event_start_time}` : null,
                r?.guests != null ? `${r.guests} os.` : null,
              ]
          ).filter(Boolean).map((c) => (
            <span key={c as string} className="rounded-[10px] border border-border bg-surface px-2.5 py-2 text-[12px] font-semibold text-ink">{c}</span>
          ))}
        </div>

        {/* §9.4 Ostrzeżenie o dodatkach (iClub) — dla wynajmu bez sensu (całość to sprzęt). */}
        {job.business_line === "ICLUB" && <AddonWarning jobId={job.id} addonNames={addonNames} />}

        {/* §11.1 Zawartość pakietu (iClub) — do spakowania. */}
        {job.business_line === "ICLUB" && packageItems.length > 0 && (
          <div className="mb-3.5 rounded-[13px] border border-border bg-surface px-3.5 py-3">
            <div className="mb-1.5 text-[12.5px] font-bold text-ink">Zawartość pakietu{r?.package?.name ? ` · ${r.package.name}` : ""}</div>
            <div className="flex flex-wrap gap-1.5">
              {packageItems.map((it) => (
                <span key={it.id} className="rounded-[8px] border border-border bg-surface-2 px-2 py-1 text-[11.5px] font-semibold text-ink-2">{it.equipment?.name ?? "—"} × {it.quantity}</span>
              ))}
            </div>
          </div>
        )}

        {/* §II.12 Blok: Telefon do klienta (iClub — ustalenia + dosprzedaż) */}
        {job.business_line === "ICLUB" && (
          <TelefonBlock
            reservationId={r?.id ?? ""}
            jobId={job.id}
            packageName={r?.package?.name ?? null}
            catalog={addonList.map((a) => ({ id: a.id, name: a.name, price: Number(a.price ?? 0), available: a.available ?? null }))}
            currentAddonIds={r?.addon_ids ?? []}
            currentAddonQty={r?.addon_qty ?? {}}
            skipGrass={r?.skip_grass ?? false}
            assemblyTime={r?.assembly_time ?? null}
            eventStartTime={r?.event_start_time ?? null}
            phoneCallDone={r?.phone_call_done ?? false}
          />
        )}

        {/* §wypożyczalnia Telefon do klienta — tylko potwierdzenie godziny dostawy + przejęcie
            kontaktu. Odbiór własny nie wymaga telefonu. */}
        {job.business_line === "EQUIPMENT_RENTAL" && !r?.self_pickup && (
          <RentalPhoneBlock
            reservationId={r?.id ?? ""}
            jobId={job.id}
            phone={phone}
            deliveryTime={r?.delivery_time ?? null}
            done={r?.phone_call_done ?? false}
          />
        )}

        {/* Blok: Pakowanie / przygotowanie sprzętu — checklista z konkretnych itemów (obie linie) */}
        <PackingBlock
          jobId={job.id}
          stage={packing}
          checklistHref={`/field/${job.id}/checklist`}
          progress={{ done: checklist.filter((i) => i.done).length, total: checklist.length }}
        />

        {/* Pojazd realizacji — iClub oraz wypożyczalnia z transportem (nie przy odbiorze własnym) */}
        {!(job.business_line === "EQUIPMENT_RENTAL" && r?.self_pickup) && (
          <FieldVehicle
            jobId={job.id}
            assigned={jobVehicles.map((jv) => ({ id: jv.id, name: jv.vehicle?.name ?? "—", registration: jv.vehicle?.registration ?? null }))}
            available={vehicles.filter((v) => !assignedVehicleIds.has(v.id)).map((v) => ({ id: v.id, name: v.name }))}
          />
        )}

        {/* Blok: Realizacja (kroki z własnymi czynnościami) */}
        <RealizationFlow jobId={job.id} steps={flowSteps} ctx={ctx} unloadHint={job.business_line === "ICLUB" && job.status !== "DONE"} />

        {/* Blok: Rozpakowanie i protokół (iClub — koszty + sprzęt do czyszczenia/naprawy) */}
        {job.business_line === "ICLUB" && (
          <ProtocolBlock
            jobId={job.id}
            costs={jobCosts.map((c) => ({ id: c.id, category: c.category, amount: Number(c.amount), note: c.note, status: c.status }))}
            incidents={jobIncidents.map((i) => ({ id: i.id, category: i.category, equipment: i.equipment, priority: i.priority, status: i.status }))}
            summary={{ distanceKm, transportCost, costsTotal }}
          />
        )}

        {/* Akcje stałe */}
        <div className="mt-3.5 flex gap-2.5">
          <Link href="/media" className="flex-1 rounded-[13px] border border-[#3a1c1f] bg-[#251215] py-3 text-center text-[13px] font-bold text-bad">⚠ Zgłoś szkodę</Link>
          <Link href={`/reservations/${r?.id ?? ""}`} className="flex-1 rounded-[13px] border border-border bg-surface py-3 text-center text-[13px] font-bold text-ink-2">Szczegóły rezerwacji</Link>
        </div>
      </div>
    </div>
  );
}
