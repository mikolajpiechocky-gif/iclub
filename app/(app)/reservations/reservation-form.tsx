"use client";
// Formularz rezerwacji iClub (dodawanie / edycja). Wybór pakietu, namiotu,
// dodatków; walidacja; komunikaty. Zapis tworzy też zlecenie i etapy.
import { useRouter } from "next/navigation";
import { useState, useTransition, useEffect } from "react";
import { PageHeader } from "@/components/layout";
import { SectionCard, TextField, SelectField, PrimaryButton, SecondaryButton, Alert } from "@/components/ui";
import type { ReservationRecord, TentRecord, PackageRecord, ReservationAddon, ReservationStatus, BusinessLine, PricingSnapshot } from "@/lib/data/types";
import { RESERVATION_STATUS_ORDER, RESERVATION_STATUS_LABELS, INQUIRY_SOURCE_LABELS } from "@/lib/data/types";
import { createReservationAction, updateReservationAction, checkTentAvailabilityAction, checkAddonAvailabilityAction, computeReservationTransportAction, type ReservationFormValues, type TentConflict } from "./actions";
import type { AddonShortage } from "@/lib/data/reservations";
import { MAIN_TENT_OPTIONS, EXTRA_TENT_OPTIONS, choiceFromTent } from "@/lib/domain/tents";
import { computeOrderPrice, suggestedDeposit } from "@/lib/domain/order-pricing";
import { computeSetupTimes, fmtDuration, type AssemblyConfig } from "@/lib/domain/assembly";
import type { PackageComposition } from "@/lib/domain/package-composition";
import { AddressAutocomplete } from "./address-autocomplete";

