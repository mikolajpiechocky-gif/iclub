// Warstwa danych: rezerwacje. Tworzenie rezerwacji automatycznie generuje
// zlecenie (job) i podstawowe etapy (job_stages) — §28/§50 instrukcji master.
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { ReservationRecord, ReservationWithRefs, ReservationStatus, BusinessLine, TentRecord, PricingSnapshot } from "./types";
import { DEMO_RESERVATIONS } from "./demo-resources";
import { stagesForBusinessLine } from "@/lib/domain/stages";
import { listTents } from "./resources";
import { tentSizeCode } from "@/lib/domain/calendar";
import { type TentSlots, type TentCapacities, type TentChoice, sumSlots, exceededPools, choiceFromTent } from "@/lib/domain/tents";

// §10: konkretny egzemplarz z wybranego typu (do wyświetlania nazwy/rozmiaru).
function resolveTentId(choice: string | null | undefined, tents: TentRecord[]): string | null {
  if (!choice) return null;
  if (choice === "M") return tents.find((t) => tentSizeCode(t.size) === "M")?.id ?? null;
  if (choice === "D") return tents.find((t) => tentSizeCode(t.size) === "D" && !t.has_back_door)?.id ?? tents.find((t) => tentSizeCode(t.size) === "D")?.id ?? null;
  if (choice === "D_BACKDOOR") return tents.find((t) => tentSizeCode(t.size) === "D" && t.has_back_door)?.id ?? null;
  if (choice === "GASTRO") return tents.find((t) => /gastr/i.test(t.name ?? ""))?.id ?? null;
  return null;
}

// Pojemności pul z magazynu (fallback: 1 mały, 2 duże w tym 1 z drzwiami, 1 gastro).
export async function getTentCapacities(): Promise<TentCapacities> {
  const tents = await listTents();
  let small = 0, large = 0, backdoor = 0;
  for (const t of tents) {
    if (tentSizeCode(t.size) === "D") { large++; if (t.has_back_door) backdoor++; } else small++;
  }
  const gastro = tents.filter((t) => /gastr/i.test(t.name ?? "")).length;
  return { small: small || 1, large: large || 2, backdoor: backdoor || 1, gastro: gastro || 1 };
}

// §10.3 Sprawdza overbooking POJEMNOŚCIOWY po typie (mały/duży/z drzwiami/gastro).
export async function checkTentOverbooking(
  mine: TentSlots,
  startDate: string | null,
  endDate: string | null,
  excludeId?: string,
): Promise<{ exceeded: string[]; conflicts: ReservationWithRefs[] }> {
  if (!startDate || (mine.small + mine.large + mine.backdoor + mine.gastro === 0)) return { exceeded: [], conflicts: [] };
  const end = endDate ?? startDate;
  const cap = await getTentCapacities();

  let all: ReservationWithRefs[];
  if (!isSupabaseConfigured()) {
    all = DEMO_RESERVATIONS;
  } else {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("reservations")
      .select("*, customer:customers(id,name), tent:tents!tent_id(id,name,size,has_back_door), tent2:tents!tent_id_2(id,name,size,has_back_door), package:packages(id,name)")
      .in("status", ["TEMPORARY", "CONFIRMED"]);
    if (error) throw new Error(error.message);
    all = (data ?? []) as ReservationWithRefs[];
  }

  const overlapping = all.filter((r) => {
    if (r.id === excludeId) return false;
    if (r.status !== "TEMPORARY" && r.status !== "CONFIRMED") return false;
    const rg = reservationRange(r);
    return rangesOverlap(startDate, end, rg.start, rg.end);
  });

  let existing: TentSlots = { small: 0, large: 0, backdoor: 0, gastro: 0 };
  for (const r of overlapping) {
    const rr = r as unknown as { tent_main?: string | null; tent_extra?: string | null; tent?: { size?: string | null; has_back_door?: boolean } | null; tent2?: { size?: string | null; has_back_door?: boolean } | null };
    const c1: TentChoice | "" = (rr.tent_main as TentChoice) || (rr.tent ? choiceFromTent(rr.tent.size, rr.tent.has_back_door) : "");
    const c2: TentChoice | "" = (rr.tent_extra as TentChoice) || (rr.tent2 ? choiceFromTent(rr.tent2.size, rr.tent2.has_back_door) : "");
    const s = sumSlots([c1, c2]);
    existing = { small: existing.small + s.small, large: existing.large + s.large, backdoor: existing.backdoor + s.backdoor, gastro: existing.gastro + s.gastro };
  }

  return { exceeded: exceededPools(existing, mine, cap), conflicts: overlapping };
}

