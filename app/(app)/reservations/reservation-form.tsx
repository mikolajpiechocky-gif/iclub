"use client";
// Formularz rezerwacji iClub (dodawanie / edycja). Wybór pakietu, namiotu,
// dodatków; walidacja; komunikaty. Zapis tworzy też zlecenie i etapy.
import { useRouter } from "next/navigation";
import { useState, useTransition, useEffect } from "react";
import { PageHeader } from "@/components/layout";
import { SectionCard, TextField, SelectField, PrimaryButton, SecondaryButton, Alert } from "@/components/ui";
import type { ReservationRecord, TentRecord, PackageRecord, ReservationAddon, ReservationStatus, BusinessLine, PricingSnapshot } from "@/lib/data/types";
import { RESERVATION_STATUS_ORDER, RESERVATION_STATUS_LABELS, INQUIRY_SOURCE_LABELS } from "@/lib/data/types";
import { createReservationAction, updateReservationAction, checkTentAvailabilityAction, checkAddonAvailabilityAction, checkHeatingAvailabilityAction, computeReservationTransportAction, type ReservationFormValues, type TentConflict } from "./actions";
import type { AddonShortage, HeatingAvailability } from "@/lib/data/reservations";
import { MAIN_TENT_OPTIONS, EXTRA_TENT_OPTIONS, choiceFromTent } from "@/lib/domain/tents";
import { computeOrderPrice, ADDON_DEPOSIT_PCT } from "@/lib/domain/order-pricing";
import { computeSetupTimes, fmtDuration, type AssemblyConfig } from "@/lib/domain/assembly";
import type { PackageComposition } from "@/lib/domain/package-composition";
import { AddressAutocomplete } from "./address-autocomplete";

const DEFAULT_ASSEMBLY_CONFIG: AssemblyConfig = { bufferMinutes: 30, addonMinutes: 10, gastroMinutes: 60 };

type CustomerOption = { id: string; name: string; phone?: string | null };

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

// Klient jako pole tekstowe z klikalnymi podpowiedziami. Dokładne dopasowanie → istniejący
// klient; inaczej nowy (utworzony przy zapisie). Zastępuje sztywną listę.
function CustomerPicker({ customers, customerId, newName, newPhone, set }: {
  customers: CustomerOption[]; customerId: string; newName: string; newPhone: string;
  set: (k: "customer_id" | "new_customer_name" | "new_customer_phone", v: string) => void;
}) {
  const initName = customerId && customerId !== "__new__" ? (customers.find((c) => c.id === customerId)?.name ?? "") : newName;
  const [query, setQuery] = useState(initName);
  const [open, setOpen] = useState(false);
  const ql = query.trim().toLowerCase();
  const matches = ql.length >= 2 ? customers.filter((c) => c.name.toLowerCase().includes(ql)).slice(0, 6) : [];
  const exact = customers.find((c) => c.name.trim().toLowerCase() === ql);

  const onType = (val: string) => {
    setQuery(val); setOpen(true);
    const ex = customers.find((c) => c.name.trim().toLowerCase() === val.trim().toLowerCase());
    if (ex) { set("customer_id", ex.id); set("new_customer_name", ""); set("new_customer_phone", ex.phone ?? ""); }
    else { set("customer_id", val.trim() ? "__new__" : ""); set("new_customer_name", val); }
  };
  const pick = (c: CustomerOption) => { setQuery(c.name); set("customer_id", c.id); set("new_customer_name", ""); set("new_customer_phone", c.phone ?? ""); setOpen(false); };
  const existingSelected = Boolean(customerId) && customerId !== "__new__";

  return (
    <div className="relative">
      <label className="mb-1.5 block text-[12.5px] font-semibold text-ink-2">Klient</label>
      <input value={query} onChange={(e) => onType(e.target.value)} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} placeholder="Wpisz imię i nazwisko…" className="w-full rounded-field border border-border bg-surface-2 px-3.5 py-3 text-[14px] text-ink outline-none focus:border-accent" />
      {open && matches.length > 0 && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-field border border-border bg-surface shadow-lg">
          {matches.map((c) => (
            <button key={c.id} type="button" onMouseDown={() => pick(c)} className="block w-full px-3.5 py-2 text-left text-[13px] text-ink hover:bg-surface-2">{c.name}{customerId === c.id ? " ✓" : ""}</button>
          ))}
        </div>
      )}
      {customerId === "__new__" && query.trim() && !exact && (
        <div className="mt-2">
          <div className="mb-1 text-[11.5px] text-ok">✚ Nowy klient „{query.trim()}” — dodamy przy zapisie.</div>
          <input value={newPhone} onChange={(e) => set("new_customer_phone", e.target.value)} placeholder="Telefon (opcjonalnie)" inputMode="tel" className="w-full rounded-field border border-border bg-surface-2 px-3.5 py-2.5 text-[13px] text-ink outline-none focus:border-accent" />
        </div>
      )}
      {existingSelected && (
        <div className="mt-2">
          <label className="mb-1 block text-[11.5px] font-semibold text-ink-2">Telefon do klienta</label>
          <input value={newPhone} onChange={(e) => set("new_customer_phone", e.target.value)} placeholder="Telefon" inputMode="tel" className="w-full rounded-field border border-border bg-surface-2 px-3.5 py-2.5 text-[13px] text-ink outline-none focus:border-accent" />
        </div>
      )}
    </div>
  );
}

