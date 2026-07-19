// app/(app)/employees/page.tsx — Pracownicy i stawki (RSC, tylko OWNER).
import Link from "next/link";
import { PageHeader } from "@/components/layout";
import { Pill, Alert } from "@/components/ui";
import { getCurrentProfile } from "@/lib/data/profiles";
import { listEmployees } from "@/lib/data/employees";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { RATE_MODEL_LABELS } from "@/lib/data/types";

export const dynamic = "force-dynamic";

const fmtPLN = (v: number | null | undefined) =>
  v == null ? "—" : new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(v);

const roleLabel = (r: string) => (r === "OWNER" ? "Właściciel" : "Pracownik");

export default async function EmployeesPage() {
  const profile = await getCurrentProfile();
  if (profile && profile.role !== "OWNER") {
    return (
      <div className="mx-auto max-w-[820px] px-5 py-6 md:px-8">
        <PageHeader title="Pracownicy" subtitle="Moduł dostępny dla właściciela" />
        <Alert tone="info" title="Brak dostępu">
          Stawki i wynagrodzenia widzi tylko właściciel. Twoje zarobki znajdziesz w swoim panelu (wkrótce).
        </Alert>
      </div>
    );
  }

  const employees = await listEmployees();
  const demo = !isSupabaseConfigured();

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-6 md:px-8">
      <PageHeader title="Pracownicy" subtitle={`${employees.length} osób · stawki i premie`} />

      {demo && (
        <div className="mb-4 flex items-center gap-2 rounded-card border border-[#3d3216] bg-[#241e10] px-4 py-3 text-[12.5px] text-warn">
          Tryb demo — dane przykładowe. Pracowników zakłada właściciel w panelu Supabase (Authentication → Users).
        </div>
      )}

      <div className="hidden overflow-hidden rounded-card border border-border bg-surface md:block">
        <table className="w-full text-left">
          <thead className="border-b border-border bg-[#12131a] text-[11px] font-bold uppercase tracking-[0.5px] text-muted">
            <tr>
              {["Pracownik", "Rola", "Model rozliczenia", "Stawka / ryczałt", "Dosprzedaż", ""].map((h, i) => (
                <th key={i} className="px-4 py-3 font-bold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id} className="border-b border-border-soft last:border-0 hover:bg-surface-2">
                <td className="px-4 py-3"><Link href={`/employees/${e.id}`} className="text-[13.5px] font-bold text-ink">{e.full_name || "—"}</Link></td>
                <td className="px-4 py-3"><Pill label={roleLabel(e.role)} fg={e.role === "OWNER" ? "#b98cf5" : "#7fa8f5"} bg={e.role === "OWNER" ? "#271b3f" : "#182238"} /></td>
                <td className="px-4 py-3 text-[13px] text-ink-2">{e.rate ? RATE_MODEL_LABELS[e.rate.rate_model] : "— nie ustawiono —"}</td>
                <td className="px-4 py-3 text-[13px] text-ink">{e.rate ? (e.rate.hourly_rate != null ? `${fmtPLN(e.rate.hourly_rate)}/h` : fmtPLN(e.rate.iclub_flat)) : "—"}</td>
                <td className="px-4 py-3 text-[13px] text-ink-2">{e.rate?.upsell_percent != null ? `${e.rate.upsell_percent}%` : "—"}</td>
                <td className="px-4 py-3 text-right"><Link href={`/employees/${e.id}`} className="text-[12.5px] font-semibold">Ustaw stawki →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MOBILE */}
      <div className="flex flex-col gap-3 md:hidden">
        {employees.map((e) => (
          <Link key={e.id} href={`/employees/${e.id}`} className="rounded-card border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="text-[14.5px] font-bold text-ink">{e.full_name || "—"}</div>
              <Pill label={roleLabel(e.role)} fg={e.role === "OWNER" ? "#b98cf5" : "#7fa8f5"} bg={e.role === "OWNER" ? "#271b3f" : "#182238"} />
            </div>
            <div className="mt-1.5 text-[12.5px] text-ink-2">{e.rate ? `${RATE_MODEL_LABELS[e.rate.rate_model]} · ${e.rate.hourly_rate != null ? fmtPLN(e.rate.hourly_rate) + "/h" : fmtPLN(e.rate.iclub_flat)}` : "Stawki nie ustawione"}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
