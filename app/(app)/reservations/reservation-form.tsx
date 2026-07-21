"use client";
// Formularz rezerwacji iClub (dodawanie / edycja). Wybór pakietu, namiotu,
// dodatków; walidacja; komunikaty. Zapis tworzy też zlecenie i etapy.
import { useRouter } from "next/navigation";
import { useState, useTransition, useEffect } from "react";
import { PageHeader } from "@/components/layout";
import { SectionCard, TextField, SelectField, PrimaryButton, SecondaryButton, Alert } from "@/components/ui";
import type { ReservationRecord, TentRecord, PackageRecord, AddonRecord, ReservationStatus, BusinessLine } from "@/lib/data/types";
import { RESERVATION_STATUS_ORDER, RESERVATION_STATUS_LABELS, INQUIRY_SOURCE_LABELS } from "@/lib/data/types";
import { createReservationAction, updateReservationAction, checkTentAvailabilityAction, type ReservationFormValues, type TentConflict } from "./actions";
import { MAIN_TENT_OPTIONS, EXTRA_TENT_OPTIONS, choiceFromTent } from "@/lib/domain/tents";
import { AddressAutocomplete } from "./address-autocomplete";

type CustomerOption = { id: string; name: string };

const fmtPLN = (v: number) =>
  new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(v);

// §8 następny dzień po dacie "YYYY-MM-DD" (bez wpływu strefy czasowej) — dla podpowiedzi demontażu.
const nextDay = (iso: string): string => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().slice(0, 10);
};

