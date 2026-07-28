"use client";
// §pracownicy Układ master-detail: lista pracowników po lewej, po wyborze po prawej pełny
// moduł stawek i rozliczeń. Forma inspirowana układem dwukolumnowym (treść w pełni iClub).
import { useState } from "react";
import { Avatar } from "@/components/avatar";
import { Pill } from "@/components/ui";
import { Icon } from "@/components/icons";
import type { EmployeeWithRate } from "@/lib/data/types";
import { RATE_MODEL_LABELS } from "@/lib/data/types";
import type { EmployeeSettlementRow } from "@/lib/data/assignments";
import { RateForm } from "./rate-form";
import { EmployeeSettlements } from "./employee-settlements";

const fmtPLN = (v: number | null | undefined) => (v == null ? "—" : new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(v));
const roleLabel = (r: string) => (r === "OWNER" ? "Szef" : "Pracownik");

function rateSummary(e: EmployeeWithRate): string {
  if (!e.rate) return "Stawki nie ustawione";
  return `${RATE_MODEL_LABELS[e.rate.rate_model]} · ${e.rate.hourly_rate != null ? fmtPLN(e.rate.hourly_rate) + "/h" : fmtPLN(e.rate.iclub_flat)}`;
}

export function EmployeesWorkspace({ employees, settlements }: { employees: EmployeeWithRate[]; settlements: Record<string, EmployeeSettlementRow[]> }) {
  const [selectedId, setSelectedId] = useState<string | null>(employees[0]?.id ?? null);
  const selected = employees.find((e) => e.id === selectedId) ?? null;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[300px_minmax(0,1fr)]">
      {/* Lewa kolumna: lista pracowników */}
      <aside className={`rounded-card-lg border border-border bg-surface p-2 ${selected ? "hidden md:block" : "block"}`}>
        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-[0.6px] text-ink-2">Zespół · {employees.length} {employees.length === 1 ? "osoba" : "osób"}</div>
        <ul className="flex flex-col gap-1">
          {employees.map((e) => {
            const active = e.id === selectedId;
            return (
              <li key={e.id}>
                <button
                  onClick={() => setSelectedId(e.id)}
                  className={`flex w-full items-center gap-3 rounded-card px-3 py-2.5 text-left transition ${active ? "bg-surface-2 ring-1 ring-accent/40" : "hover:bg-surface-2"}`}
                >
                  <Avatar name={e.full_name || "—"} url={e.avatar_url ?? null} size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-bold text-ink">{e.full_name || "—"}</div>
                    <div className="truncate text-[11.5px] text-ink-2">{rateSummary(e)}</div>
                  </div>
                  <Pill label={roleLabel(e.role)} fg={e.role === "OWNER" ? "#b98cf5" : "#7fa8f5"} bg={e.role === "OWNER" ? "#271b3f" : "#182238"} />
                </button>
              </li>
            );
          })}
          {employees.length === 0 && <li className="px-3 py-4 text-[13px] text-ink-2">Brak pracowników.</li>}
        </ul>
      </aside>

      {/* Prawa kolumna: szczegóły wybranego pracownika */}
      <section className={selected ? "block" : "hidden md:block"}>
        {selected ? (
          <div>
            <div className="mb-3 flex items-center gap-3">
              <button onClick={() => setSelectedId(null)} className="rounded-field border border-border bg-surface-2 px-3 py-2 text-[12.5px] font-semibold text-ink-2 md:hidden">‹ Lista</button>
              <Avatar name={selected.full_name || "—"} url={selected.avatar_url ?? null} size={44} />
              <div className="min-w-0">
                <div className="truncate font-display text-[18px] font-bold text-white">{selected.full_name || "Pracownik"}</div>
                <div className="text-[12px] font-semibold text-ink-2">Model rozliczenia, stawki i rozliczenia</div>
              </div>
            </div>
            <RateForm key={selected.id} employee={selected} embedded />
            <EmployeeSettlements key={`s-${selected.id}`} profileId={selected.id} rows={settlements[selected.id] ?? []} />
          </div>
        ) : (
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-card-lg border border-border bg-surface text-center">
            <Icon name="users" className="mb-2 h-8 w-8 text-ink-2/50" />
            <p className="text-[13px] text-ink-2">Wybierz pracownika z listy, aby ustawić stawki i zobaczyć rozliczenia.</p>
          </div>
        )}
      </section>
    </div>
  );
}
