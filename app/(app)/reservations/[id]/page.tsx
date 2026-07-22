// app/(app)/reservations/[id]/page.tsx — Rezerwacja = realizacja.
// Jedno miejsce dla szefa: sprzedaż + operacje (etapy, zespół, pojazdy,
// transport, umowa). Zlecenie jest technicznym rekordem 1:1 z rezerwacją.
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout";
import { SectionCard, Pill } from "@/components/ui";
import { Icon } from "@/components/icons";
import { getReservation } from "@/lib/data/reservations";
import { getCustomer } from "@/lib/data/customers";
import { getJobByReservation, getJobStages, countDoneIclubRealizations } from "@/lib/data/jobs";
import { listJobAssignments } from "@/lib/data/assignments";
import { listEmployees } from "@/lib/data/employees";
import { getCurrentProfile, getProfileName } from "@/lib/data/profiles";
import { predictedEarnings, type EarningsBreakdown } from "@/lib/domain/earnings";
import { settlementForRealization, rulesFromSettings } from "@/lib/domain/iclub-settlement";
import type { EmployeeRate } from "@/lib/data/types";
import { getUnavailableProfileIds } from "@/lib/data/availability";
import { listVehicles, listJobVehicles, findVehicleConflicts } from "@/lib/data/vehicles";
import { listJobPhotos } from "@/lib/data/photos";
import { getEventWeather, WEATHER_KIND_STYLE } from "@/lib/integrations/weather";
import { RESERVATION_STATUS_META, STAGE_STATUS_META } from "@/lib/data/types";
import { listTransportCalcs } from "@/lib/data/transport";
import { getSettings } from "@/lib/data/settings";
import { ClientConfirmToggle } from "../confirm-toggle";
import { InvoiceStatus } from "../invoice-status";
import { RealizationDoneButton } from "../realization-done";
import { DeleteReservationButton } from "../delete-reservation";
import { JobTeam, type AssignmentView } from "../../jobs/job-team";
import { JobVehicles, type JobVehicleView } from "../../jobs/job-vehicles";
import { JobTransport } from "../../jobs/job-transport";

export const dynamic = "force-dynamic";

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "long", year: "numeric" }) : "—";
const fmtPLN = (v: number | null) =>
  v == null ? "—" : new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(v);

