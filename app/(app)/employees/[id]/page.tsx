// app/(app)/employees/[id]/page.tsx — Edycja stawek pracownika (tylko OWNER).
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout";
import { Alert } from "@/components/ui";
import { getCurrentProfile } from "@/lib/data/profiles";
import { getEmployee } from "@/lib/data/employees";
import { RateForm } from "../rate-form";

export const dynamic = "force-dynamic";

export default async function EmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();

  if (profile && profile.role !== "OWNER") {
    return (
      <div className="mx-auto max-w-[820px] px-5 py-6 md:px-8">
        <PageHeader title="Pracownik" subtitle="Moduł dostępny dla szefa" back={{ href: "/employees", label: "Pracownicy" }} />
        <Alert tone="info" title="Brak dostępu">Stawki widzi tylko szef.</Alert>
      </div>
    );
  }

  const employee = await getEmployee(id);
  if (!employee) notFound();
  return <RateForm employee={employee} />;
}
