// app/(app)/reservations/[id]/page.tsx — Rezerwacja = realizacja.
// Jedno miejsce dla właściciela: sprzedaż + operacje (etapy, zespół, pojazdy,
// transport, umowa). Zlecenie jest technicznym rekordem 1:1 z rezerwacją.
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout";
import { SectionCard, Pill } from "@/components/ui";
import { getReservation } from "@/lib/data/reservations";
import { getJobByReservation, getJobStages } from "@/lib/data/jobs";
import { listJobAssignments } from "@/lib/data/assignments";
import { listEmployees } from "@/lib/data/employees";
import { getCurrentProfile } from "@/lib/data/profiles";
import { predictedEarnings } from "@/lib/domain/earnings";
import { getUnavailableProfileIds } from "@/lib/data/availability";
import { listVehicles, listJobVehicles, findVehicleConflicts } from "@/lib/data/vehicles";
import { RESERVATION_STATUS_META, STAGE_STATUS_META } from "@/lib/data/types";
import { listTransportCalcs } from "@/lib/data/transport";
import { DEFAULT_FUEL_PRICE } from "@/lib/domain/transport";
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

  const cards: { h: string; rows: [string, string][] }[] = [
    { h: "Klient", rows: [["Klient", (r as { customer?: { name?: string } }).customer?.name ?? "—"], ["Źródło", reservation.source ?? "—"]] },
    { h: "Wydarzenie", rows: [["Typ", reservation.event_type ?? "—"], ["Goście", reservation.guests != null ? `${reservation.guests} osób` : "—"], ["Data", fmtDate(reservation.event_date)]] },
    { h: "Terminy", rows: [["Montaż", fmtDate(reservation.setup_date)], ["Demontaż", fmtDate(reservation.teardown_date)], ["Lokalizacja", reservation.location ?? "—"]] },
    { h: "Namiot i pakiet", rows: [["Namiot", (r as { tent?: { name?: string } }).tent?.name ?? "—"], ["Pakiet", (r as { package?: { name?: string } }).package?.name ?? "—"]] },
    { h: "Rozliczenie", rows: [["Wartość", fmtPLN(reservation.price)], ["Rabat", fmtPLN(reservation.discount ?? 0)], ["Zaliczka", fmtPLN(reservation.deposit ?? 0)]] },
  ];

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
      </div>

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

      {job ? (
        <ReservationOps job={job} isOwner={isOwner} profile={profile} />
      ) : (
        <SectionCard title="Realizacja" className="mt-4 p-5">
          <p className="px-5 pb-5 text-[13px] text-ink-2">Brak powiązanego zlecenia. Zapisz ponownie rezerwację, aby wygenerować etapy realizacji.</p>
        </SectionCard>
      )}
    </div>
  );
}

/* Sekcje operacyjne (etapy, zespół, pojazdy, transport) — wymagają zlecenia. */
async function ReservationOps({
  job,
  isOwner,
  profile,
}: {
  job: NonNullable<Awaited<ReturnType<typeof getJobByReservation>>>;
  isOwner: boolean;
  profile: Awaited<ReturnType<typeof getCurrentProfile>>;
}) {
  const [stages, assignments, employees] = await Promise.all([
    getJobStages(job.id),
    listJobAssignments(job.id),
    listEmployees(),
  ]);
  const done = stages.filter((s) => s.status === "DONE").length;
  const ownerBonus = job.owner_bonus ?? 0;

  const assignmentViews: AssignmentView[] = assignments.map((a) => ({
    id: a.id,
    profile_id: a.profile_id,
    full_name: a.employee?.full_name ?? "—",
    is_lead: a.is_lead,
    earnings: a.rate ? predictedEarnings(a.rate, job.business_line, ownerBonus) : null,
  }));
  const assignedIds = new Set(assignments.map((a) => a.profile_id));
  const availableEmployees = employees.filter((e) => !assignedIds.has(e.id)).map((e) => ({ id: e.id, full_name: e.full_name || "—" }));
  const myRate = employees.find((e) => e.id === profile?.id)?.rate ?? null;
  const myEarnings = myRate ? predictedEarnings(myRate, job.business_line, ownerBonus) : null;
  const amIAssigned = profile ? assignedIds.has(profile.id) : false;
  const unavailableIds = await getUnavailableProfileIds(job.event_date);

  const [vehicles, jobVehicles] = await Promise.all([listVehicles(), listJobVehicles(job.id)]);
  const assignedVehicles: JobVehicleView[] = jobVehicles.map((jv) => ({ id: jv.id, vehicle_id: jv.vehicle_id, name: jv.vehicle?.name ?? "—", registration: jv.vehicle?.registration ?? null }));
  const assignedVehicleIds = new Set(jobVehicles.map((jv) => jv.vehicle_id));
  const availableVehicles = vehicles.filter((v) => !assignedVehicleIds.has(v.id)).map((v) => ({ id: v.id, name: v.name }));
  const conflictArrays = await Promise.all(jobVehicles.map((jv) => findVehicleConflicts(jv.vehicle_id, job.event_date, job.id)));
  const vehicleConflicts = [...new Set(conflictArrays.flat())];

  const transportCalcs = await listTransportCalcs(job.id);
  const vehiclesForTransport = vehicles.map((v) => ({ id: v.id, name: v.name, consumption: v.consumption }));

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
      />

      <JobVehicles jobId={job.id} isOwner={isOwner} assigned={assignedVehicles} available={availableVehicles} conflicts={vehicleConflicts} />

      <JobTransport jobId={job.id} isOwner={isOwner} calcs={transportCalcs} vehicles={vehiclesForTransport} defaultFuelPrice={DEFAULT_FUEL_PRICE} />
    </>
  );
}
