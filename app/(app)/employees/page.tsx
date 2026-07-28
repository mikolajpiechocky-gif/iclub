// app/(app)/employees/page.tsx — Pracownicy: master-detail (lista + panel stawek/rozliczeń). Tylko OWNER.
import { PageHeader } from "@/components/layout";
import { Alert } from "@/components/ui";
import { getCurrentProfile } from "@/lib/data/profiles";
import { listEmployees } from "@/lib/data/employees";
import { listEmployeeSettlements, type EmployeeSettlementRow } from "@/lib/data/assignments";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { EmployeesWorkspace } from "./employees-workspace";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const profile = await getCurrentProfile();
  if (profile && profile.role !== "OWNER") {
    return (
      <div className="mx-auto max-w-[820px] px-5 py-6 md:px-8">
        <PageHeader title="Pracownicy" subtitle="Moduł dostępny dla szefa" />
        <Alert tone="info" title="Brak dostępu">
          Stawki i wynagrodzenia widzi tylko szef. Twoje zarobki znajdziesz w swoim panelu (wkrótce).
        </Alert>
      </div>
    );
  }

  const employees = await listEmployees();
  const demo = !isSupabaseConfigured();

  // Rozliczenia (zakończone realizacje) per pracownik — mały zespół, ładujemy z góry.
  const settlementsPairs = await Promise.all(employees.map(async (e) => [e.id, await listEmployeeSettlements(e.id)] as const));
  const settlements: Record<string, EmployeeSettlementRow[]> = Object.fromEntries(settlementsPairs);

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-6 md:px-8">
      <PageHeader title="Pracownicy" subtitle={`${employees.length} osób · stawki, premie i rozliczenia`} />
      {demo && (
        <div className="mb-4 flex items-center gap-2 rounded-card border border-[#3d3216] bg-[#241e10] px-4 py-3 text-[12.5px] text-warn">
          Tryb demo — dane przykładowe. Pracowników zakłada szef w panelu Supabase (Authentication → Users).
        </div>
      )}
      <EmployeesWorkspace employees={employees} settlements={settlements} />
    </div>
  );
}