// §12.3 Twarda kontrola dostępności dodatków magazynowych w nakładających się terminach.
export interface AddonShortage { id: string; name: string; stock: number; used: number; requested: number }

export async function checkAddonOverbooking(
  addonIds: string[],
  addonQty: Record<string, number> | null | undefined,
  packageId: string | null,
  startDate: string | null,
  endDate: string | null,
  excludeId?: string,
): Promise<{ shortages: AddonShortage[] }> {
  if (!isSupabaseConfigured() || !startDate) return { shortages: [] };
  const end = endDate ?? startDate;
  const supabase = await createClient();

  // Skład pakietów: mapa packageId → { equipmentId: ilość } (§11 pozycje pakietu rezerwują sprzęt).
  const { data: piData } = await supabase.from("package_items").select("package_id, equipment_id, quantity");
  const compByPkg = new Map<string, Map<string, number>>();
  for (const it of (piData ?? []) as { package_id: string; equipment_id: string; quantity: number }[]) {
    if (!compByPkg.has(it.package_id)) compByPkg.set(it.package_id, new Map());
    compByPkg.get(it.package_id)!.set(it.equipment_id, Number(it.quantity));
  }

  // Fizyczne zapotrzebowanie rezerwacji: pozycje z pakietu + dodatki. Dodatek podaje ILOŚĆ
  // CAŁKOWITĄ danej pozycji, więc pokrywa to, co w pakiecie (bez podwójnego liczenia).
  const usageFor = (aIds: string[] | null, aQty: Record<string, number> | null, pkgId: string | null): Map<string, number> => {
    const use = new Map<string, number>();
    if (pkgId && compByPkg.has(pkgId)) for (const [eq, q] of compByPkg.get(pkgId)!) use.set(eq, q);
    // Dodatek może tylko ZWIĘKSZYĆ zapotrzebowanie ponad ilość z pakietu (nadwyżka),
    // nigdy zejść poniżej — inaczej zaniżylibyśmy fizyczną zajętość pozycji z pakietu.
    for (const eq of aIds ?? []) {
      const q = Math.max(1, Math.round(aQty?.[eq] ?? 1));
      use.set(eq, Math.max(use.get(eq) ?? 0, q));
    }
    return use;
  };

  const myUse = usageFor(addonIds, addonQty ?? null, packageId);
  const relevant = [...myUse.keys()];
  if (!relevant.length) return { shortages: [] };

  // Stany magazynowe dla istotnych pozycji. Legacy addony bez wiersza w equipment pomijamy.
  const { data: eqData } = await supabase.from("equipment").select("id, name, quantity").in("id", relevant);
  const stock = new Map<string, { name: string; quantity: number }>();
  for (const e of (eqData ?? []) as { id: string; name: string; quantity: number }[]) stock.set(e.id, { name: e.name, quantity: Number(e.quantity) });
  if (stock.size === 0) return { shortages: [] };

  const { data } = await supabase
    .from("reservations")
    .select("id, addon_ids, addon_qty, package_id, setup_date, teardown_date, event_date, status")
    .in("status", ["TEMPORARY", "CONFIRMED"]);
  const rows = (data ?? []) as { id: string; addon_ids: string[] | null; addon_qty: Record<string, number> | null; package_id: string | null; setup_date: string | null; teardown_date: string | null; event_date: string | null }[];

  const used = new Map<string, number>();
  for (const r of rows) {
    if (r.id === excludeId) continue;
    const rg = reservationRange(r);
    if (!rangesOverlap(startDate, end, rg.start, rg.end)) continue;
    for (const [eq, q] of usageFor(r.addon_ids, r.addon_qty, r.package_id)) {
      if (!stock.has(eq)) continue;
      used.set(eq, (used.get(eq) ?? 0) + q);
    }
  }

  const shortages: AddonShortage[] = [];
  for (const [eq, requested] of myUse) {
    const st = stock.get(eq);
    if (!st) continue;
    const u = used.get(eq) ?? 0;
    if (u + requested > st.quantity) shortages.push({ id: eq, name: st.name, stock: st.quantity, used: u, requested });
  }
  return { shortages };
}

// §41 Dostępność nagrzewnic HT-01 w danym terminie (nakładające się rezerwacje z ogrzewaniem).
export interface HeatingAvailability { total: number; used: number; free: number; hasItem: boolean }