export default async function ReservationHubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [reservation, job, profile] = await Promise.all([
    getReservation(id),
    getJobByReservation(id),
    getCurrentProfile(),
  ]);
  if (!reservation) notFound();

  const r = job?.reservation ?? reservation;
  const rm = RESERVATION_STATUS_META[reservation.status];
  const isOwner = profile?.role === "OWNER";
  // §9.3 Autor ręcznego ustalenia godziny montażu (jeśli był).
  const assemblyBy = reservation.assembly_time && reservation.assembly_time_by ? await getProfileName(reservation.assembly_time_by) : null;

  const weather = reservation.event_date && reservation.location
    ? await getEventWeather(reservation.location, reservation.event_date)
    : null;

  // Faktura VAT (§43): NIP klienta + stawka VAT z ustawień.
  const [invoiceCustomer, invoiceSettings] = reservation.is_invoice
    ? await Promise.all([reservation.customer_id ? getCustomer(reservation.customer_id) : Promise.resolve(null), getSettings()])
    : [null, null];

  const cards: { h: string; rows: [string, string][] }[] = [
    { h: "Klient", rows: [["Klient", (r as { customer?: { name?: string } }).customer?.name ?? "—"], ["Źródło", reservation.source ?? "—"]] },
    { h: "Wydarzenie", rows: [["Typ", reservation.event_type ?? "—"], ["Goście", reservation.guests != null ? `${reservation.guests} osób` : "—"], ["Data", fmtDate(reservation.event_date)]] },
    { h: "Terminy", rows: [["Montaż", fmtDate(reservation.setup_date)], ["Demontaż", fmtDate(reservation.teardown_date)], ["Start imprezy", reservation.event_start_time ?? "—"], ["Godz. montażu", reservation.assembly_time ?? "—"], ["Lokalizacja", reservation.location ?? "—"]] },
    { h: "Namiot i pakiet", rows: [["Namiot", (r as { tent?: { name?: string } }).tent?.name ?? "—"], ["Pakiet", (r as { package?: { name?: string } }).package?.name ?? "—"]] },
  ];
  // Rozliczenie (Wartość/Rabat/Zadatek) — tylko szef; pracownika to nie dotyczy.
  if (isOwner) {
    cards.push({ h: "Rozliczenie", rows: [["Wartość", fmtPLN(reservation.price)], ["Rabat", fmtPLN(reservation.discount ?? 0)], ["Zadatek", fmtPLN(reservation.deposit ?? 0)]] });
  }

  return (
    <div className="mx-auto max-w-[1180px] px-5 py-6 md:px-8">
      <PageHeader
        title={(r as { customer?: { name?: string } }).customer?.name || reservation.event_type || "Rezerwacja"}
        subtitle={`Rezerwacja · ${reservation.event_type ?? ""}`}
        back={{ href: "/reservations", label: "Rezerwacje" }}
        actions={
          <>
            {job && reservation.business_line === "ICLUB" && <Link href={`/jobs/${job.id}/contract`} className="rounded-field border border-border bg-surface-2 px-4 py-2.5 text-[13px] font-semibold text-ink">Umowa</Link>}
            {job && <Link href={`/field/${job.id}`} className="rounded-field border border-border bg-surface-2 px-4 py-2.5 text-[13px] font-semibold text-ink">Realizacja terenowa</Link>}
            <Link href={`/reservations/${reservation.id}/edit`} className="rounded-field bg-brand px-4 py-2.5 text-[13px] font-semibold text-white">Edytuj</Link>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-card-lg border border-border bg-surface p-5">
        <Pill label={rm.label} fg={rm.fg} bg={rm.bg} />
        {reservation.location && <span className="text-[13px] font-semibold text-ink-2">📍 {reservation.location}</span>}
        {job && isOwner && <span className="ml-auto"><RealizationDoneButton reservationId={reservation.id} done={job.status === "DONE"} /></span>}
      </div>

      {isOwner && <ClientConfirmToggle id={reservation.id} confirmed={reservation.client_confirmed} confirmedAt={reservation.client_confirmed_at} />}

      {isOwner && reservation.is_invoice && (
        <InvoiceStatus
          id={reservation.id}
          issued={reservation.invoice_issued}
          issuedAt={reservation.invoice_issued_at}
          invoiceNumber={reservation.invoice_number}
          hasTaxId={Boolean(invoiceCustomer?.tax_id)}
          gross={reservation.price}
          vatRate={invoiceSettings?.vat_rate ?? 23}
        />
      )}

      {weather && (
        <div className={`mb-4 rounded-card-lg border p-4 ${weather.warnings.length ? "border-[#3d3216] bg-[#241e10]" : "border-border bg-surface"}`}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px]">
            <span className="font-bold text-ink">Pogoda · {fmtDate(weather.date)}</span>
            <span className="font-semibold text-ink-2">{weather.label}</span>
            {weather.tempMax != null && <span className="text-ink-2">{Math.round(weather.tempMin ?? weather.tempMax)}–{Math.round(weather.tempMax)}°C</span>}
            {weather.windMax != null && <span className="text-ink-2">wiatr {Math.round(weather.windMax)} km/h</span>}
            {weather.precip != null && <span className="text-ink-2">opady {weather.precip} mm</span>}
          </div>
          {weather.warnings.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {weather.warnings.map((w) => (
                <span key={w.kind} className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#20242e] px-2.5 py-1 text-[11.5px] font-bold" style={{ color: WEATHER_KIND_STYLE[w.kind].color }}>
                  <Icon name={WEATHER_KIND_STYLE[w.kind].icon} className="h-3.5 w-3.5" />
                  {w.text}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.h} className="rounded-[14px] border border-border bg-surface p-4">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.6px] text-ink-2">{c.h}</div>
            {c.rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2 py-1 text-[13px] font-semibold"><span className="text-ink-2">{k}</span><span className="text-right text-ink">{v}</span></div>
            ))}
          </div>
        ))}
      </div>

      {reservation.assembly_time && (assemblyBy || reservation.assembly_time_at) && (
        <p className="mt-3 text-[12px] text-ink-2">Godzinę montażu ({reservation.assembly_time}) ustalono ręcznie{assemblyBy ? ` — ${assemblyBy}` : ""}{reservation.assembly_time_at ? `, ${fmtDate(reservation.assembly_time_at)}` : ""}.</p>
      )}

      {isOwner && reservation.pricing_snapshot && (
        <div className="mt-4 rounded-card-lg border border-border bg-surface p-5">
          <div className="mb-2.5 flex items-baseline gap-2">
            <span className="text-[13px] font-bold text-white">Zapamiętana wycena</span>
            <span className="text-[11px] font-semibold text-ink-2">z dnia {fmtDate(reservation.pricing_snapshot.saved_at)}</span>
          </div>
          <div className="flex flex-col gap-1 text-[13px]">
            {reservation.pricing_snapshot.package && (
              <div className="flex justify-between"><span className="text-ink-2">Pakiet: {reservation.pricing_snapshot.package.name}</span><span className="font-semibold text-ink">{fmtPLN(reservation.pricing_snapshot.package.price)}</span></div>
            )}
            {reservation.pricing_snapshot.addons.map((a, i) => (
              <div key={i} className="flex justify-between"><span className="text-ink-2">{a.name}</span><span className="font-semibold text-ink">{fmtPLN(a.price)}</span></div>
            ))}
            {reservation.pricing_snapshot.transport_price > 0 && (
              <div className="flex justify-between"><span className="text-ink-2">Transport</span><span className="font-semibold text-ink">{fmtPLN(reservation.pricing_snapshot.transport_price)}</span></div>
            )}
            {reservation.pricing_snapshot.discount_amount > 0 && (
              <div className="flex justify-between"><span className="text-ink-2">Rabat</span><span className="font-semibold text-ok">− {fmtPLN(reservation.pricing_snapshot.discount_amount)}</span></div>
            )}
            <div className="flex justify-between border-t border-border-soft pt-1.5 font-bold text-white"><span>Razem</span><span>{fmtPLN(reservation.pricing_snapshot.total)}</span></div>
            <div className="flex justify-between"><span className="text-ink-2">Zadatek</span><span className="font-semibold text-ink">{fmtPLN(reservation.pricing_snapshot.deposit)}</span></div>
          </div>
          <p className="mt-2 text-[11px] text-ink-2">Kopia z chwili zapisu — późniejsze zmiany cennika jej nie zmieniają.</p>
        </div>
      )}

      {job ? (
        <SafeReservationOps job={job} isOwner={isOwner} profile={profile} />
      ) : (
        <SectionCard title="Realizacja" className="mt-4 p-5">
          <p className="px-5 pb-5 text-[13px] text-ink-2">Brak powiązanego zlecenia. Zapisz ponownie rezerwację, aby wygenerować etapy realizacji.</p>
        </SectionCard>
      )}

      {isOwner && (
        <div className="mt-6 border-t border-border-soft pt-4">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.6px] text-ink-2">Strefa niebezpieczna</div>
          <DeleteReservationButton id={reservation.id} />
        </div>
      )}
    </div>
  );
}