// Przełącznik w stylu iOS (zamiast checkboxów).
function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-3 text-left">
      <span className="min-w-0">
        <span className="text-[13px] font-semibold text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-[11.5px] font-normal text-ink-2">{hint}</span>}
      </span>
      <span className="relative h-6 w-[42px] flex-none rounded-full transition-colors" style={{ background: checked ? "#22c55e" : "#3a3d4a" }}>
        <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform" style={{ transform: checked ? "translateX(18px)" : "translateX(2px)" }} />
      </span>
    </button>
  );
}

// Wyszukiwarka sprzętu z magazynu z ILOŚCIĄ (+/− i z ręki) — cena liczy się z pozycji × ilość.
// Zapisujemy do addon_ids + addon_qty (jak dodatki), więc kwota liczy się automatycznie.
function WarehousePicker({ items, addonIds, addonQty, toggleAddon, setAddonQty }: {
  items: ReservationAddon[]; addonIds: string[]; addonQty: Record<string, number>;
  toggleAddon: (id: string) => void; setAddonQty: (id: string, q: number) => void;
}) {
  const [query, setQuery] = useState("");
  const byId = new Map(items.map((a) => [a.id, a]));
  const qtyOf = (id: string) => Math.max(1, Math.round(addonQty[id] ?? 1));
  const ql = query.trim().toLowerCase();
  const results = ql ? items.filter((a) => a.name.toLowerCase().includes(ql) && !addonIds.includes(a.id)).slice(0, 8) : [];
  const total = addonIds.reduce((s, id) => s + Number(byId.get(id)?.price ?? 0) * qtyOf(id), 0);

  return (
    <div>
      <label className="mb-1.5 block text-[12.5px] font-semibold text-ink-2">Sprzęt z magazynu {total > 0 && <span className="text-ink">· {fmtPLN(total)}</span>}</label>
      {addonIds.length > 0 && (
        <div className="mb-2 flex flex-col gap-1.5">
          {addonIds.map((id) => {
            const a = byId.get(id); const q = qtyOf(id); const price = Number(a?.price ?? 0);
            return (
              <div key={id} className="flex items-center gap-2 rounded-[10px] border border-border bg-surface-2 px-2.5 py-1.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-ink">{a?.name ?? "Pozycja"}</div>
                  <div className="text-[11px] text-ink-2">{fmtPLN(price)} / szt · razem {fmtPLN(price * q)}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setAddonQty(id, q - 1)} className="h-7 w-7 rounded-[7px] border border-border bg-surface text-[15px] font-bold text-ink-2">−</button>
                  <input inputMode="numeric" value={String(q)} onChange={(e) => { const n = parseInt(e.target.value.replace(/\D/g, ""), 10); setAddonQty(id, Number.isNaN(n) ? 1 : n); }} className="w-11 rounded-[7px] border border-border bg-surface px-1 py-1.5 text-center text-[13px] font-bold text-ink outline-none focus:border-accent" />
                  <button type="button" onClick={() => setAddonQty(id, q + 1)} className="h-7 w-7 rounded-[7px] border border-border bg-surface text-[15px] font-bold text-ink-2">+</button>
                </div>
                <button type="button" onClick={() => toggleAddon(id)} className="ml-1 text-[11px] font-semibold text-bad">Usuń</button>
              </div>
            );
          })}
        </div>
      )}
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Szukaj sprzętu w magazynie…" className="w-full rounded-field border border-border bg-surface-2 px-3.5 py-3 text-[14px] text-ink outline-none focus:border-accent" />
      {results.length > 0 && (
        <div className="mt-1 flex flex-col gap-0.5 rounded-field border border-border bg-surface p-1">
          {results.map((a) => (
            <button key={a.id} type="button" onClick={() => { toggleAddon(a.id); setQuery(""); }} className="flex items-center justify-between rounded-[8px] px-2.5 py-1.5 text-left text-[13px] text-ink hover:bg-surface-2">
              <span>{a.name}</span>
              <span className="text-[11px] text-ink-2">{fmtPLN(Number(a.price ?? 0))}{a.available != null ? ` · ${a.available} szt.` : ""}</span>
            </button>
          ))}
        </div>
      )}
      {ql && results.length === 0 && <p className="mt-1.5 text-[11px] text-ink-2">Brak pozycji „{query.trim()}” w magazynie.</p>}
    </div>
  );
}

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

  // Telefon do klienta w edycji: pre-fill z wybranego istniejącego klienta (regresja — dawniej znikał).
  const initialPhone = initial?.customer_id ? (customers.find((c) => c.id === initial.customer_id)?.phone ?? "") : "";

  const [v, setV] = useState<ReservationFormValues>({
    business_line: initial?.business_line ?? "ICLUB",
    customer_id: initial?.customer_id ?? "",
    new_customer_name: "",
    new_customer_phone: initialPhone,
    self_pickup: initial?.self_pickup ?? false,
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
    rental_days: initial?.rental_days != null ? String(initial.rental_days) : "",
    delivery_time: initial?.delivery_time ?? "",
    payment_upfront: initial?.payment_upfront ?? false,
    rental_hourly: initial?.rental_settlement_flat == null, // domyślnie godzinowo
    rental_flat: initial?.rental_settlement_flat != null ? String(initial.rental_settlement_flat) : "",
    price: initial?.price != null ? String(initial.price) : "",
    discount_type: initial?.discount_type === "PERCENT" ? "PERCENT" : "AMOUNT",
    // Legacy (sprzed kolumny discount_value): pokaż zapisaną kwotę rabatu, by nie wyzerować jej przy edycji.
    discount_value: initial?.discount_value != null ? String(initial.discount_value) : (initial?.discount ? String(initial.discount) : ""),
    discount_amount: initial?.discount != null ? String(initial.discount) : "",
    transport_price: initial?.transport_price != null ? String(initial.transport_price) : "",
    // §13.6 W formularzu „Zadatek" = BAZA (bez transportu). Zapisana zaliczka = baza + transport,
    // więc przy edycji odejmujemy transport, żeby pokazać samą bazę (round-trip zwraca tę samą kwotę).
    deposit: initial?.deposit != null
      ? String(Math.max(0, Math.round((Number(initial.deposit) - (initial?.self_pickup ? 0 : Number(initial?.transport_price ?? 0))) * 100) / 100))
      : "",
    event_start_time: initial?.event_start_time ?? "",
    assembly_time: initial?.assembly_time ?? "",
    pricing_snapshot: initial?.pricing_snapshot ? JSON.stringify(initial.pricing_snapshot) : "",
    is_invoice: initial?.is_invoice ?? false,
    heating: initial?.heating ?? false,
    source: initial?.source ?? "",
    status: initial?.status ?? "CONFIRMED", // §rezerwacja zakładamy tylko potwierdzone (odwołać może tylko klient)
    notes: initial?.notes ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<TentConflict[]>([]);
  const [exceeded, setExceeded] = useState<string[]>([]);
  const [addonShortages, setAddonShortages] = useState<AddonShortage[]>([]);
  const [heatingAvail, setHeatingAvail] = useState<HeatingAvailability | null>(null);
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
  // §wypożyczalnia Liczba dób liczona automatycznie z dat (odbiór→zwrot), ale można nadpisać ręcznie
  // (idziemy klientowi na rękę). „Touched" = użytkownik zmienił ręcznie → nie nadpisujemy z dat.
  const [daysTouched, setDaysTouched] = useState(initial?.rental_days != null);
  useEffect(() => {
    if (v.business_line !== "EQUIPMENT_RENTAL" || daysTouched || !v.event_date) return;
    const end = v.teardown_date || v.event_date;
    const diff = Math.round((new Date(end + "T00:00:00Z").getTime() - new Date(v.event_date + "T00:00:00Z").getTime()) / 86_400_000);
    const days = String(Math.max(1, diff || 1));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setV((s) => (s.rental_days === days ? s : { ...s, rental_days: days }));
  }, [v.business_line, v.event_date, v.teardown_date, daysTouched]);

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

  // §12.3/§11 Live-kontrola dostępności dodatków i pozycji z pakietu w tym terminie.
  useEffect(() => {
    let active = true;
    checkAddonAvailabilityAction(v.addon_ids, v.addon_qty, v.package_id, occStart, occEnd, initial?.id).then((s) => {
      if (active) setAddonShortages(s);
    });
    return () => {
      active = false;
    };
  }, [v.addon_ids, v.addon_qty, v.package_id, occStart, occEnd, initial?.id]);

  // §41 Ogrzewanie: kontrola dostępności nagrzewnicy HT-01 (tylko ostrzeżenie, nie blokuje).
  // Ostrzeżenie i tak pokazujemy tylko przy zaznaczonym ogrzewaniu (guard w renderze).
  useEffect(() => {
    let active = true;
    checkHeatingAvailabilityAction(occStart, occEnd, initial?.id).then((a) => {
      if (active) setHeatingAvail(a);
    });
    return () => {
      active = false;
    };
  }, [occStart, occEnd, initial?.id]);

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
  const addonsPerDay = addons
    .filter((a) => v.addon_ids.includes(a.id))
    .reduce((sum, a) => sum + Number(a.price || 0) * billableOf(a.id), 0);
  // §wypożyczalnia Cena wynajmu = suma pozycji × liczba dób. Dla iClub liczba dób nie dotyczy.
  const rentalDaysNum = Math.max(1, Math.floor(Number(v.rental_days) || 1));
  const addonsTotal = v.business_line === "EQUIPMENT_RENTAL" ? addonsPerDay * rentalDaysNum : addonsPerDay;
  // Rozbicie na konkretne pozycje do podsumowania (dodatki iClub / sprzęt wypożyczalni).
  const rentalMult = v.business_line === "EQUIPMENT_RENTAL" ? rentalDaysNum : 1;
  const lineItems = addons
    .filter((a) => v.addon_ids.includes(a.id))
    .map((a) => {
      const billable = billableOf(a.id);
      return { id: a.id, name: a.name, qty: qtyOf(a.id), billable, value: Number(a.price || 0) * billable * rentalMult };
    });

  // §13 Kalkulacja na żywo: pakiet + dodatki + transport − rabat = razem; zadatek; pozostało.
  const selectedPackage = packages.find((p) => p.id === v.package_id);
  // §cennik Cena pakietu zależna od wielkości namiotu głównego: „D"/„D_BACKDOOR" = duży, inaczej mały.
  const isBigTent = v.tent_main === "D" || v.tent_main === "D_BACKDOOR";
  const packagePrice = Number(
    (isBigTent ? selectedPackage?.price_big : selectedPackage?.price_small) ?? selectedPackage?.base_price ?? 0,
  );
  // §9 Sugerowane godziny montażu (start imprezy − pakiet − dodatki − gastro − bufor).
  const setupTimes = computeSetupTimes(v.event_start_time, selectedPackage?.assembly_minutes ?? 0, v.addon_ids.length, v.tent_extra === "GASTRO", assemblyConfig);
  const transportPrice = v.self_pickup ? 0 : (Number(v.transport_price.replace(",", ".")) || 0); // odbiór własny → 0
  const discountValueNum = Number(v.discount_value.replace(",", ".")) || 0;
  const order = computeOrderPrice({ packagePrice, addonsTotal, transportPrice, discountType: v.discount_type, discountValue: discountValueNum });
  // §21: ręcznie ustawiona wartość końcowa ma priorytet; inaczej używamy wyliczonej.
  const finalPrice = Number(v.price.replace(",", ".")) || order.total;
  // §13.6 „Zadatek" = bazowa kwota zaliczki (domyślnie 300 zł). Transport oraz 15% sumy dodatków to
  // OSOBNE składowe zaliczki pobieranej przy umowie → cała zaliczka = zadatek + transport + 15% dodatków,
  // a klientowi pozostaje wartość − zaliczka.
  const depositValue = depositTouched ? v.deposit : "300";
  const depositNum = Number(depositValue.replace(",", ".")) || 0;
  const addonsDeposit = v.business_line === "ICLUB" ? Math.round(ADDON_DEPOSIT_PCT * addonsTotal * 100) / 100 : 0; // §13.6 15% od dodatków
  const fullDeposit = Math.round((depositNum + transportPrice + addonsDeposit) * 100) / 100; // zaliczka przy umowie = zadatek + transport + 15% dodatków
  const remaining = Math.max(0, Math.round((finalPrice - fullDeposit) * 100) / 100);
  const depositOverValue = finalPrice > 0 && fullDeposit > finalPrice; // §13.6 ostrzeżenie

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
      deposit: fullDeposit,
      total: order.total,
      saved_at: new Date().toISOString(),
    };
    // §13: dołącz wyliczoną kwotę rabatu i ustalony zadatek (sugestia, jeśli nietknięty).
    const payload: ReservationFormValues = {
      ...v,
      // Wypożyczalnia: okno = data odbioru (event_date) → data zwrotu (teardown, puste = ten sam dzień).
      setup_date: v.business_line === "EQUIPMENT_RENTAL" ? v.event_date : (showCustomDates ? v.setup_date : ""),
      teardown_date: v.business_line === "EQUIPMENT_RENTAL" ? (v.teardown_date || v.event_date) : (showCustomDates ? v.teardown_date : ""),
      // §K2 Gdy „Wartość końcowa" nie jest wpisana ręcznie, zapisz WYLICZONĄ cenę (order.total),
      // a nie puste pole — inaczej przychód/rentowność rezerwacji pokazywały 0 zł.
      price: v.price.trim() !== "" ? v.price : String(order.total),
      discount_amount: String(order.discountAmount),
      deposit: String(fullDeposit),
      // Wypożyczalnia: rental_items = nazwy wybranego sprzętu (z ilością) — do tytułu w kalendarzu i opisu.
      rental_items: v.business_line === "EQUIPMENT_RENTAL"
        ? addons.filter((a) => v.addon_ids.includes(a.id)).map((a) => (v.addon_qty?.[a.id] ?? 1) > 1 ? `${a.name} ×${v.addon_qty[a.id]}` : a.name).join(", ")
        : v.rental_items,
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
            <CustomerPicker customers={customers} customerId={v.customer_id} newName={v.new_customer_name} newPhone={v.new_customer_phone} set={set} />
            {isEdit && (
              <SelectField label="Status" value={v.status} onChange={(e) => set("status", e.target.value as ReservationStatus)}>
                {RESERVATION_STATUS_ORDER.map((s) => <option key={s} value={s}>{RESERVATION_STATUS_LABELS[s]}</option>)}
              </SelectField>
            )}
            {v.business_line === "EQUIPMENT_RENTAL" ? (
              <>
                <TextField label="Data odbioru" type="date" value={v.event_date} onChange={(e) => set("event_date", e.target.value)} />
                <TextField label="Data zwrotu" type="date" value={v.teardown_date} onChange={(e) => set("teardown_date", e.target.value)} hint={v.event_date ? `puste = ${v.event_date} (ten sam dzień)` : undefined} />
                <TextField label="Liczba dób" type="number" inputMode="numeric" value={v.rental_days} onChange={(e) => { setDaysTouched(true); set("rental_days", e.target.value); }} placeholder="np. 2" hint="Liczy się z dat; można zmienić ręcznie" />
              </>
            ) : (
              <TextField label="Data imprezy" type="date" value={v.event_date} onChange={(e) => set("event_date", e.target.value)} />
            )}
            <AddressAutocomplete label="Lokalizacja" placeholder="Tarnowo Podgórne, ul. …" value={v.location} onChange={(val) => set("location", val)} />
            <TextField label="Godzina dostawy (opcjonalnie)" type="time" value={v.delivery_time} onChange={(e) => set("delivery_time", e.target.value)} hint="Puste = wydarzenie całodniowe" />
          </div>
          {/* §8 Daty montażu/demontażu (iClub) — domyślnie ukryte, rozwijane w razie nietypowego terminu. */}
          {v.business_line === "ICLUB" && (
            <div className="px-5 pb-5">
              <Toggle checked={showCustomDates} onChange={setShowCustomDates} label="Montaż lub demontaż w innym terminie" hint={!showCustomDates ? (v.event_date ? `Domyślnie: montaż ${v.event_date}, demontaż ${nextDay(v.event_date)}.` : "Domyślnie montaż w dniu imprezy, demontaż następnego dnia.") : undefined} />
              {showCustomDates && (
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <TextField label="Data montażu" type="date" value={v.setup_date} onChange={(e) => set("setup_date", e.target.value)} hint={v.event_date ? `puste = ${v.event_date}` : "puste = dzień imprezy"} />
                  <TextField label="Data demontażu" type="date" value={v.teardown_date} onChange={(e) => set("teardown_date", e.target.value)} hint={v.event_date ? `puste = ${nextDay(v.event_date)}` : "puste = następny dzień"} />
                </div>
              )}
            </div>
          )}
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
            <div className="px-5 pb-4">
              <label className="flex items-center gap-2.5 text-[13px] text-ink">
                <input type="checkbox" checked={v.heating} onChange={(e) => set("heating", e.target.checked)} className="h-4 w-4 accent-accent" />
                Ogrzewanie (nagrzewnica HT-01)
              </label>
              {v.heating && heatingAvail && heatingAvail.free <= 0 && (
                <div className="mt-2">
                  <Alert tone="warn" title="Brak wolnej nagrzewnicy w tym terminie">
                    {heatingAvail.hasItem
                      ? `Wszystkie nagrzewnice HT-01 są zajęte (${heatingAvail.used}/${heatingAvail.total}). Możesz zapisać — to tylko ostrzeżenie.`
                      : "W magazynie nie ma pozycji HT-01. Dodaj nagrzewnicę w Magazynie, aby śledzić dostępność."}
                  </Alert>
                </div>
              )}
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
            <div className="flex flex-col gap-4 px-5 pb-5">
              <WarehousePicker items={addons} addonIds={v.addon_ids} addonQty={v.addon_qty} toggleAddon={toggleAddon} setAddonQty={setAddonQty} />
              <Toggle checked={v.payment_upfront} onChange={(val) => set("payment_upfront", val)} label="Opłacone z góry" hint="Inaczej: płatność przy odbiorze" />
              {/* §18 Forma rozliczenia pracownika: godzinowa domyślnie, ryczałt per zlecenie nadpisuje. */}
              <div>
                <Toggle checked={v.rental_hourly} onChange={(val) => set("rental_hourly", val)} label="Rozliczenie pracownika godzinowe" hint="Domyślne — czas × stawka. Wyłącz, aby ustawić ryczałt." />
                {!v.rental_hourly && (
                  <div className="mt-2">
                    <TextField label="Ryczałt za to zlecenie (zł)" inputMode="numeric" placeholder="0" value={v.rental_flat} onChange={(e) => set("rental_flat", e.target.value)} error={errors.rental_flat} hint="Nadpisuje stawkę godzinową — pracownik dostaje tę kwotę za to zlecenie." />
                  </div>
                )}
              </div>
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

        {v.business_line === "ICLUB" && (
          <SectionCard title="Informacje dodatkowe" className="p-5">
            <div className="grid grid-cols-1 gap-4 px-5 pb-5 sm:grid-cols-2">
              <TextField label="Rodzaj imprezy" placeholder="Osiemnastka" value={v.event_type} onChange={(e) => set("event_type", e.target.value)} />
              <TextField label="Liczba osób (opcjonalnie)" inputMode="numeric" placeholder="45" value={v.guests} onChange={(e) => set("guests", e.target.value)} error={errors.guests} hint="Nie blokuje zapisu rezerwacji" />
            </div>
          </SectionCard>
        )}

        <SectionCard title="Rozliczenie" className="p-5">
          {/* Wypożyczalnia: odbiór własny jako czytelny, pełnej szerokości wiersz. */}
          {v.business_line === "EQUIPMENT_RENTAL" && (
            <div className="px-5 pb-3">
              <Toggle checked={v.self_pickup} onChange={(val) => set("self_pickup", val)} label="Odbiór własny" hint="Klient odbiera i zwraca sam — bez transportu" />
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 px-5 pb-2 sm:grid-cols-3">
            <div>
              <TextField label="Wartość końcowa (zł)" inputMode="numeric" placeholder="0" value={v.price} onChange={(e) => set("price", e.target.value)} error={errors.price} />
              {order.total > 0 && (
                <button type="button" onClick={() => set("price", String(order.total))} className="mt-1.5 text-[12px] font-semibold text-accent-soft">
                  Z kalkulatora: {fmtPLN(order.total)} →
                </button>
              )}
            </div>
            {!v.self_pickup && (
              <div>
                <TextField label="Transport dla klienta (zł)" inputMode="decimal" placeholder="0" value={v.transport_price} onChange={(e) => set("transport_price", e.target.value)} error={errors.transport_price} />
                <button type="button" onClick={computeTransport} disabled={pending} className="mt-1.5 text-[12px] font-semibold text-accent-soft">Oblicz z adresu →</button>
                {transportMsg && <div className="mt-1 text-[11px] text-ink-2">{transportMsg}</div>}
              </div>
            )}
            {/* Zadatek tylko dla iClub — wypożyczalnia nie pobiera zadatku. */}
            {v.business_line === "ICLUB" && (
              <div>
                <TextField label="Zadatek (zł)" inputMode="numeric" placeholder="300" value={depositValue} onChange={(e) => { setDepositTouched(true); set("deposit", e.target.value); }} error={errors.deposit} />
                <div className="mt-1 text-[11px] text-ink-2">Zaliczka przy umowie = zadatek + transport{addonsDeposit > 0 && " + 15% dodatków"} = <span className="font-semibold text-ink">{fmtPLN(fullDeposit)}</span></div>
              </div>
            )}
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
            {v.business_line === "ICLUB" && <div className="flex justify-between"><span className="text-ink-2">Pakiet{selectedPackage?.name ? ` · ${selectedPackage.name}` : ""}</span><span className="font-semibold text-ink">{fmtPLN(packagePrice)}</span></div>}
            {/* Konkretne pozycje: dodatki iClub / sprzęt wypożyczalni (nazwa × ilość → wartość) */}
            {lineItems.map((it) => (
              <div key={it.id} className="flex justify-between gap-3">
                <span className="min-w-0 flex-1 truncate text-ink-2">
                  {it.name}{it.qty > 1 ? ` ×${it.qty}` : ""}
                  {v.business_line === "EQUIPMENT_RENTAL" && rentalDaysNum > 1 ? ` · ${rentalDaysNum} dni` : ""}
                  {it.billable === 0 ? " (w pakiecie)" : it.billable < it.qty ? ` (${it.qty - it.billable} w pakiecie)` : ""}
                </span>
                <span className="font-semibold text-ink">{fmtPLN(it.value)}</span>
              </div>
            ))}
            {v.business_line === "EQUIPMENT_RENTAL" && lineItems.length === 0 && (
              <div className="text-[12px] text-ink-2">Brak wybranych pozycji sprzętu.</div>
            )}
            {v.business_line === "ICLUB" && lineItems.length > 0 && (
              <div className="flex justify-between border-t border-border-soft pt-1.5 text-[12px]"><span className="text-ink-2">Dodatki razem</span><span className="font-semibold text-ink-2">{fmtPLN(addonsTotal)}</span></div>
            )}
            {!v.self_pickup && <div className="flex justify-between"><span className="text-ink-2">Transport</span><span className="font-semibold text-ink">{fmtPLN(transportPrice)}</span></div>}
            {order.discountAmount > 0 && (
              <div className="flex justify-between"><span className="text-ink-2">Rabat{v.discount_type === "PERCENT" ? ` (${discountValueNum}%)` : ""}</span><span className="font-semibold text-ok">− {fmtPLN(order.discountAmount)}</span></div>
            )}
            <div className="mt-1 flex justify-between border-t border-border-soft pt-2 text-[14px] font-bold text-white"><span>Wartość realizacji</span><span>{fmtPLN(finalPrice)}</span></div>
            {Math.round(finalPrice) !== Math.round(order.total) && (
              <div className="flex justify-between text-[11px] text-ink-2"><span>Wyliczona (pakiet+dodatki+transport−rabat)</span><span>{fmtPLN(order.total)}</span></div>
            )}
            {v.business_line === "ICLUB" && <div className="flex justify-between"><span className="text-ink-2">Zadatek</span><span className="font-semibold text-ink">− {fmtPLN(depositNum)}</span></div>}
            {v.business_line === "ICLUB" && !v.self_pickup && <div className="flex justify-between"><span className="text-ink-2">Transport (składowa zaliczki)</span><span className="font-semibold text-ink">− {fmtPLN(transportPrice)}</span></div>}
            {v.business_line === "ICLUB" && addonsDeposit > 0 && <div className="flex justify-between"><span className="text-ink-2">Zaliczka za dodatki (15%)</span><span className="font-semibold text-ink">− {fmtPLN(addonsDeposit)}</span></div>}
            {v.business_line === "ICLUB" && <div className="mt-1 flex justify-between border-t border-border-soft pt-2 text-[14px] font-bold text-warn"><span>Pozostało do zapłaty</span><span>{fmtPLN(remaining)}</span></div>}
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