export async function checkHeatingAvailability(
  startDate: string | null,
  endDate: string | null,
  excludeId?: string,
): Promise<HeatingAvailability> {
  const empty: HeatingAvailability = { total: 0, used: 0, free: 0, hasItem: false };
  if (!isSupabaseConfigured() || !startDate) return empty;
  const end = endDate ?? startDate;
  const supabase = await createClient();

  // Nagrzewnica w magazynie (kod HT-01). Ilość = liczba sztuk.
  const { data: eq } = await supabase.from("equipment").select("quantity").eq("code", "HT-01").maybeSingle();
  const total = eq ? Number((eq as { quantity: number }).quantity) : 0;
  const hasItem = Boolean(eq);

  // Ile nagrzewnic zajmują inne rezerwacje z ogrzewaniem w nakładającym się terminie.
  const { data } = await supabase
    .from("reservations")
    .select("id, setup_date, teardown_date, event_date, status")
    .eq("heating", true)
    .in("status", ["TEMPORARY", "CONFIRMED"]);
  const rows = (data ?? []) as { id: string; setup_date: string | null; teardown_date: string | null; event_date: string | null }[];

  let used = 0;
  for (const r of rows) {
    if (r.id === excludeId) continue;
    const rg = reservationRange(r);
    if (rangesOverlap(startDate, end, rg.start, rg.end)) used += 1;
  }
  return { total, used, free: total - used, hasItem };
}

export interface ReservationInput {
  business_line: BusinessLine;
  customer_id: string | null;
  inquiry_id?: string | null;
  event_type?: string | null;
  event_date?: string | null;
  setup_date?: string | null;
  teardown_date?: string | null;
  location?: string | null;
  guests?: number | null;
  tent_id: string | null;
  tent_id_2?: string | null;
  tent_main?: string | null;
  tent_extra?: string | null;
  overbooking_override?: boolean;
  overbooking_reason?: string | null;
  package_id: string | null;
  addon_ids: string[];
  addon_qty?: Record<string, number>; // §12.2 ilość per dodatek
  rental_items?: string | null;
  delivery_time?: string | null;
  payment_upfront?: boolean;
  price?: number | null;
  discount?: number;              // faktyczna kwota rabatu (zł)
  discount_type?: string;         // §13.4 AMOUNT | PERCENT
  discount_value?: number | null; // wartość wprowadzona (% lub zł)
  transport_price?: number | null; // §13.3 cena transportu dla klienta
  deposit?: number;
  event_start_time?: string | null; // §9.1 godzina rozpoczęcia imprezy
  assembly_time?: string | null;    // §9.3 ustalona (ręcznie) godzina montażu
  pricing_snapshot?: PricingSnapshot | null; // §11.2 kopia wyceny
  rental_settlement_flat?: number | null; // §18 ryczałt wypożyczalni per zlecenie
  is_invoice?: boolean;
  heating?: boolean; // §41 ogrzewanie (nagrzewnica HT-01)
  source?: string | null;
  status: ReservationStatus;
  expires_at?: string | null;
  notes?: string | null;
}

