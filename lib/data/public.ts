// Publiczne API pod konfigurator na stronie (bez sesji użytkownika → service_role).
// Na tym etapie: odczyt cennika (na żywo z systemu) + przyjęcie zgłoszenia jako lead
// („Formularz strony"). BEZ płatności i bez wiążącej rezerwacji — obsługa potwierdza ręcznie.
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { TRANSPORT_BRACKETS } from "@/lib/domain/transport";
import { DEFAULT_DEPOSIT_BASE } from "@/lib/domain/order-pricing";
import { DEFAULT_TENT_CAPACITIES, sumSlots, choiceFromTent, type TentChoice } from "@/lib/domain/tents";
import { sendPushToOwners } from "@/lib/integrations/push";
import { listOwnerUserIds } from "@/lib/data/push";

const num = (v: unknown): number => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

interface RentalItem { code: string; name: string; category: string | null; quantity: number; rate_per_day: number; unit: string | null; is_addon: boolean; }

// Krzesła w magazynie są rozdzielone na rodzaje/kolory (KR-01/02/03…). Na stronie chcemy JEDNĄ pozycję
// „Krzesła" — ilość = suma wszystkich, stawka = wspólna (najwyższa niezerowa). Magazyn zostaje rozdzielony.
function isChair(e: RentalItem): boolean {
  return e.code.toUpperCase().startsWith("KR-") || /krzes/i.test(e.name);
}
function mergeChairs(items: RentalItem[]): RentalItem[] {
  const chairs = items.filter(isChair);
  if (chairs.length <= 1) return items;
  const merged: RentalItem = {
    code: "KRZESLA",
    name: "Krzesła",
    category: chairs[0].category,
    quantity: chairs.reduce((s, e) => s + e.quantity, 0),
    rate_per_day: Math.max(...chairs.map((e) => e.rate_per_day)),
    unit: chairs[0].unit,
    is_addon: chairs.some((e) => e.is_addon),
  };
  let done = false;
  return items.flatMap((e) => {
    if (!isChair(e)) return [e];
    if (done) return [];
    done = true;
    return [merged]; // pierwszy wiersz krzeseł zastępujemy scaloną pozycją, resztę pomijamy
  });
}

// Cennik na żywo: pakiety (cena mały/duży + montaż), dodatki, wypożyczalnia, transport, stałe.
export async function getPublicPricing() {
  if (!isServiceRoleConfigured()) return null;
  const s = createAdminClient();
  const [pk, ad, eq] = await Promise.all([
    s.from("packages").select("code, name, description, base_price, price_small, price_big, assembly_minutes, sort").eq("active", true).order("sort"),
    s.from("addons").select("code, name, price, sort").eq("active", true).order("sort"),
    s.from("equipment").select("code, name, category, quantity, rental_price, unit, is_addon").eq("active", true).eq("is_rentable", true).order("category"),
  ]);
  const rentalMapped = ((eq.data ?? []) as Record<string, unknown>[]).map((e) => ({
    code: String(e.code ?? ""), name: String(e.name ?? ""), category: (e.category as string) ?? null,
    quantity: num(e.quantity), rate_per_day: num(e.rental_price), unit: (e.unit as string) ?? null,
    is_addon: Boolean(e.is_addon),
  }));
  const rental = mergeChairs(rentalMapped);

  return {
    currency: "PLN",
    packages: ((pk.data ?? []) as Record<string, unknown>[]).map((p) => ({
      code: p.code, name: p.name, description: p.description,
      price_small: num(p.price_small) || num(p.base_price),
      price_big: num(p.price_big) || num(p.base_price),
      assembly_minutes: num(p.assembly_minutes),
    })),
    addons: ((ad.data ?? []) as Record<string, unknown>[]).map((a) => ({ code: a.code, name: a.name, price: num(a.price) })),
    rental,
    transport_brackets: TRANSPORT_BRACKETS, // [{maxKm, price}]; >400 km → wycena indywidualna
    deposit_base: DEFAULT_DEPOSIT_BASE,     // zadatek domyślny (iClub); wypożyczalnia bez zaliczki
    tent_capacity: DEFAULT_TENT_CAPACITIES, // { large, small, backdoor, gastro }
    tent_types: [
      { code: "M", label: "Mały 5,4×5,4" },
      { code: "D", label: "Duży 6×8" },
      { code: "D_BACKDOOR", label: "Duży 6×8 z drzwiami z tyłu" },
    ],
    self_pickup_transport: 0,
  };
}