const DEFAULT_ASSEMBLY_CONFIG: AssemblyConfig = { bufferMinutes: 30, addonMinutes: 10, gastroMinutes: 60 };

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
  assemblyConfig = DEFAULT_ASSEMBLY_CONFIG,
  packageComposition = {},
}: {
  initial?: ReservationRecord;
  customers: CustomerOption[];
  tents: TentRecord[];
  packages: PackageRecord[];
  addons: ReservationAddon[];
  assemblyConfig?: AssemblyConfig;
  packageComposition?: PackageComposition;
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
    addon_qty: initial?.addon_qty ?? {},
    rental_items: initial?.rental_items ?? "",
    delivery_time: initial?.delivery_time ?? "",
    payment_upfront: initial?.payment_upfront ?? false,
    price: initial?.price != null ? String(initial.price) : "",
    discount_type: initial?.discount_type === "PERCENT" ? "PERCENT" : "AMOUNT",
    // Legacy (sprzed kolumny discount_value): pokaż zapisaną kwotę rabatu, by nie wyzerować jej przy edycji.
    discount_value: initial?.discount_value != null ? String(initial.discount_value) : (initial?.discount ? String(initial.discount) : ""),
    discount_amount: initial?.discount != null ? String(initial.discount) : "",
    transport_price: initial?.transport_price != null ? String(initial.transport_price) : "",
    deposit: initial?.deposit != null ? String(initial.deposit) : "",
    event_start_time: initial?.event_start_time ?? "",
    assembly_time: initial?.assembly_time ?? "",
    pricing_snapshot: initial?.pricing_snapshot ? JSON.stringify(initial.pricing_snapshot) : "",
    is_invoice: initial?.is_invoice ?? false,
    source: initial?.source ?? "",
    status: initial?.status ?? "TEMPORARY",
    notes: initial?.notes ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<TentConflict[]>([]);
  const [exceeded, setExceeded] = useState<string[]>([]);
  const [addonShortages, setAddonShortages] = useState<AddonShortage[]>([]);
  // §13.6 Zadatek: śledzimy, czy Szef zmienił go ręcznie (wtedy nie nadpisujemy sugestią).
  const [depositTouched, setDepositTouched] = useState(isEdit);
  const [transportMsg, setTransportMsg] = useState<string | null>(null);

  // §8 Rozwijana sekcja niestandardowych dat. Domyślnie zwinięta; rozwinięta,
  // gdy istniejąca rezerwacja ma daty inne niż domyślne (montaż = impreza, demontaż = +1 dzień).
  const evD = initial?.event_date ?? "";
  const hadCustomDates = Boolean(
    isEdit &&
      ((initial?.setup_date && initial.setup_date !== evD) ||
        (initial?.teardown_date && initial.teardown_date !== nextDay(evD))),
  );
  const [showCustomDates, setShowCustomDates] = useState(hadCustomDates);

  // Okno zajętości DOKŁADNIE takie jak zapis/blok serwerowy (§8): przy zwiniętej sekcji
  // dat montaż/demontaż są zerowane, a domyślny demontaż to dzień po imprezie. Dzięki temu
  // live-check pokazuje ten sam konflikt, który zablokuje serwer (bez „ślepego zaułka").
  const effSetup = showCustomDates ? v.setup_date : "";
  const effTeardown = showCustomDates ? v.teardown_date : "";
  const occStart = effSetup || v.event_date || "";
  const occEnd = effTeardown || (v.event_date ? nextDay(v.event_date) : occStart);

  // §10.3 Kontrola pojemności namiotów per typ (overbooking = twardy blok przy zapisie).
  useEffect(() => {
    let active = true;
    const run = async () => {
      if ((!v.tent_main && !v.tent_extra) || !occStart) return { exceeded: [], conflicts: [] };
      return checkTentAvailabilityAction(v.tent_main, v.tent_extra, occStart, occEnd, initial?.id);
    };
    run().then((res) => {
      if (active) { setConflicts(res.conflicts); setExceeded(res.exceeded); }
    });
    return () => {
      active = false;
    };
  }, [v.tent_main, v.tent_extra, occStart, occEnd, initial?.id]);

  // §12.3 Live-kontrola dostępności dodatków magazynowych w tym terminie.
  useEffect(() => {
    let active = true;
    checkAddonAvailabilityAction(v.addon_ids, v.addon_qty, occStart, occEnd, initial?.id).then((s) => {
      if (active) setAddonShortages(s);
    });
    return () => {
      active = false;
    };
  }, [v.addon_ids, v.addon_qty, occStart, occEnd, initial?.id]);

  const set = <K extends keyof ReservationFormValues>(k: K, val: ReservationFormValues[K]) =>
    setV((s) => ({ ...s, [k]: val }));

  const toggleAddon = (id: string) =>
    setV((s) => {
      if (s.addon_ids.includes(id)) {
        const nextQty = { ...s.addon_qty };
        delete nextQty[id];
        return { ...s, addon_ids: s.addon_ids.filter((a) => a !== id), addon_qty: nextQty };
      }
      return { ...s, addon_ids: [...s.addon_ids, id], addon_qty: { ...s.addon_qty, [id]: s.addon_qty[id] ?? 1 } };
    });

  // §12.2 Ilość dodatku (min 1). Zmiana natychmiast przelicza cenę i podsumowanie.
  const setAddonQty = (id: string, qty: number) =>
    setV((s) => ({ ...s, addon_qty: { ...s.addon_qty, [id]: Math.max(1, Math.round(qty) || 1) } }));

  const qtyOf = (id: string) => Math.max(1, Math.round(v.addon_qty[id] ?? 1));
  // §11.1 Ilość dodatku zawarta w wybranym pakiecie (płatna jest tylko nadwyżka).
  const includedOf = (id: string) => packageComposition[v.package_id]?.[id] ?? 0;
  const billableOf = (id: string) => Math.max(0, qtyOf(id) - includedOf(id));
  const addonsTotal = addons
    .filter((a) => v.addon_ids.includes(a.id))
    .reduce((sum, a) => sum + Number(a.price || 0) * billableOf(a.id), 0);

  // §13 Kalkulacja na żywo: pakiet + dodatki + transport − rabat = razem; zadatek; pozostało.
  const selectedPackage = packages.find((p) => p.id === v.package_id);
  const packagePrice = Number(selectedPackage?.base_price ?? 0);
  // §9 Sugerowane godziny montażu (start imprezy − pakiet − dodatki − gastro − bufor).
  const setupTimes = computeSetupTimes(v.event_start_time, selectedPackage?.assembly_minutes ?? 0, v.addon_ids.length, v.tent_extra === "GASTRO", assemblyConfig);
  const transportPrice = Number(v.transport_price.replace(",", ".")) || 0;
  const discountValueNum = Number(v.discount_value.replace(",", ".")) || 0;
  const order = computeOrderPrice({ packagePrice, addonsTotal, transportPrice, discountType: v.discount_type, discountValue: discountValueNum });
  // §21: ręcznie ustawiona wartość końcowa ma priorytet; inaczej używamy wyliczonej.
  const finalPrice = Number(v.price.replace(",", ".")) || order.total;
  const rawSuggestedDep = suggestedDeposit(transportPrice); // §13.6 300 zł + transport
  const suggestedDep = finalPrice > 0 ? Math.min(rawSuggestedDep, finalPrice) : rawSuggestedDep; // nie ponad wartość
  const depositValue = depositTouched ? v.deposit : String(suggestedDep);
  const depositNum = Number(depositValue.replace(",", ".")) || 0;
  const remaining = Math.max(0, Math.round((finalPrice - depositNum) * 100) / 100);
  const depositOverValue = finalPrice > 0 && depositNum > finalPrice; // §13.6 ostrzeżenie

  // §14.3 Transport rezerwacji z adresu (odległość w jedną stronę → widełki).
  const computeTransport = () => {
    setTransportMsg(null);
    startTransition(async () => {
      const res = await computeReservationTransportAction(v.location);
      if (res.ok && res.km != null) {
        if (res.price != null) set("transport_price", String(res.price));
        setTransportMsg(`W jedną stronę ≈ ${res.km} km · ${res.farTrip ? "daleki" : "bliski"}${res.price != null ? ` · widełki ${res.price} zł` : " · > 400 km, wycena indywidualna"}`);
      } else {
        setTransportMsg(res.error ?? "Błąd");
      }
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    // §8: przy zwiniętej sekcji dat wyślij puste montaż/demontaż — serwer nada domyślne.
    // §11.2 Snapshot wyceny z chwili zapisu (odporny na późniejsze zmiany cennika).
    const snapshot: PricingSnapshot = {
      package: selectedPackage ? { name: selectedPackage.name, price: packagePrice } : null,
      addons: addons.filter((a) => v.addon_ids.includes(a.id)).map((a) => ({ name: qtyOf(a.id) > 1 ? `${a.name} ×${qtyOf(a.id)}${includedOf(a.id) ? ` (w pakiecie ${includedOf(a.id)})` : ""}` : a.name, price: Number(a.price || 0) * billableOf(a.id) })),
      transport_price: transportPrice,
      discount_type: v.discount_type,
      discount_value: discountValueNum,
      discount_amount: order.discountAmount,
      deposit: depositNum,
      total: order.total,
      saved_at: new Date().toISOString(),
    };
    // §13: dołącz wyliczoną kwotę rabatu i ustalony zadatek (sugestia, jeśli nietknięty).
    const payload: ReservationFormValues = {
      ...v,
      setup_date: showCustomDates ? v.setup_date : "",
      teardown_date: showCustomDates ? v.teardown_date : "",
      discount_amount: String(order.discountAmount),
      deposit: depositValue,
      pricing_snapshot: JSON.stringify(snapshot),
    };
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
    <div className="mx-auto max-w-[1200px] px-5 py-6 md:px-8">
      <PageHeader
        title={isEdit ? "Edycja rezerwacji" : "Nowa rezerwacja"}
        subtitle={isEdit ? "Zaktualizuj dane rezerwacji" : "Zapisanie utworzy też zlecenie i etapy realizacji"}
        back={{ href: "/reservations", label: "Rezerwacje" }}
      />

      {formError && (
        <div className="mb-4"><Alert tone="bad" title="Nie udało się zapisać">{formError}</Alert></div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <form onSubmit={submit} className="flex flex-col gap-4 lg:col-start-1 lg:row-start-1">
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
            {(exceeded.length > 0 || addonShortages.length > 0) && (
              <div className="px-5 pb-4">
                <Alert tone="bad" title="Brak dostępności na ten termin">
                  {exceeded.length > 0 && <div>Namioty: <b>{exceeded.join(", ")}</b>.</div>}
                  {addonShortages.length > 0 && (
                    <div className="mt-1">Dodatki ze stanu magazynu:
                      <ul className="mt-1 list-disc pl-4">
                        {addonShortages.map((s) => <li key={s.id}>{s.name}: potrzeba {s.requested}, wolne {Math.max(0, s.stock - s.used)} z {s.stock}</li>)}
                      </ul>
                    </div>
                  )}
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
              <div className="flex flex-col gap-2">
                {addons.map((a) => {
                  const on = v.addon_ids.includes(a.id);
                  const qty = qtyOf(a.id);
                  const over = on && a.available != null && qty > a.available;
                  return (
                    <div key={a.id} className={`flex items-center gap-3 rounded-[11px] border px-3 py-2 ${on ? "border-[#3a2a55] bg-[#1c1530]" : "border-border bg-surface"}`}>
                      {a.photo_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.photo_url} alt="" className="h-9 w-9 flex-none rounded-[8px] object-cover" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-semibold text-ink">{a.name}</div>
                        <div className="text-[11px] text-ink-2">
                          {a.price > 0 ? fmtPLN(a.price) : "gratis"}{a.available != null ? ` · dostępne: ${a.available}` : ""}
                          {on && includedOf(a.id) > 0 && <span className="text-ok"> · w pakiecie: {includedOf(a.id)}</span>}
                          {over && <span className="font-bold text-warn"> · przekracza stan</span>}
                        </div>
                      </div>
                      {on ? (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center rounded-[9px] border border-border">
                            <button type="button" onClick={() => setAddonQty(a.id, qty - 1)} className="px-2.5 py-1 text-[15px] font-bold text-ink-2">−</button>
                            <input inputMode="numeric" value={String(qty)} onChange={(e) => setAddonQty(a.id, Number(e.target.value.replace(/[^0-9]/g, "")) || 1)} className="w-9 bg-transparent text-center text-[13px] font-bold text-ink outline-none" aria-label={`Ilość: ${a.name}`} />
                            <button type="button" onClick={() => setAddonQty(a.id, qty + 1)} className="px-2.5 py-1 text-[15px] font-bold text-ink-2">+</button>
                          </div>
                          <span className="w-14 text-right text-[12.5px] font-bold text-ink">{billableOf(a.id) > 0 ? fmtPLN(a.price * billableOf(a.id)) : "gratis"}</span>
                          <button type="button" onClick={() => toggleAddon(a.id)} className="text-[11px] font-semibold text-bad">Usuń</button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => toggleAddon(a.id)} className="rounded-[9px] border border-border bg-surface-2 px-3 py-1.5 text-[12px] font-semibold text-accent-soft">Dodaj</button>
                      )}
                    </div>
                  );
                })}
                {addons.length === 0 && <p className="text-[12px] text-ink-2">Brak dodatków. Oznacz pozycje magazynowe jako „widoczne jako dodatek”.</p>}
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

        {v.business_line === "ICLUB" && (
          <SectionCard title="Ustalenia czasowe" className="p-5">
            <div className="grid grid-cols-1 gap-4 px-5 pb-3 sm:grid-cols-2">
              <TextField label="Godzina rozpoczęcia imprezy" type="time" value={v.event_start_time} onChange={(e) => set("event_start_time", e.target.value)} hint="Od niej liczymy sugerowany montaż" />
              <div>
                <TextField label="Ustalona godzina montażu (opcjonalnie)" type="time" value={v.assembly_time} onChange={(e) => set("assembly_time", e.target.value)} />
                {setupTimes.suggested && (
                  <button type="button" onClick={() => set("assembly_time", setupTimes.suggested!)} className="mt-1.5 text-[12px] font-semibold text-accent-soft">Użyj sugerowanej {setupTimes.suggested} →</button>
                )}
              </div>
            </div>
            {v.event_start_time && setupTimes.suggested ? (
              <div className="flex flex-col gap-1 px-5 pb-5 text-[12.5px] text-ink-2">
                <div>Montaż wg pakietu: <span className="font-bold text-ink">{setupTimes.byPackage}</span></div>
                <div>Sugerowany montaż (po dodatkach): <span className="font-bold text-ink">{setupTimes.suggested}</span>{setupTimes.prevDay ? " (dzień wcześniej)" : ""} · przygotowanie {fmtDuration(setupTimes.totalMinutes)}</div>
                {v.assembly_time && v.assembly_time !== setupTimes.suggested && <div>Ustalono ręcznie: <span className="font-bold text-warn">{v.assembly_time}</span></div>}
              </div>
            ) : (
              <p className="px-5 pb-5 text-[12px] text-ink-2">Podaj godzinę rozpoczęcia imprezy{!selectedPackage ? " i wybierz pakiet" : ""}, aby zobaczyć sugerowaną godzinę montażu.</p>
            )}
          </SectionCard>
        )}

        <SectionCard title="Informacje dodatkowe" className="p-5">
          <div className="grid grid-cols-1 gap-4 px-5 pb-5 sm:grid-cols-2">
            <TextField label="Rodzaj imprezy" placeholder="Osiemnastka" value={v.event_type} onChange={(e) => set("event_type", e.target.value)} />
            <TextField label="Liczba osób (opcjonalnie)" inputMode="numeric" placeholder="45" value={v.guests} onChange={(e) => set("guests", e.target.value)} error={errors.guests} hint="Nie blokuje zapisu rezerwacji" />
          </div>
        </SectionCard>

        <SectionCard title="Rozliczenie" className="p-5">
          <div className="grid grid-cols-1 gap-4 px-5 pb-2 sm:grid-cols-3">
            <div>
              <TextField label="Wartość końcowa (zł)" inputMode="numeric" placeholder="6800" value={v.price} onChange={(e) => set("price", e.target.value)} error={errors.price} />
              {order.total > 0 && (
                <button type="button" onClick={() => set("price", String(order.total))} className="mt-1.5 text-[12px] font-semibold text-accent-soft">
                  Z kalkulatora: {fmtPLN(order.total)} →
                </button>
              )}
            </div>
            <div>
              <TextField label="Transport dla klienta (zł)" inputMode="decimal" placeholder="0" value={v.transport_price} onChange={(e) => set("transport_price", e.target.value)} error={errors.transport_price} />
              <button type="button" onClick={computeTransport} disabled={pending} className="mt-1.5 text-[12px] font-semibold text-accent-soft">Oblicz z adresu →</button>
              {transportMsg && <div className="mt-1 text-[11px] text-ink-2">{transportMsg}</div>}
            </div>
            <div>
              <TextField label="Zadatek (zł)" inputMode="numeric" placeholder="300" value={depositValue} onChange={(e) => { setDepositTouched(true); set("deposit", e.target.value); }} error={errors.deposit} />
              {!depositTouched && <div className="mt-1 text-[11px] text-ink-2">Sugestia: 300 zł + transport = {fmtPLN(suggestedDep)}</div>}
            </div>
            <SelectField label="Rabat" value={v.discount_type} onChange={(e) => set("discount_type", e.target.value === "PERCENT" ? "PERCENT" : "AMOUNT")}>
              <option value="AMOUNT">Kwotowy (zł)</option>
              <option value="PERCENT">Procentowy (%)</option>
            </SelectField>
            <TextField label={v.discount_type === "PERCENT" ? "Rabat (%)" : "Rabat (zł)"} inputMode="decimal" placeholder="0" value={v.discount_value} onChange={(e) => set("discount_value", e.target.value)} error={errors.discount_value} hint={v.discount_type === "PERCENT" && order.discountAmount > 0 ? `= ${fmtPLN(order.discountAmount)}` : undefined} />
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

      {/* §13 Boczne podsumowanie — na żywo. Sticky na desktopie, rozwijane na mobile. */}
      <aside className="lg:col-start-2 lg:row-start-1 lg:sticky lg:top-4 lg:self-start">
        <details open className="overflow-hidden rounded-card-lg border border-border bg-surface">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3">
            <span className="font-display text-[15px] font-bold text-white">Podsumowanie</span>
            <span className="font-display text-[16px] font-bold text-accent-soft">{fmtPLN(finalPrice)}</span>
          </summary>
          <div className="flex flex-col gap-2 border-t border-border px-4 py-3.5 text-[13px]">
            <div className="flex justify-between"><span className="text-ink-2">Pakiet</span><span className="font-semibold text-ink">{fmtPLN(packagePrice)}</span></div>
            <div className="flex justify-between"><span className="text-ink-2">Dodatki</span><span className="font-semibold text-ink">{fmtPLN(addonsTotal)}</span></div>
            <div className="flex justify-between"><span className="text-ink-2">Transport</span><span className="font-semibold text-ink">{fmtPLN(transportPrice)}</span></div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between"><span className="text-ink-2">Rabat{v.discount_type === "PERCENT" ? ` (${discountValueNum}%)` : ""}</span><span className="font-semibold text-ok">− {fmtPLN(order.discountAmount)}</span></div>
            )}
            <div className="mt-1 flex justify-between border-t border-border-soft pt-2 text-[14px] font-bold text-white"><span>Wartość końcowa</span><span>{fmtPLN(finalPrice)}</span></div>
            {Math.round(finalPrice) !== Math.round(order.total) && (
              <div className="flex justify-between text-[11px] text-ink-2"><span>Wyliczona (pakiet+dodatki+transport−rabat)</span><span>{fmtPLN(order.total)}</span></div>
            )}
            <div className="flex justify-between"><span className="text-ink-2">Zadatek</span><span className="font-semibold text-ink">{fmtPLN(depositNum)}</span></div>
            <div className="flex justify-between"><span className="text-ink-2">Pozostało</span><span className="font-bold text-warn">{fmtPLN(remaining)}</span></div>
            {depositOverValue && (
              <div className="rounded-[9px] border border-[#3a1c1f] bg-[#251215] px-2.5 py-1.5 text-[11.5px] font-semibold text-bad">Zadatek przekracza wartość rezerwacji — zmniejsz go, aby zapisać.</div>
            )}
            {order.total > 0 && Number(v.price.replace(",", ".")) !== order.total && (
              <button type="button" onClick={() => set("price", String(order.total))} className="mt-1.5 rounded-[10px] border border-border bg-surface-2 px-3 py-2 text-[12.5px] font-semibold text-accent-soft">
                Zastosuj wyliczoną cenę {fmtPLN(order.total)}
              </button>
            )}
          </div>
        </details>
      </aside>
      </div>
    </div>
  );
}