export async function listReservations(): Promise<ReservationWithRefs[]> {
  if (!isSupabaseConfigured()) return DEMO_RESERVATIONS;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reservations")
    .select("*, customer:customers(id,name,city), tent:tents!tent_id(id,name,size), tent2:tents!tent_id_2(id,name,size), package:packages(id,name)")
    .order("event_date", { ascending: false, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ReservationWithRefs[];
}

export async function getReservation(id: string): Promise<ReservationRecord | null> {
  if (!isSupabaseConfigured()) return DEMO_RESERVATIONS.find((r) => r.id === id) ?? null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("reservations").select("*").eq("id", id).single();
  if (error) return null;
  return data as ReservationRecord;
}

// §9.3 Stempel autora/daty ręcznego ustalenia godziny montażu. Zwraca pola do zapisu
// albo null, gdy pola nie przekazano (wtedy nie ruszamy). Zachowuje autora, gdy godzina
// się nie zmieniła; czyści, gdy usunięto ręczne ustalenie.
async function assemblyStampFor(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string | null,
  input: ReservationInput,
): Promise<{ assembly_time_by: string | null; assembly_time_at: string | null } | null> {
  if (input.assembly_time === undefined) return null;
  const newVal = input.assembly_time || null;
  if (!newVal) return { assembly_time_by: null, assembly_time_at: null };
  if (id) {
    const { data } = await supabase.from("reservations").select("assembly_time, assembly_time_by, assembly_time_at").eq("id", id).maybeSingle();
    const prev = data as { assembly_time: string | null; assembly_time_by: string | null; assembly_time_at: string | null } | null;
    if (prev && prev.assembly_time === newVal) return { assembly_time_by: prev.assembly_time_by, assembly_time_at: prev.assembly_time_at };
  }
  const { data: { user } } = await supabase.auth.getUser();
  return { assembly_time_by: user?.id ?? null, assembly_time_at: new Date().toISOString() };
}

// Tworzy rezerwację + automatyczne zlecenie + etapy.
export async function createReservation(input: ReservationInput): Promise<{ id: string; jobId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const resolved = input.tent_main !== undefined ? await resolveFromChoices(input) : {};
  const stamp = await assemblyStampFor(supabase, null, input);
  const { data: reservation, error: rErr } = await supabase
    .from("reservations")
    .insert({ ...input, ...resolved, ...(stamp ?? {}), created_by: user?.id ?? null })
    .select("id, business_line, event_type, event_date")
    .single();
  if (rErr) throw new Error(rErr.message);

  const { data: job, error: jErr } = await supabase
    .from("jobs")
    .insert({
      reservation_id: reservation.id,
      business_line: reservation.business_line,
      title: reservation.event_type ?? "Zlecenie",
      event_date: reservation.event_date,
      status: "PLANNED",
    })
    .select("id")
    .single();
  if (jErr) throw new Error(jErr.message);

  const stages = stagesForBusinessLine(input.business_line).map((s, i) => ({
    job_id: job.id,
    stage_key: s.key,
    title: s.title,
    sort: i,
  }));
  const { error: sErr } = await supabase.from("job_stages").insert(stages);
  if (sErr) throw new Error(sErr.message);

  return { id: reservation.id as string, jobId: job.id as string };
}

export async function updateReservation(id: string, input: ReservationInput): Promise<void> {
  const supabase = await createClient();
  const resolved = input.tent_main !== undefined ? await resolveFromChoices(input) : {};
  const stamp = await assemblyStampFor(supabase, id, input);
  const { error } = await supabase.from("reservations").update({ ...input, ...resolved, ...(stamp ?? {}) }).eq("id", id);
  if (error) throw new Error(error.message);

  // Zabezpieczenie: rezerwacja bez zlecenia (np. starsza albo utworzona zanim generowaliśmy
  // zlecenia) nie miała sekcji zespołu → nie dało się przypisać pracownika. Dogeneruj zlecenie.
  const { data: existingJob } = await supabase.from("jobs").select("id").eq("reservation_id", id).maybeSingle();
  if (!existingJob) {
    const { data: job } = await supabase
      .from("jobs")
      .insert({ reservation_id: id, business_line: input.business_line, title: input.event_type ?? "Zlecenie", event_date: input.event_date ?? null, status: "PLANNED" })
      .select("id")
      .single();
    if (job) {
      const stages = stagesForBusinessLine(input.business_line).map((s, i) => ({ job_id: (job as { id: string }).id, stage_key: s.key, title: s.title, sort: i }));
      await supabase.from("job_stages").insert(stages);
    }
  }
}

// Usunięcie rezerwacji. Kaskada bazy usuwa powiązane zlecenie i jego dane operacyjne
// (etapy, przypisania, checklistę, płatności); koszty pozostają (job_id → null).
export async function deleteReservation(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("reservations").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// Ustala tent_id/tent_id_2 na podstawie wybranych typów (do wyświetlania).
async function resolveFromChoices(input: ReservationInput): Promise<{ tent_id: string | null; tent_id_2: string | null }> {
  const tents = await listTents();
  return { tent_id: resolveTentId(input.tent_main, tents), tent_id_2: resolveTentId(input.tent_extra, tents) };
}

// Potwierdzenie szczegółów przez klienta (§42) — osobno od edycji rezerwacji.
export async function setReservationConfirmed(id: string, confirmed: boolean): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("reservations")
    .update({ client_confirmed: confirmed, client_confirmed_at: confirmed ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// Wystawienie faktury VAT (§43) — szkielet pod InFakt. Osobno od edycji.
export async function setInvoiceIssued(id: string, issued: boolean, invoiceNumber: string | null): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("reservations")
    .update({
      invoice_issued: issued,
      invoice_issued_at: issued ? new Date().toISOString() : null,
      invoice_number: issued ? invoiceNumber : null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// --- Dostępność / konflikty namiotu (§8, §15) ---
// Zakres okna rezerwacji: od montażu (lub daty imprezy) do demontażu.
function reservationRange(r: { setup_date: string | null; teardown_date: string | null; event_date: string | null }) {
  const start = r.setup_date ?? r.event_date;
  const end = r.teardown_date ?? r.event_date ?? start;
  return { start, end };
}

// Porównanie dat ISO (YYYY-MM-DD) działa leksykograficznie.
function rangesOverlap(aStart: string, aEnd: string, bStart: string | null, bEnd: string | null): boolean {
  if (!bStart) return false;
  return aStart <= (bEnd ?? bStart) && aEnd >= bStart;
}

// Zwraca aktywne rezerwacje tego samego namiotu nakładające się terminem.
export async function findTentConflicts(
  tentId: string | null,
  startDate: string | null,
  endDate: string | null,
  excludeId?: string
): Promise<ReservationWithRefs[]> {
  if (!tentId || !startDate) return [];
  const end = endDate ?? startDate;

  // Namiot może być w slocie 1 (tent_id) albo 2 (tent_id_2) — sprawdzamy oba.
  let rows: ReservationWithRefs[];
  if (!isSupabaseConfigured()) {
    rows = DEMO_RESERVATIONS.filter((r) => r.tent_id === tentId || r.tent_id_2 === tentId);
  } else {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("reservations")
      .select("*, customer:customers(id,name), tent:tents!tent_id(id,name), package:packages(id,name)")
      .or(`tent_id.eq.${tentId},tent_id_2.eq.${tentId}`)
      .in("status", ["TEMPORARY", "CONFIRMED"]);
    if (error) throw new Error(error.message);
    rows = (data ?? []) as ReservationWithRefs[];
  }

  return rows.filter((r) => {
    if (r.id === excludeId) return false;
    if (r.status !== "TEMPORARY" && r.status !== "CONFIRMED") return false;
    const rg = reservationRange(r);
    return rangesOverlap(startDate, end, rg.start, rg.end);
  });
}

// Konflikt POJEMNOŚCIOWY per ROZMIAR (nie po konkretnym namiocie/kolorze):
// dla wybranych namiotów sprawdza, czy w oknie zmieści się jeszcze tyle sztuk danego
// rozmiaru, ile masz w magazynie. Zwraca kolidujące rezerwacje, gdy pojemność przekroczona.
export async function findSizeConflicts(
  wantedTentIds: string[],
  startDate: string | null,
  endDate: string | null,
  excludeId?: string
): Promise<ReservationWithRefs[]> {
  const ids = wantedTentIds.filter(Boolean);
  if (!ids.length || !startDate) return [];
  const end = endDate ?? startDate;

  // Mapa namiot→rozmiar (M/D) + pojemność (ile sztuk danego rozmiaru w magazynie).
  const tents = await listTents();
  const codeById = new Map<string, "M" | "D">();
  const capacity: Record<string, number> = {};
  for (const t of tents) {
    const code = tentSizeCode(t.size);
    codeById.set(t.id, code);
    capacity[code] = (capacity[code] ?? 0) + 1;
  }

  // Ile sztuk danego rozmiaru chce ta rezerwacja (slot 1 + 2).
  const wantByCode: Record<string, number> = {};
  for (const id of ids) {
    const code = codeById.get(id);
    if (code) wantByCode[code] = (wantByCode[code] ?? 0) + 1;
  }
  if (!Object.keys(wantByCode).length) return [];

  // Wszystkie aktywne rezerwacje (do policzenia zajętości rozmiaru w oknie).
  let all: ReservationWithRefs[];
  if (!isSupabaseConfigured()) {
    all = DEMO_RESERVATIONS;
  } else {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("reservations")
      .select("*, customer:customers(id,name), tent:tents!tent_id(id,name), package:packages(id,name)")
      .in("status", ["TEMPORARY", "CONFIRMED"]);
    if (error) throw new Error(error.message);
    all = (data ?? []) as ReservationWithRefs[];
  }

  const overlapping = all.filter((r) => {
    if (r.id === excludeId) return false;
    if (r.status !== "TEMPORARY" && r.status !== "CONFIRMED") return false;
    const rg = reservationRange(r);
    return rangesOverlap(startDate, end, rg.start, rg.end);
  });

  const conflicts = new Map<string, ReservationWithRefs>();
  for (const code of Object.keys(wantByCode)) {
    const cap = capacity[code] ?? 0;
    let used = 0;
    const users: ReservationWithRefs[] = [];
    for (const r of overlapping) {
      let slots = 0;
      if (r.tent_id && codeById.get(r.tent_id) === code) slots++;
      if (r.tent_id_2 && codeById.get(r.tent_id_2) === code) slots++;
      if (slots > 0) {
        used += slots;
        users.push(r);
      }
    }
    if (used + wantByCode[code] > cap) for (const u of users) conflicts.set(u.id, u);
  }
  return [...conflicts.values()];
}