// Wszystkie dni [from..to] (włącznie) jako "YYYY-MM-DD". Guard 800 dni.
function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  const d = new Date(from + "T12:00:00Z");
  const end = new Date(to + "T12:00:00Z");
  let guard = 0;
  while (d <= end && guard++ < 800) { out.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); }
  return out;
}

// Realna dostępność z kalendarza iClub: dla każdego dnia w [from..to] ile slotów namiotów/ogrzewania
// zajmują rezerwacje (TEMPORARY/CONFIRMED, z pominięciem wygasłych blokad). Konfigurator liczy
// wolne = capacity − used. Ta sama logika pojemności i zakresów co twarda kontrola w apce (§overbooking).
export async function getPublicAvailability(from: string, to: string) {
  if (!isServiceRoleConfigured()) return null;
  const s = createAdminClient();
  const [resR, htR] = await Promise.all([
    s.from("reservations")
      .select("tent_main, tent_extra, setup_date, teardown_date, event_date, status, expires_at, heating, tent:tents!tent_id(size,has_back_door), tent2:tents!tent_id_2(size,has_back_door)")
      .in("status", ["TEMPORARY", "CONFIRMED"]),
    s.from("equipment").select("quantity").eq("code", "HT-01").maybeSingle(),
  ]);
  const rows = (resR.data ?? []) as unknown as {
    tent_main: string | null; tent_extra: string | null;
    setup_date: string | null; teardown_date: string | null; event_date: string | null;
    status: string; expires_at: string | null; heating: boolean | null;
    tent: { size: string | null; has_back_door: boolean } | null;
    tent2: { size: string | null; has_back_door: boolean } | null;
  }[];
  const heatingTotal = htR.data ? num((htR.data as { quantity: unknown }).quantity) : 0;

  const nowIso = new Date().toISOString();
  const days: Record<string, { large: number; small: number; backdoor: number; gastro: number; heating: number }> = {};
  const ensure = (d: string) => (days[d] ??= { large: 0, small: 0, backdoor: 0, gastro: 0, heating: 0 });

  for (const r of rows) {
    if (r.status === "TEMPORARY" && r.expires_at && r.expires_at < nowIso) continue; // wygasła blokada nie zajmuje
    const start0 = r.setup_date ?? r.event_date;
    if (!start0) continue;
    const end0 = r.teardown_date ?? r.event_date ?? start0;
    const sd = String(start0).slice(0, 10);
    const ed = String(end0).slice(0, 10);
    const start = sd < from ? from : sd;
    const end = ed > to ? to : ed;
    if (start > end) continue;
    const c1 = (r.tent_main as TentChoice) || (r.tent ? choiceFromTent(r.tent.size, r.tent.has_back_door) : "");
    const c2 = (r.tent_extra as TentChoice) || (r.tent2 ? choiceFromTent(r.tent2.size, r.tent2.has_back_door) : "");
    const slots = sumSlots([c1, c2]);
    for (const d of eachDay(start, end)) {
      const e = ensure(d);
      e.large += slots.large; e.small += slots.small; e.backdoor += slots.backdoor; e.gastro += slots.gastro;
      if (r.heating) e.heating += 1;
    }
  }
  return { capacity: DEFAULT_TENT_CAPACITIES, heating_total: heatingTotal, days };
}

export interface PublicInquiryInput {
  line?: string;              // "ICLUB" | "RENTAL"
  eventDate?: string;         // YYYY-MM-DD
  location?: string;
  guests?: number;
  tentMain?: string;          // M | D | D_BACKDOOR
  tentExtra?: string | null;
  package?: string;           // STANDARD | PREMIUM | VIP
  addons?: { code?: string; name?: string; qty?: number }[];
  rentalItems?: { code?: string; name?: string; qty?: number }[];
  rentalDays?: number;
  heating?: boolean;
  eventStartTime?: string;
  selfPickup?: boolean;
  estimate?: { value?: number; transport?: number; deposit?: number; remaining?: number };
  contact?: { name?: string; phone?: string; email?: string };
  message?: string;
}

