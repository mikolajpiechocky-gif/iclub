"use client";
// §II.7 Eksport kosztów (widoczny zakres) do CSV.
export interface ExportRow { spent_on: string | null; category: string; job: string | null; amount: number; status: string; note: string | null }

export function ExportCostsButton({ rows }: { rows: ExportRow[] }) {
  const download = () => {
    const esc = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
    const lines = [["Data", "Kategoria", "Realizacja", "Kwota", "Status", "Notatka"].map(esc).join(",")];
    for (const r of rows) lines.push([r.spent_on ?? "", r.category, r.job ?? "", String(r.amount), r.status, r.note ?? ""].map(esc).join(","));
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `koszty-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <button onClick={download} disabled={rows.length === 0} className="rounded-field border border-border bg-surface-2 px-3.5 py-2.5 text-[13px] font-semibold text-ink disabled:opacity-40">Eksport CSV</button>
  );
}
