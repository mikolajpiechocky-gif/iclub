// Publiczne API pod konfigurator na stronie (bez sesji użytkownika → service_role).
// Na tym etapie: odczyt cennika (na żywo z systemu) + przyjęcie zgłoszenia jako lead
// („Formularz strony"). BEZ płatności i bez wiążącej rezerwacji — obsługa potwierdza ręcznie.
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { TRANSPORT_BRACKETS } from "@/lib/domain/transport";
import { DEFAULT_DEPOSIT_BASE } from "@/lib/domain/order-pricing";
import { DEFAULT_TENT_CAPACITIES } from "@/lib/domain/tents";
import { sendPushToOwners } from "@/lib/integrations/push";

const num = (v: unknown): number => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

// Cennik na żywo: pakiety (cena mały/duży + montaż), dodatki, wypożyczalnia, transport, stałe.
export async function getPublicPricing() {
  if (!isServiceRoleConfigured()) return null;
  const s = createAdminClient();
  const [pk, ad, eq] = await Promise.all([
    s.from("packages").select("code, name, description, base_price, price_small, price_big, assembly_minutes, sort").eq("active", true).order("sort"),
    s.from("addons").select("code, name, price, sort").eq("active", true).order("sort"),
    s.from("equipment").select("code, name, category, quantity, rental_price, unit, is_addon").eq("active", true).eq("is_rentable", true).order("category"),
  ]);
  return {
    currency: "PLN",
    packages: ((pk.data ?? []) as Record<string, unknown>[]).map((p) => ({
      code: p.code, name: p.name, description: p.description,
      price_small: num(p.price_small) || num(p.base_price),
      price_big: num(p.price_big) || num(p.base_price),
      assembly_minutes: num(p.assembly_minutes),
    })),
    addons: ((ad.data ?? []) as Record<string, unknown>[]).map((a) => ({ code: a.code, name: a.name, price: num(a.price) })),
    rental: ((eq.data ?? []) as Record<string, unknown>[]).map((e) => ({
      code: e.code, name: e.name, category: e.category, quantity: num(e.quantity),
      rate_per_day: num(e.rental_price), unit: e.unit, is_addon: Boolean(e.is_addon),
    })),
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

  return { ok: true, id: (data as { id: string }).id };
}
