// app/(app)/planner/page.tsx — Planer tras (§37). Tylko szef.
import { PageHeader } from "@/components/layout";
import { Alert } from "@/components/ui";
import { getCurrentProfile } from "@/lib/data/profiles";
import { listVehicles } from "@/lib/data/vehicles";
import { isGoogleMapsConfigured } from "@/lib/integrations/google-maps/config";
import { PlannerView } from "./planner-view";

export const dynamic = "force-dynamic";

export default async function PlannerPage() {
  const profile = await getCurrentProfile();
  if (profile && profile.role !== "OWNER") {
    return (
      <div className="mx-auto max-w-[900px] px-5 py-6 md:px-8">
        <PageHeader title="Planer tras" subtitle="Dostępne dla szefa" />
        <Alert tone="info" title="Brak dostępu">Planer tras dostępny tylko dla szefa.</Alert>
      </div>
    );
  }

  const vehicles = await listVehicles();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-[900px] px-5 py-6 md:px-8">
      <PageHeader title="Planer tras" subtitle="Optymalna kolejność realizacji dnia + koszt przejazdu" />
      {!isGoogleMapsConfigured() && (
        <div className="mb-4">
          <Alert tone="info" title="Wymaga Google Maps">Podłącz klucz `GOOGLE_MAPS_API_KEY`, aby optymalizować trasy. Bez niego planer nie policzy kolejności.</Alert>
        </div>
      )}
      <PlannerView vehicles={vehicles.map((v) => ({ id: v.id, name: v.name }))} defaultDate={today} />
    </div>
  );
}