interface OpsProps {
  job: NonNullable<Awaited<ReturnType<typeof getJobByReservation>>>;
  isOwner: boolean;
  profile: Awaited<ReturnType<typeof getCurrentProfile>>;
}

// Bezpiecznik: gdyby ładowanie sekcji realizacji rzuciło wyjątek, nie wywalamy
// całej strony — pokazujemy komunikat (i logujemy), zamiast błędu „page couldn't load".
async function SafeReservationOps(props: OpsProps) {
  try {
    return await ReservationOps(props);
  } catch (e) {
    console.error("ReservationOps failed:", e);
    return (
      <div className="mt-4 rounded-card border border-[#3a1c1f] bg-[#251215] p-4 text-[12.5px] text-bad">
        Nie udało się załadować sekcji realizacji. Odśwież stronę — jeśli błąd wraca, zgłoś szefowi.
      </div>
    );
  }
}

/* Sekcje operacyjne (etapy, zespół, pojazdy, transport) — wymagają zlecenia. */
async function ReservationOps({
  job,
  isOwner,
  profile,
}: OpsProps) {
  const [stages, assignments, employees, settings, transportCalcs] = await Promise.all([
    getJobStages(job.id),
    listJobAssignments(job.id),
    listEmployees(),
    getSettings(),
    listTransportCalcs(job.id),
  ]);
  const done = stages.filter((s) => s.status === "DONE").length;
  const ownerBonus = job.owner_bonus ?? 0;

  // §18/§19 Wynagrodzenie: dla iClub — rozliczenie §19 (tryb per pracownik: czas wolny/ryczałt),
  // spójne z widokiem pracownika. Dla wypożyczalni — model stawki (predictedEarnings).
  const iclub = job.business_line === "ICLUB";
  const rules = rulesFromSettings(settings);
  const monthPrefix = (job.event_date ?? "").slice(0, 7);
  const farTrip = transportCalcs.some((c) => (c.one_way_km ?? 0) > 100);
  const hasGastro = job.reservation?.tent_extra === "GASTRO";
  // §18 Ryczałt wypożyczalni per zlecenie (numeric z PG bywa stringiem) — nadpisuje godzinówkę.
  const rentalFlat = job.reservation?.rental_settlement_flat != null ? Number(job.reservation.rental_settlement_flat) : null;
  const buildEarnings = async (rate: EmployeeRate | null, profileId: string): Promise<EarningsBreakdown | null> => {
    if (!iclub) {
      if (rentalFlat != null) {
        return { base: rentalFlat, baseLabel: "Ryczałt za zlecenie", ownerBonus, total: Math.round((rentalFlat + ownerBonus) * 100) / 100, possibleBonuses: [] };
      }
      return rate ? predictedEarnings(rate, job.business_line, ownerBonus, settings.iclub_hours) : null;
    }
    if (!rate) return null;
    const priorCount = monthPrefix ? await countDoneIclubRealizations(profileId, monthPrefix) : 0;
    const s = settlementForRealization(rules, priorCount, { farTrip, hasGastro, rate });
    const guaranteed = s.guaranteed.map((b) => b.label).join(" + ");
    return {
      base: s.baseValue,
      baseLabel: guaranteed ? `${s.baseLabel} + ${guaranteed}` : s.baseLabel,
      ownerBonus,
      total: Math.round((s.total + ownerBonus) * 100) / 100,
      possibleBonuses: s.possible,
    };
  };

  const assignmentViews: AssignmentView[] = await Promise.all(assignments.map(async (a) => ({
    id: a.id,
    profile_id: a.profile_id,
    full_name: a.employee?.full_name ?? "—",
    avatar_url: a.employee?.avatar_url ?? null,
    is_lead: a.is_lead,
    status: a.status,
    earnings: await buildEarnings(a.rate, a.profile_id),
  })));
  const assignedIds = new Set(assignments.map((a) => a.profile_id));
  const availableEmployees = employees.filter((e) => !assignedIds.has(e.id)).map((e) => ({ id: e.id, full_name: e.full_name || "—" }));
  const myRate = employees.find((e) => e.id === profile?.id)?.rate ?? null;
  const myEarnings = profile ? await buildEarnings(myRate, profile.id) : null;
  const amIAssigned = profile ? assignments.some((a) => a.profile_id === profile.id && a.status === "APPROVED") : false;
  const amIRequested = profile ? assignments.some((a) => a.profile_id === profile.id && a.status === "REQUESTED") : false;
  const unavailableIds = await getUnavailableProfileIds(job.event_date);

  const [vehicles, jobVehicles] = await Promise.all([listVehicles(), listJobVehicles(job.id)]);
  const assignedVehicles: JobVehicleView[] = jobVehicles.map((jv) => ({ id: jv.id, vehicle_id: jv.vehicle_id, name: jv.vehicle?.name ?? "—", registration: jv.vehicle?.registration ?? null }));
  const assignedVehicleIds = new Set(jobVehicles.map((jv) => jv.vehicle_id));
  const availableVehicles = vehicles.filter((v) => !assignedVehicleIds.has(v.id)).map((v) => ({ id: v.id, name: v.name }));
  const conflictArrays = await Promise.all(jobVehicles.map((jv) => findVehicleConflicts(jv.vehicle_id, job.event_date, job.id)));
  const vehicleConflicts = [...new Set(conflictArrays.flat())];

  const vehiclesForTransport = vehicles.map((v) => ({ id: v.id, name: v.name, consumption: v.consumption, fuel_type: v.fuel_type }));
  const fuelPrices = { petrol: settings.fuel_price_petrol, diesel: settings.fuel_price_diesel, lpg: settings.fuel_price_lpg };

  const photos = await listJobPhotos(job.id);

  return (
    <>
      <SectionCard title="Etapy realizacji" className="mt-4 p-5">
        <div className="px-5 pb-5">
          {stages.length === 0 ? (
            <p className="text-[13px] text-ink-2">Brak etapów.</p>
          ) : (
            stages.map((s, i) => {
              const sm = STAGE_STATUS_META[s.status];
              return (
                <div key={s.id} className="flex items-center gap-4 border-t border-border-soft py-3 first:border-t-0">
                  <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full border border-border text-[12px] font-bold text-ink-2">{i + 1}</span>
                  <div className="flex-1"><div className="text-[13.5px] font-bold text-ink">{s.title}</div></div>
                  <Pill label={sm.label} fg={sm.fg} bg={sm.bg} />
                </div>
              );
            })
          )}
          <div className="mt-3 text-[12px] font-semibold text-ink-2">Gotowe: {done}/{stages.length}</div>
        </div>
      </SectionCard>

      <JobTeam
        jobId={job.id}
        isOwner={isOwner}
        currentProfileId={profile?.id ?? null}
        ownerBonus={ownerBonus}
        assignments={assignmentViews}
        availableEmployees={availableEmployees}
        unavailableIds={unavailableIds}
        myEarnings={myEarnings}
        amIAssigned={amIAssigned}
        amIRequested={amIRequested}
      />

      <JobVehicles jobId={job.id} isOwner={isOwner} assigned={assignedVehicles} available={availableVehicles} conflicts={vehicleConflicts} />

      <JobTransport jobId={job.id} isOwner={isOwner} calcs={transportCalcs} vehicles={vehiclesForTransport} fuelPrices={fuelPrices} amortizationPerKm={settings.amortization_per_km} />

      <SectionCard title="Zdjęcia z realizacji" className="mt-4 p-5">
        <div className="px-5 pb-5">
          {photos.length === 0 ? (
            <p className="text-[13px] text-ink-2">Brak zdjęć. Pracownik dodaje je w kroku „Zdjęcia” podczas realizacji.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
              {photos.map((ph) => (
                <a key={ph.id} href={ph.url} target="_blank" rel="noopener noreferrer" className="aspect-square overflow-hidden rounded-[12px] border border-border bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ph.url} alt="Zdjęcie realizacji" className="h-full w-full object-cover" />
                </a>
              ))}
            </div>
          )}
        </div>
      </SectionCard>
    </>
  );
}
