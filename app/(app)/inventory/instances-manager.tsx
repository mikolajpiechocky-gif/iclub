"use client";
// §17.2 Egzemplarze pozycji magazynowej: lista + dodawanie/edycja (numer, zdjęcie, stan, notatki).
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SectionCard, TextField, SelectField, PrimaryButton, SecondaryButton, Alert, Pill } from "@/components/ui";
import type { EquipmentInstanceRecord, EquipmentStatus } from "@/lib/data/types";
import { EQUIPMENT_STATUS_ORDER, EQUIPMENT_STATUS_LABELS, EQUIPMENT_STATUS_META } from "@/lib/data/types";
import { createInstanceAction, updateInstanceAction, setInstanceActiveAction, type InstanceFormValues } from "./instance-actions";
import { fileToPhoto } from "./photo-util";

const EMPTY: InstanceFormValues = { serial_number: "", label: "", status: "AVAILABLE", photo_url: "", notes: "" };

export function InstancesManager({ equipmentId, initialInstances }: { equipmentId: string; initialInstances: EquipmentInstanceRecord[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null); // null = nowy, "" = zamknięty
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<InstanceFormValues>(EMPTY);

  const set = <K extends keyof InstanceFormValues>(k: K, val: InstanceFormValues[K]) => setForm((s) => ({ ...s, [k]: val }));

  const openNew = () => { setEditingId(null); setForm(EMPTY); setErrors({}); setError(null); setOpen(true); };
  const openEdit = (it: EquipmentInstanceRecord) => {
    setEditingId(it.id);
    setForm({ serial_number: it.serial_number ?? "", label: it.label ?? "", status: it.status, photo_url: it.photo_url ?? "", notes: it.notes ?? "" });
    setErrors({}); setError(null); setOpen(true);
  };

  const pickPhoto = async (file: File | null) => {
    if (!file) return;
    setError(null);
    try { set("photo_url", await fileToPhoto(file)); }
    catch (e) { setError(e instanceof Error ? e.message : "Nie udało się wczytać zdjęcia."); }
  };

  const save = () => {
    setError(null); setErrors({});
    start(async () => {
      const res = editingId ? await updateInstanceAction(editingId, equipmentId, form) : await createInstanceAction(equipmentId, form);
      if (res.ok) { setOpen(false); router.refresh(); return; }
      if (res.fieldErrors) setErrors(res.fieldErrors);
      if (res.error) setError(res.error);
    });
  };

  const toggleActive = (it: EquipmentInstanceRecord) => {
    setError(null);
    start(async () => {
      const res = await setInstanceActiveAction(it.id, equipmentId, !it.active);
      if (res.ok) { router.refresh(); return; }
      setError(res.error ?? "Błąd");
    });
  };

  return (
    <SectionCard title={`Egzemplarze (${initialInstances.length})`} className="mt-4 p-5">
      <div className="px-5 pb-5">
        {error && <div className="mb-3"><Alert tone="bad" title="Błąd">{error}</Alert></div>}

        <div className="mb-3 flex flex-col gap-2">
          {initialInstances.length === 0 && <p className="text-[12.5px] text-ink-2">Brak egzemplarzy. Dodaj konkretne sztuki (numer seryjny, zdjęcie, stan).</p>}
          {initialInstances.map((it) => {
            const m = EQUIPMENT_STATUS_META[it.status];
            return (
              <div key={it.id} className={`flex flex-wrap items-center gap-3 rounded-[12px] border border-border bg-surface-2 px-3.5 py-2.5 ${it.active ? "" : "opacity-55"}`}>
                {it.photo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.photo_url} alt="" className="h-11 w-11 flex-none rounded-[9px] border border-border object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-bold text-ink">{it.label || it.serial_number || "Egzemplarz"}{it.label && it.serial_number ? <span className="ml-1.5 text-[11.5px] font-medium text-ink-2">nr {it.serial_number}</span> : null}</div>
                  {it.notes && <div className="truncate text-[11.5px] text-ink-2">{it.notes}</div>}
                </div>
                {!it.active && <span className="rounded-[6px] bg-surface px-1.5 py-0.5 text-[10px] font-bold text-ink-2">Wycofany</span>}
                <Pill label={m.label} fg={m.fg} bg={m.bg} />
                <button type="button" onClick={() => openEdit(it)} disabled={pending} className="rounded-[9px] border border-border bg-surface px-2.5 py-1.5 text-[11.5px] font-semibold text-ink-2">Edytuj</button>
                <button type="button" onClick={() => toggleActive(it)} disabled={pending} className="rounded-[9px] border border-border bg-surface px-2.5 py-1.5 text-[11.5px] font-semibold text-ink-2">{it.active ? "Wycofaj" : "Przywróć"}</button>
              </div>
            );
          })}
        </div>

        {open ? (
          <div className="rounded-[12px] border border-border bg-surface-2 p-3.5">
            <div className="mb-2 text-[12.5px] font-bold text-ink">{editingId ? "Edycja egzemplarza" : "Nowy egzemplarz"}</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField label="Oznaczenie" placeholder="np. Laser #1" value={form.label} onChange={(e) => set("label", e.target.value)} error={errors.label} />
              <TextField label="Numer seryjny" placeholder="SN…" value={form.serial_number} onChange={(e) => set("serial_number", e.target.value)} />
              <SelectField label="Stan" value={form.status} onChange={(e) => set("status", e.target.value as EquipmentStatus)}>
                {EQUIPMENT_STATUS_ORDER.map((s) => <option key={s} value={s}>{EQUIPMENT_STATUS_LABELS[s]}</option>)}
              </SelectField>
              <div className="flex items-center gap-3">
                {form.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.photo_url} alt="" className="h-12 w-12 flex-none rounded-[9px] border border-border object-cover" />
                ) : (
                  <div className="flex h-12 w-12 flex-none items-center justify-center rounded-[9px] border border-dashed border-border bg-surface text-[9px] text-ink-2">brak</div>
                )}
                <label className="cursor-pointer rounded-[9px] border border-border bg-surface px-3 py-1.5 text-[12px] font-semibold text-ink-2">
                  {form.photo_url ? "Zmień" : "Zdjęcie"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { pickPhoto(e.target.files?.[0] ?? null); e.target.value = ""; }} />
                </label>
                {form.photo_url && <button type="button" onClick={() => set("photo_url", "")} className="text-[11.5px] font-semibold text-bad">Usuń</button>}
              </div>
              <div className="sm:col-span-2">
                <TextField label="Notatki" placeholder="Stan techniczny, przypisanie do zestawu…" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <PrimaryButton type="button" icon="check" onClick={save} disabled={pending}>{pending ? "Zapisywanie…" : editingId ? "Zapisz" : "Dodaj egzemplarz"}</PrimaryButton>
              <SecondaryButton type="button" onClick={() => setOpen(false)}>Anuluj</SecondaryButton>
            </div>
          </div>
        ) : (
          <button type="button" onClick={openNew} className="rounded-[10px] border border-border bg-surface-2 px-3.5 py-2 text-[12.5px] font-bold text-accent-soft">+ Dodaj egzemplarz</button>
        )}
      </div>
    </SectionCard>
  );
}
