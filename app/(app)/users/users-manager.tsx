"use client";
// Panel użytkowników: imię, e-mail, rola + reset hasła. Tylko właściciel.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SectionCard, Alert, Pill } from "@/components/ui";
import type { ProfileRecord, UserRole } from "@/lib/data/types";
import { updateUserRoleAction, updateUserNameAction, changeUserEmailAction, resetUserPasswordAction } from "./actions";

type UserWithEmail = ProfileRecord & { email: string };

interface Row {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  savedName: string;
  savedEmail: string;
  savedRole: UserRole;
}

export function UsersManager({
  users,
  currentUserId,
  disabled,
  canAdmin,
}: {
  users: UserWithEmail[];
  currentUserId: string | null;
  disabled?: boolean;
  canAdmin?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [pwById, setPwById] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<Row[]>(
    users.map((u) => ({ id: u.id, full_name: u.full_name, email: u.email, role: u.role, savedName: u.full_name, savedEmail: u.email, savedRole: u.role })),
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
      if (canAdmin && row.email !== row.savedEmail) {
        const res = await changeUserEmailAction(row.id, row.email);
        if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      }
      if (row.role !== row.savedRole) {
        const res = await updateUserRoleAction(row.id, row.role);
        if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      }
      setRows((rs) => rs.map((rr) => (rr.id === row.id ? { ...rr, savedName: row.full_name, savedEmail: row.email, savedRole: row.role } : rr)));
      setSavedId(row.id);
      router.refresh();
    });
  };

  const resetPassword = (row: Row) => {
    if (typeof window !== "undefined" && !window.confirm(`Zresetować hasło dla „${row.full_name || row.email}"? Obecne hasło przestanie działać.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await resetUserPasswordAction(row.id);
      if (res.ok && res.tempPassword) setPwById((m) => ({ ...m, [row.id]: res.tempPassword! }));
      else setError(res.error ?? "Błąd");
    });
  };

  return (
    <SectionCard title="Użytkownicy" className="p-5">
      <div className="px-5 pb-5">
        {error && <div className="mb-3"><Alert tone="bad" title="Nie udało się zapisać">{error}</Alert></div>}

        <div className="flex flex-col gap-3">
          {rows.map((r) => {
            const isSelf = r.id === currentUserId;
            const dirty = r.full_name !== r.savedName || (canAdmin && r.email !== r.savedEmail) || r.role !== r.savedRole;
            return (
              <div key={r.id} className="rounded-[12px] border border-border bg-surface p-3.5">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <input
                    value={r.full_name}
                    onChange={(e) => patch(r.id, { full_name: e.target.value })}
                    disabled={disabled}
                    placeholder="Imię i nazwisko"
                    className="rounded-[10px] border border-border bg-surface-2 px-3 py-2 text-[13.5px] font-semibold text-ink outline-none focus:border-brand"
                  />
                  {canAdmin && (
                    <input
                      value={r.email}
                      onChange={(e) => patch(r.id, { email: e.target.value })}
                      disabled={disabled}
                      placeholder="e-mail"
                      type="email"
                      className="rounded-[10px] border border-border bg-surface-2 px-3 py-2 text-[13px] text-ink outline-none focus:border-brand"
                    />
                  )}
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-2">
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
                      className="rounded-[10px] border border-border bg-surface-2 px-3 py-2 text-[13px] font-semibold text-ink outline-none focus:border-brand"
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
                  {canAdmin && !disabled && (
                    <button onClick={() => resetPassword(r)} disabled={pending} className="rounded-[10px] border border-border bg-surface-2 px-3.5 py-2 text-[12.5px] font-semibold text-ink-2">
                      Resetuj hasło
                    </button>
                  )}
                </div>

                {pwById[r.id] && (
                  <div className="mt-2.5">
                    <Alert tone="ok" title="Nowe hasło tymczasowe — przekaż użytkownikowi">
                      <span className="font-mono text-[13px] font-bold text-ink">{pwById[r.id]}</span>
                      <span className="mt-1 block text-[12px]">Zaloguje się nim i zmieni hasło. Pokazujemy je tylko teraz.</span>
                    </Alert>
                  </div>
                )}
              </div>
            );
          })}
          {rows.length === 0 && <div className="py-3 text-[13px] text-ink-2">Brak użytkowników.</div>}
        </div>
      </div>
    </SectionCard>
  );
}
