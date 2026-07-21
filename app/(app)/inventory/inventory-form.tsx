"use client";
// Formularz pozycji magazynowej (§17) — dodawanie/edycja. Dostępny dla każdego pracownika.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PageHeader } from "@/components/layout";
import { SectionCard, TextField, SelectField, PrimaryButton, SecondaryButton, Alert } from "@/components/ui";
import type { EquipmentRecord, EquipmentStatus } from "@/lib/data/types";
import { EQUIPMENT_STATUS_ORDER, EQUIPMENT_STATUS_LABELS } from "@/lib/data/types";
import { createInventoryAction, updateInventoryAction, setInventoryActiveAction, type InventoryFormValues } from "./actions";

const CATEGORIES = ["Meble", "Nagłośnienie", "Oświetlenie", "Ogrzewanie", "Namioty", "Dekoracje", "Zasilanie", "Inne"];

// Zmniejsza wybrane zdjęcie do maks. 400 px (dłuższy bok) i zwraca miniaturę jako data URL.
async function fileToPhoto(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result as string);
    fr.onerror = () => rej(new Error("Nie udało się odczytać pliku."));
    fr.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("Nieprawidłowy obraz."));
    i.src = dataUrl;
  });
  const max = 400;
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.8);
}

export function InventoryForm({ initial }: { initial?: EquipmentRecord }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(initial);

  const [v, setV] = useState<InventoryFormValues>({
    code: initial?.code ?? "",
    name: initial?.name ?? "",
    category: initial?.category ?? "",
    quantity: initial?.quantity != null ? String(initial.quantity) : "",
    tracking: initial?.tracking ?? "QUANTITY",
    unit: initial?.unit ?? "",
    location: initial?.location ?? "",
    set_number: initial?.set_number ?? "",
    unit_cost: initial?.unit_cost != null ? String(initial.unit_cost) : "",
    purchase_date: initial?.purchase_date ?? "",
    supplier: initial?.supplier ?? "",
    rental_price: initial?.rental_price != null ? String(initial.rental_price) : "",
    replacement_value: initial?.replacement_value != null ? String(initial.replacement_value) : "",
    status: initial?.status ?? "AVAILABLE",
    is_rentable: initial?.is_rentable ?? false,
    is_addon: initial?.is_addon ?? false,
    internal_only: initial?.internal_only ?? false,
    notes: initial?.notes ?? "",
    photo_url: initial?.photo_url ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const pickPhoto = async (file: File | null) => {
    if (!file) return;
    setFormError(null);
    try {
      const dataUrl = await fileToPhoto(file);
      set("photo_url", dataUrl);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Nie udało się wczytać zdjęcia.");
    }
  };

  const set = <K extends keyof InventoryFormValues>(k: K, val: InventoryFormValues[K]) => setV((s) => ({ ...s, [k]: val }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    startTransition(async () => {
      const res = isEdit ? await updateInventoryAction(initial!.id, v) : await createInventoryAction(v);
      if (res.ok) { router.push("/inventory"); router.refresh(); return; }
      if (res.fieldErrors) setErrors(res.fieldErrors);
      if (res.error) setFormError(res.error);
    });
  };

  const toggleActive = () => {
    if (!initial) return;
    startTransition(async () => {
      const res = await setInventoryActiveAction(initial.id, !initial.active);
      if (res.ok) { router.push("/inventory"); router.refresh(); return; }
      if (res.error) setFormError(res.error);
    });
  };

  return (
    <div className="mx-auto max-w-[900px] px-5 py-6 md:px-8">
      <PageHeader
        title={isEdit ? "Edycja pozycji" : "Nowa pozycja magazynu"}
        subtitle={isEdit ? initial?.name : "Dodaj sprzęt, meble lub inny zasób do magazynu"}
        back={{ href: "/inventory", label: "Magazyn" }}
      />

      {formError && <div className="mb-4"><Alert tone="bad" title="Nie udało się zapisać">{formError}</Alert></div>}

      <form onSubmit={submit} className="flex flex-col gap-4">
        <SectionCard title="Zdjęcie" className="p-5">
          <div className="flex items-center gap-4 px-5 pb-5">
            {v.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={v.photo_url} alt="Zdjęcie pozycji" className="h-24 w-24 flex-none rounded-[13px] border border-border object-cover" />
            ) : (
              <div className="flex h-24 w-24 flex-none items-center justify-center rounded-[13px] border border-dashed border-border bg-surface-2 text-center text-[11px] text-ink-2">brak zdjęcia</div>
            )}
            <div className="flex flex-wrap gap-2">
              <label className="cursor-pointer rounded-[10px] border border-border bg-surface-2 px-3 py-1.5 text-[12px] font-semibold text-ink-2">
                {v.photo_url ? "Zmień zdjęcie" : "Dodaj zdjęcie"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { pickPhoto(e.target.files?.[0] ?? null); e.target.value = ""; }} />
              </label>
              {v.photo_url && <button type="button" onClick={() => set("photo_url", "")} className="rounded-[10px] border border-border bg-surface-2 px-3 py-1.5 text-[12px] font-semibold text-ink-2">Usuń</button>}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Podstawowe" className="p-5">
          <div className="grid grid-cols-1 gap-4 px-5 pb-5 sm:grid-cols-2">
            <TextField label="Nazwa" placeholder="Krzesła bankietowe" value={v.name} onChange={(e) => set("name", e.target.value)} error={errors.name} />
            <TextField label="Kod (opcjonalnie)" placeholder="auto z nazwy" value={v.code} onChange={(e) => set("code", e.target.value)} hint="Puste = wygeneruje się automatycznie" />
            <SelectField label="Kategoria" value={v.category} onChange={(e) => set("category", e.target.value)}>
              <option value="">— brak —</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </SelectField>
            <SelectField label="Status" value={v.status} onChange={(e) => set("status", e.target.value as EquipmentStatus)}>
              {EQUIPMENT_STATUS_ORDER.map((s) => <option key={s} value={s}>{EQUIPMENT_STATUS_LABELS[s]}</option>)}
            </SelectField>
            <SelectField label="Typ ewidencji" value={v.tracking} onChange={(e) => set("tracking", e.target.value)}>
              <option value="QUANTITY">Ilościowa (krzesła, stoły…)</option>
              <option value="INDIVIDUAL">Konkretny egzemplarz (namiot, laser…)</option>
            </SelectField>
          </div>
        </SectionCard>

        <SectionCard title="Stan i lokalizacja" className="p-5">
          <div className="grid grid-cols-1 gap-4 px-5 pb-5 sm:grid-cols-2">
            <TextField label="Ilość" inputMode="numeric" placeholder="100" value={v.quantity} onChange={(e) => set("quantity", e.target.value)} error={errors.quantity} />
            <TextField label="Jednostka" placeholder="szt. / kpl. / m" value={v.unit} onChange={(e) => set("unit", e.target.value)} />
            <TextField label="Lokalizacja magazynowa" placeholder="Regał A1" value={v.location} onChange={(e) => set("location", e.target.value)} />
            <TextField label="Numer zestawu" placeholder="np. Zestaw niebieski" value={v.set_number} onChange={(e) => set("set_number", e.target.value)} />
          </div>
        </SectionCard>

        <SectionCard title="Zakup i wartość" className="p-5">
          <div className="grid grid-cols-1 gap-4 px-5 pb-5 sm:grid-cols-2">
            <TextField label="Cena zakupu (zł brutto)" inputMode="decimal" placeholder="45" value={v.unit_cost} onChange={(e) => set("unit_cost", e.target.value)} error={errors.unit_cost} />
            <TextField label="Wartość odtworzeniowa (zł)" inputMode="decimal" placeholder="60" value={v.replacement_value} onChange={(e) => set("replacement_value", e.target.value)} error={errors.replacement_value} />
            <TextField label="Data zakupu" type="date" value={v.purchase_date} onChange={(e) => set("purchase_date", e.target.value)} />
            <TextField label="Dostawca" placeholder="np. Hurtownia XYZ" value={v.supplier} onChange={(e) => set("supplier", e.target.value)} />
          </div>
        </SectionCard>

        <SectionCard title="Oferta (dodatki i wynajem)" className="p-5">
          <div className="grid grid-cols-1 gap-4 px-5 pb-3 sm:grid-cols-2">
            <TextField label="Cena wynajmu (zł brutto)" inputMode="decimal" placeholder="5" value={v.rental_price} onChange={(e) => set("rental_price", e.target.value)} error={errors.rental_price} />
          </div>
          <div className="flex flex-col gap-2.5 px-5 pb-5">
            <label className="flex items-center gap-2.5 text-[13px] text-ink">
              <input type="checkbox" checked={v.is_rentable} onChange={(e) => set("is_rentable", e.target.checked)} className="h-4 w-4 accent-accent" />
              Możliwa do wynajęcia
            </label>
            <label className="flex items-center gap-2.5 text-[13px] text-ink">
              <input type="checkbox" checked={v.is_addon} onChange={(e) => set("is_addon", e.target.checked)} className="h-4 w-4 accent-accent" />
              Widoczna jako dodatek w rezerwacji
            </label>
            <label className="flex items-center gap-2.5 text-[13px] text-ink">
              <input type="checkbox" checked={v.internal_only} onChange={(e) => set("internal_only", e.target.checked)} className="h-4 w-4 accent-accent" />
              Tylko do użytku wewnętrznego (nie oferuj klientowi)
            </label>
          </div>
        </SectionCard>

        <SectionCard title="Notatki" className="p-5">
          <div className="px-5 pb-5">
            <textarea aria-label="Notatki" rows={3} value={v.notes} onChange={(e) => set("notes", e.target.value)} className="w-full rounded-field border border-border bg-surface-2 px-3.5 py-3 text-[14px] text-ink outline-none focus:border-accent" placeholder="Stan techniczny, uwagi serwisowe…" />
          </div>
        </SectionCard>

        <div className="flex flex-wrap justify-end gap-2.5">
          {isEdit && (
            <SecondaryButton type="button" onClick={toggleActive} disabled={pending}>
              {initial?.active ? "Wycofaj z magazynu" : "Przywróć do magazynu"}
            </SecondaryButton>
          )}
          <SecondaryButton type="button" onClick={() => router.push("/inventory")}>Anuluj</SecondaryButton>
          <PrimaryButton type="submit" icon="check" disabled={pending}>
            {pending ? "Zapisywanie…" : isEdit ? "Zapisz zmiany" : "Dodaj pozycję"}
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
}