const zl = (n: number | undefined) => (n == null ? "—" : `${Math.round(n * 100) / 100} zł`);

// Przyjmij konfigurację z konfiguratora → utwórz lead (inquiry, źródło „Formularz strony").
export async function createPublicInquiry(input: PublicInquiryInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!isServiceRoleConfigured()) return { ok: false, error: "Brak konfiguracji serwera." };
  const c = input.contact ?? {};
  if (!c.name?.trim() && !c.phone?.trim() && !c.email?.trim()) {
    return { ok: false, error: "Podaj dane kontaktowe (imię, telefon lub e-mail)." };
  }
  const s = createAdminClient();

  const isRental = input.line === "RENTAL";
  const items = isRental ? (input.rentalItems ?? []) : (input.addons ?? []);
  const itemsStr = items.map((a) => `${a.name ?? a.code}${(a.qty ?? 1) > 1 ? ` ×${a.qty}` : ""}`).filter(Boolean).join(", ");
  const tents = [input.tentMain, input.tentExtra].filter(Boolean).join(" + ");
  const eventType = isRental
    ? `Wypożyczalnia${input.rentalDays ? ` · ${input.rentalDays} dób` : ""}`
    : `iClub${input.package ? ` · ${input.package}` : ""}${tents ? ` · ${tents}` : ""}`;

  // Pełne podsumowanie w notatce (gwarantowana kolumna) — obsługa widzi całość leada.
  const notes = [
    "ZGŁOSZENIE Z KONFIGURATORA",
    `Kontakt: ${[c.name, c.phone, c.email].filter(Boolean).join(" · ") || "—"}`,
    `Linia: ${isRental ? "Wypożyczalnia" : "iClub"}`,
    input.eventDate && `Data: ${input.eventDate}`,
    input.eventStartTime && `Start imprezy: ${input.eventStartTime}`,
    input.location && `Lokalizacja: ${input.location}`,
    input.guests != null && `Goście: ${input.guests}`,
    !isRental && tents && `Namiot: ${tents}`,
    !isRental && input.package && `Pakiet: ${input.package}`,
    input.heating && "Ogrzewanie: tak",
    isRental && input.rentalDays != null && `Liczba dób: ${input.rentalDays}`,
    itemsStr && `${isRental ? "Sprzęt" : "Dodatki"}: ${itemsStr}`,
    input.selfPickup && "Odbiór własny: tak",
    input.estimate && `Wycena konfiguratora: wartość ${zl(input.estimate.value)}, transport ${zl(input.estimate.transport)}, zaliczka ${zl(input.estimate.deposit)}, pozostało ${zl(input.estimate.remaining)}`,
    input.message?.trim() && `Wiadomość: ${input.message.trim()}`,
    "(Wycena orientacyjna — do potwierdzenia; bez wiążącej rezerwacji.)",
  ].filter(Boolean).join("\n");

  const { data, error } = await s.from("inquiries").insert({
    source: "WEBSITE_FORM",
    status: "NEW",
    contact_name: c.name?.trim() || null,     // §konfigurator: klient widoczny na liście (nie tylko w notatce)
    contact_email: c.email?.trim() || null,
    event_type: eventType,
    event_date: input.eventDate || null,
    location: input.location || null,
    guests: input.guests ?? null,
    tent_interest: tents || null,
    package_interest: input.package || null,
    addons_note: itemsStr || null,
    notes,
  }).select("id").single();

  if (error) return { ok: false, error: error.message };

  sendPushToOwners({
    title: "Nowe zgłoszenie z konfiguratora",
    body: `${c.name?.trim() || "Klient"} — ${eventType}`,
    url: "/inquiries",
    tag: "configurator-lead",
  }).catch(() => {});

  // Wpis w panelu powiadomień (per szef) — inaczej lead jest tylko w push, nie na liście.
  try {
    const owners = await listOwnerUserIds();
    if (owners.length) {
      await s.from("notifications").insert(owners.map((oid) => ({
        recipient: oid,
        title: "Nowe zgłoszenie z konfiguratora",
        body: `${c.name?.trim() || "Klient"} — ${eventType}`,
        type: "INQUIRY",
      })));
    }
  } catch { /* panel opcjonalny — nie blokuje leada */ }

  return { ok: true, id: (data as { id: string }).id };
}
