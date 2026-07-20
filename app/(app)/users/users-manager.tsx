"use client";
// Panel użytkowników: edycja imienia i roli (OWNER/EMPLOYEE). Tylko właściciel.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SectionCard, Alert, Pill } from "@/components/ui";
import type { ProfileRecord, UserRole } from "@/lib/data/types";
import { updateUserRoleAction, updateUserNameAction } from "./actions";

interface Row {
  id: string;
  full_name: string;
  role: UserRole;
  savedName: string;
  savedRole: UserRole;
}

export function UsersManager({
  users,
  currentUserId,
  disabled,
}: {
  users: ProfileRecord[];
  currentUserId: string | null;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>(
    users.map((u) => ({ id: u.id, full_name: u.full_name, role: u.role, savedName: u.full_name, savedRole: u.role })),
  );

  const patch = (id: string, p: Partial<Row>) => {
    setSavedId(null);
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));
  };

  const save = (row: Row) => {
    setError(null);
    setSavedId(null);
    startTransition(async () => {
      if (row.full_name !== row.savedName) {
        const res = await updateUserNameAction(row.id, row.full_name);
        if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      }
      if (row.role !== row.savedRole) {
        const res = await updateUserRoleAction(row.id, row.role);
        if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      }
      // Zapisano — przesuń bazę porównania, żeby przycisk przestał być „dirty".
      setRows((rs) => rs.map((rr) => (rr.id === row.id ? { ...rr, savedName: row.full_name, savedRole: row.role } : rr)));
      setSavedId(row.id);
      router.refresh();
    });
  };

  return (
    <SectionCard title="Użytkownicy" className="p-5">
      <div className="px-5 pb-5">
        {error && <div className="mb-3"><Alert tone="bad" title="Nie udało się zapisać">{error}</Alert></div>}

        <div className="flex flex-col divide-y divide-border-soft">
          {rows.map((r) => {
            const isSelf = r.id === currentUserId;
            const dirty = r.full_name !== r.savedName || r.role !== r.savedRole;
            return (
              <div key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                <input
                  value={r.full_name}
                  onChange={(e) => patch(r.id, { full_name: e.target.value })}
                  disabled={disabled}
                  placeholder="Imię i nazwisko"
                  className="min-w-[180px] flex-1 rounded-[10px] border border-border bg-surface px-3 py-2 text-[13.5px] font-semibold text-ink outline-none focus:border-brand"
                />
                {isSelf ? (
                  <span className="flex items-center gap-2">
                    <Pill label={r.role === "OWNER" ? "Właściciel" : "Pracownik"} fg={r.role === "OWNER" ? "#b98cf5" : "#7fa8f5"} bg={r.role === "OWNER" ? "#271b3f" : "#182238"} />
                    <span className="text-[11.5px] font-semibold text-ink-2">(Ty)</span>
                  </span>
                ) : (
                  <select
                    value={r.role}
                    onChange={(e) => patch(r.id, { role: e.target.value as UserRole })}
                    disabled={disabled}
                    className="rounded-[10px] border border-border bg-surface px-3 py-2 text-[13px] font-semibold text-ink outline-none focus:border-brand"
                  >
                    <option value="EMPLOYEE">Pracownik</option>
                    <option value="OWNER">Właściciel</option>
                  </select>
                )}
                <button
                  onClick={() => save(r)}
                  disabled={pending || disabled || !dirty}
                  className={`rounded-[10px] px-3.5 py-2 text-[12.5px] font-bold ${dirty && !disabled ? "bg-brand text-white" : "border border-border bg-surface-2 text-ink-2"}`}
                >
                  {savedId === r.id ? "Zapisano ✓" : "Zapisz"}
                </button>
              </div>
            );
          })}
          {rows.length === 0 && <div className="py-3 text-[13px] text-ink-2">Brak użytkowników.</div>}
        </div>
      </div>
    </SectionCard>
  );
}
