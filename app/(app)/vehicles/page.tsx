// app/(app)/vehicles/page.tsx — Flota (RSC, tylko OWNER).
import Link from "next/link";
import { PageHeader } from "@/components/layout";
import { PrimaryButton, EmptyState, Alert } from "@/components/ui";
import { getCurrentProfile } from "@/lib/data/profiles";
import { listVehicles } from "@/lib/data/vehicles";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "short", year: "numeric" }) : "—");

export default async function VehiclesPage() {
  const profile = await getCurrentProfile();
  if (profile && profile.role !== "OWNER") {
    return (
      <div className="mx-auto max-w-[820px] px-5 py-6 md:px-8">
        <PageHeader title="Flota" subtitle="Dostępne dla właściciela" />
        <Alert tone="info" title="Brak dostępu">Zarządzanie flotą jest dostępne dla właściciela.</Alert>
      </div>
    );
  }

  const vehicles = await listVehicles();
  const demo = !isSupabaseConfigured();

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-6 md:px-8">
      <PageHeader title="Flota" subtitle={`${vehicles.length} pojazdów`} actions={<Link href="/vehicles/new"><PrimaryButton icon="plus">Dodaj pojazd</PrimaryButton></Link>} />
      {demo && (
        <div className="mb-4 flex items-center gap-2 rounded-card border border-[#3d3216] bg-[#241e10] px-4 py-3 text-[12.5px] text-warn">Tryb demo — dane przykładowe.</div>
      )}
      {vehicles.length === 0 ? (
        <EmptyState icon="truck" title="Brak pojazdów" desc="Dodaj pierwszy pojazd do floty." action={<Link href="/vehicles/new"><PrimaryButton icon="plus">Dodaj pojazd</PrimaryButton></Link>} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {vehicles.map((v) => (
            <Link key={v.id} href={`/vehicles/${v.id}/edit`} className="rounded-card border border-border bg-surface p-4">
              <div className="flex items-center justify-between">
                <div className="text-[14.5px] font-bold text-ink">{v.name}</div>
                <div className="text-[12px] font-semibold text-ink-2">{v.registration ?? "—"}</div>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-ink-2">
                {v.type && <span>{v.type}</span>}
                {v.fuel_type && <span>⛽ {v.fuel_type}</span>}
                {v.consumption != null && <span>{v.consumption} l/100km</span>}
                {v.capacity && <span>{v.capacity}</span>}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 text-[11.5px] text-muted">
                <span>Ubezpieczenie: {fmtDate(v.insurance_date)}</span>
                <span>Przegląd: {fmtDate(v.inspection_date)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