export function ReservationForm({
  initial,
  customers,
  tents,
  packages,
  addons,
}: {
  initial?: ReservationRecord;
  customers: CustomerOption[];
  tents: TentRecord[];
  packages: PackageRecord[];
  addons: AddonRecord[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(initial);

  // Typ namiotu dla istniejącej rezerwacji: z nowych pól, a dla starszych z egzemplarza.
  const byId = (id: string | null | undefined) => tents.find((t) => t.id === id);
  const initialMain = initial?.tent_main ?? (initial?.tent_id ? choiceFromTent(byId(initial.tent_id)?.size ?? null, byId(initial.tent_id)?.has_back_door) : "");
  const initialExtra = initial?.tent_extra ?? (initial?.tent_id_2 ? choiceFromTent(byId(initial.tent_id_2)?.size ?? null, byId(initial.tent_id_2)?.has_back_door) : "");

  const [v, setV] = useState<ReservationFormValues>({
    business_line: initial?.business_line ?? "ICLUB",
    customer_id: initial?.customer_id ?? "",
    event_type: initial?.event_type ?? "",
    event_date: initial?.event_date ?? "",
    setup_date: initial?.setup_date ?? "",
    teardown_date: initial?.teardown_date ?? "",
    location: initial?.location ?? "",
    guests: initial?.guests != null ? String(initial.guests) : "",
    tent_main: initialMain,
    tent_extra: initialExtra,
    overbooking_override: initial?.overbooking_override ?? false,
    overbooking_reason: initial?.overbooking_reason ?? "",
    package_id: initial?.package_id ?? "",
    addon_ids: initial?.addon_ids ?? [],
    rental_items: initial?.rental_items ?? "",
    delivery_time: initial?.delivery_time ?? "",
    payment_upfront: initial?.payment_upfront ?? false,
    price: initial?.price != null ? String(initial.price) : "",
    discount: initial?.discount != null ? String(initial.discount) : "",
    deposit: initial?.deposit != null ? String(initial.deposit) : "",
    is_invoice: initial?.is_invoice ?? false,
    source: initial?.source ?? "",
    status: initial?.status ?? "TEMPORARY",
    notes: initial?.notes ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<TentConflict[]>([]);
  const [exceeded, setExceeded] = useState<string[]>([]);

  // §8 Rozwijana sekcja niestandardowych dat. Domyślnie zwinięta; rozwinięta,
  // gdy istniejąca rezerwacja ma daty inne niż domyślne (montaż = impreza, demontaż = +1 dzień).
  const evD = initial?.event_date ?? "";
  const hadCustomDates = Boolean(
    isEdit &&
      ((initial?.setup_date && initial.setup_date !== evD) ||
        (initial?.teardown_date && initial.teardown_date !== nextDay(evD))),
  );
  const [showCustomDates, setShowCustomDates] = useState(hadCustomDates);

  // §10.3 Kontrola pojemności namiotów per typ (overbooking = twardy blok przy zapisie).
  useEffect(() => {
    let active = true;
    const run = async () => {
      const start = v.setup_date || v.event_date;
      if ((!v.tent_main && !v.tent_extra) || !start) return { exceeded: [], conflicts: [] };
      const end = v.teardown_date || v.event_date || start;
      return checkTentAvailabilityAction(v.tent_main, v.tent_extra, start, end, initial?.id);
    };
    run().then((res) => {
      if (active) { setConflicts(res.conflicts); setExceeded(res.exceeded); }
    });
    return () => {
      active = false;
    };
  }, [v.tent_main, v.tent_extra, v.setup_date, v.teardown_date, v.event_date, initial?.id]);

  const set = <K extends keyof ReservationFormValues>(k: K, val: ReservationFormValues[K]) =>
    setV((s) => ({ ...s, [k]: val }));

  const toggleAddon = (id: string) =>
    setV((s) => ({
      ...s,
      addon_ids: s.addon_ids.includes(id) ? s.addon_ids.filter((a) => a !== id) : [...s.addon_ids, id],
    }));

  const addonsTotal = addons
    .filter((a) => v.addon_ids.includes(a.id))
    .reduce((sum, a) => sum + Number(a.price || 0), 0);

  // Podpowiedź ceny z cennika: pakiet + wybrane dodatki (§51).
  const packagePrice = Number(packages.find((p) => p.id === v.package_id)?.base_price ?? 0);
  const suggestedPrice = packagePrice + addonsTotal;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    // §8: przy zwiniętej sekcji dat wyślij puste montaż/demontaż — serwer nada domyślne.
    const payload: ReservationFormValues = showCustomDates ? v : { ...v, setup_date: "", teardown_date: "" };
    startTransition(async () => {
      const res = isEdit
        ? await updateReservationAction(initial!.id, payload)
        : await createReservationAction(payload);
      if (res.ok) {
        router.push("/reservations");
        router.refresh();
        return;
      }
      if (res.fieldErrors) setErrors(res.fieldErrors);
      if (res.error) setFormError(res.error);
    });
  };

  return (
    <div className="mx-auto max-w-[900px] px-5 py-6 md:px-8">
      <PageHeader
        title={isEdit ? "Edycja rezerwacji" : "Nowa rezerwacja"}
        subtitle={isEdit ? "Zaktualizuj dane rezerwacji" : "Zapisanie utworzy też zlecenie i etapy realizacji"}
        back={{ href: "/reservations", label: "Rezerwacje" }}
      />

      {formError && (
        <div className="mb-4"><Alert tone="bad" title="Nie udało się zapisać">{formError}</Alert></div>
      )}

      <form onSubmit={submit} className="flex flex-col gap-4">
        <SectionCard title="Klient i lokalizacja" className="p-5">
          <div className="grid grid-cols-1 gap-4 px-5 pb-4 sm:grid-cols-2">
            <SelectField label="Linia biznesowa" value={v.business_line} onChange={(e) => set("business_line", e.target.value as BusinessLine)}>
              <option value="ICLUB">iClub</option>
              <option value="EQUIPMENT_RENTAL">Wypożyczalnia sprzętu</option>
            </SelectField>
            <SelectField label="Klient" value={v.customer_id} onChange={(e) => set("customer_id", e.target.value)}>
              <option value="">— bez klienta —</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </SelectField>
            {isEdit && (
              <SelectField label="Status" value={v.status} onChange={(e) => set("status", e.target.value as ReservationStatus)}>
                {RESERVATION_STATUS_ORDER.map((s) => <option key={s} value={s}>{RESERVATION_STATUS_LABELS[s]}</option>)}
              </SelectField>
            )}
            <TextField label="Data imprezy" type="date" value={v.event_date} onChange={(e) => set("event_date", e.target.value)} />
            <AddressAutocomplete label="Lokalizacja" placeholder="Tarnowo Podgórne, ul. …" value={v.location} onChange={(val) => set("location", val)} />
            <TextField label="Godzina dostawy (opcjonalnie)" type="time" value={v.delivery_time} onChange={(e) => set("delivery_time", e.target.value)} hint="Puste = wydarzenie całodniowe" />
          </div>
          {/* §8 Daty montażu/demontażu domyślnie ukryte; rozwijane w razie nietypowego terminu. */}
          <div className="px-5 pb-5">
            <label className="flex cursor-pointer items-center gap-2 text-[12.5px] font-semibold text-ink">
              <input type="checkbox" checked={showCustomDates} onChange={(e) => setShowCustomDates(e.target.checked)} className="h-4 w-4 accent-accent" />
              Montaż lub demontaż w innym terminie
            </label>
            {!showCustomDates && (
              <p className="mt-1.5 text-[11.5px] text-ink-2">
                {v.event_date
                  ? `Domyślnie: montaż ${v.event_date}, demontaż ${nextDay(v.event_date)}.`
                  : "Domyślnie montaż w dniu imprezy, demontaż następnego dnia."}
              </p>
            )}
            {showCustomDates && (
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField label="Data montażu" type="date" value={v.setup_date} onChange={(e) => set("setup_date", e.target.value)} hint={v.event_date ? `puste = ${v.event_date}` : "puste = dzień imprezy"} />
                <TextField label="Data demontażu" type="date" value={v.teardown_date} onChange={(e) => set("teardown_date", e.target.value)} hint={v.event_date ? `puste = ${nextDay(v.event_date)}` : "puste = następny dzień"} />
              </div>
            )}
          </div>
        </SectionCard>

        {v.business_line === "ICLUB" ? (
          <SectionCard title="Namiot i pakiet" className="p-5">
            <div className="grid grid-cols-1 gap-4 px-5 pb-5 sm:grid-cols-2">
              <SelectField label="Namiot główny" value={v.tent_main} onChange={(e) => set("tent_main", e.target.value)}>
                <option value="">— wybierz —</option>
                {MAIN_TENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </SelectField>
              <SelectField label="Dodatkowy namiot" value={v.tent_extra} onChange={(e) => set("tent_extra", e.target.value)}>
                {EXTRA_TENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </SelectField>
              <SelectField label="Pakiet" value={v.package_id} onChange={(e) => set("package_id", e.target.value)}>
                <option value="">— wybierz pakiet —</option>
                {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </SelectField>
            </div>
            {exceeded.length > 0 && (
              <div className="px-5 pb-4">
                <Alert tone="bad" title="Overbooking — brak wolnych zasobów">
                  Na ten termin brakuje: <b>{exceeded.join(", ")}</b>.
                  {conflicts.length > 0 && (
                    <ul className="mt-1.5 list-disc pl-4">
                      {conflicts.map((c) => <li key={c.id}>{c.label}</li>)}
                    </ul>
                  )}
                  <label className="mt-2 flex items-center gap-2 text-[12.5px] font-semibold text-ink">
                    <input type="checkbox" checked={v.overbooking_override} onChange={(e) => set("overbooking_override", e.target.checked)} className="h-4 w-4 accent-accent" />
                    Wyjątek szefa — zapisz mimo overbookingu
                  </label>
                  {v.overbooking_override && (
                    <div className="mt-2"><TextField label="Powód wyjątku" value={v.overbooking_reason} onChange={(e) => set("overbooking_reason", e.target.value)} placeholder="np. drugi komplet od podwykonawcy" /></div>
                  )}
                </Alert>
              </div>
            )}
            <div className="px-5 pb-5">
              <div className="mb-2 text-[12.5px] font-semibold text-ink-2">Dodatki {addonsTotal > 0 && <span className="text-ink">· {fmtPLN(addonsTotal)}</span>}</div>
              <div className="flex flex-wrap gap-2">
                {addons.map((a) => {
                  const on = v.addon_ids.includes(a.id);
                  return (
                    <button
                      type="button"
                      key={a.id}
                      onClick={() => toggleAddon(a.id)}
                      className={`rounded-[10px] border px-3 py-2 text-[12.5px] font-semibold transition ${on ? "border-[#3a2a55] bg-[#271b3f] text-[#e0c8ff]" : "border-border bg-surface text-ink-2"}`}
                    >
                      {a.name}{a.price > 0 ? ` · ${fmtPLN(a.price)}` : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          </SectionCard>
        ) : (
          <SectionCard title="Sprzęt do wynajęcia" className="p-5">
            <div className="grid grid-cols-1 gap-4 px-5 pb-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <TextField
                  label="Sprzęt (pozycje)"
                  placeholder="Krzesła   —   albo:   Stoły, krzesła, parasole"
                  value={v.rental_items}
                  onChange={(e) => set("rental_items", e.target.value)}
                  hint="Jedna pozycja → trafia w tytuł; kilka po przecinku → tytuł „Wynajem sprzętu”, szczegóły w opisie"
                />
              </div>
              <SelectField label="Płatność" value={v.payment_upfront ? "UP" : "PICKUP"} onChange={(e) => set("payment_upfront", e.target.value === "UP")}>
                <option value="PICKUP">Przy odbiorze</option>
                <option value="UP">Opłacone z góry</option>
              </SelectField>
            </div>
          </SectionCard>
        )}

        <SectionCard title="Informacje dodatkowe" className="p-5">
          <div className="grid grid-cols-1 gap-4 px-5 pb-5 sm:grid-cols-2">
            <TextField label="Rodzaj imprezy" placeholder="Osiemnastka" value={v.event_type} onChange={(e) => set("event_type", e.target.value)} />
            <TextField label="Liczba osób (opcjonalnie)" inputMode="numeric" placeholder="45" value={v.guests} onChange={(e) => set("guests", e.target.value)} error={errors.guests} hint="Nie blokuje zapisu rezerwacji" />
          </div>
        </SectionCard>

        <SectionCard title="Rozliczenie" className="p-5">
          <div className="grid grid-cols-1 gap-4 px-5 pb-5 sm:grid-cols-3">
            <div>
              <TextField label="Wartość (zł)" inputMode="numeric" placeholder="6800" value={v.price} onChange={(e) => set("price", e.target.value)} error={errors.price} />
              {suggestedPrice > 0 && (
                <button type="button" onClick={() => set("price", String(suggestedPrice))} className="mt-1.5 text-[12px] font-semibold text-accent-soft">
                  Z cennika: {fmtPLN(suggestedPrice)} →
                </button>
              )}
            </div>
            <TextField label="Rabat (zł)" inputMode="numeric" placeholder="0" value={v.discount} onChange={(e) => set("discount", e.target.value)} error={errors.discount} />
            <TextField label="Zadatek (zł)" inputMode="numeric" placeholder="2000" value={v.deposit} onChange={(e) => set("deposit", e.target.value)} error={errors.deposit} />
            <SelectField label="Źródło" value={v.source} onChange={(e) => set("source", e.target.value)}>
              <option value="">— nie podano —</option>
              {(Object.keys(INQUIRY_SOURCE_LABELS) as (keyof typeof INQUIRY_SOURCE_LABELS)[]).map((s) => (
                <option key={s} value={s}>{INQUIRY_SOURCE_LABELS[s]}</option>
              ))}
            </SelectField>
            <SelectField label="Rozliczenie" value={v.is_invoice ? "FV" : "PRIV"} onChange={(e) => set("is_invoice", e.target.value === "FV")}>
              <option value="PRIV">Prywatnie</option>
              <option value="FV">Faktura VAT</option>
            </SelectField>
          </div>
          <div className="px-5 pb-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="notes" className="text-[12.5px] font-semibold text-ink-2">Ustalenia / notatki</label>
              <textarea id="notes" rows={3} value={v.notes} onChange={(e) => set("notes", e.target.value)} className="rounded-field border border-border bg-surface-2 px-3.5 py-3 text-[14px] text-ink outline-none focus:border-accent" placeholder="Np. wjazd od podwórza, prąd z garażu, brak zadatku…" />
            </div>
          </div>
        </SectionCard>

        <div className="flex justify-end gap-2.5">
          <SecondaryButton type="button" onClick={() => router.push("/reservations")}>Anuluj</SecondaryButton>
          <PrimaryButton type="submit" icon="check" disabled={pending}>
            {pending ? "Zapisywanie…" : isEdit ? "Zapisz zmiany" : "Utwórz rezerwację"}
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
}
