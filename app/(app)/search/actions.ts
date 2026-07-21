"use server";
// Server Action dla podpowiedzi na żywo (nagłówkowa wyszukiwarka). Zwraca płaską,
// lekką listę sugestii (grupa + tytuł + podtytuł + link).
import { searchEverything } from "@/lib/data/search";

export interface SearchSuggestion {
  href: string;
  title: string;
  subtitle: string;
  group: string;
}

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "short" }) : "";

const PER_GROUP = 5;

export async function searchAction(query: string): Promise<SearchSuggestion[]> {
  const r = await searchEverything(query);
  const out: SearchSuggestion[] = [];

  for (const x of r.reservations.slice(0, PER_GROUP)) {
    out.push({
      href: `/reservations/${x.id}`,
      title: x.customer?.name ?? x.event_type ?? "Rezerwacja",
      subtitle: [fmtDate(x.event_date), x.location, x.event_type].filter(Boolean).join(" · "),
      group: "Rezerwacja",
    });
  }
  for (const c of r.customers.slice(0, PER_GROUP)) {
    out.push({
      href: `/customers/${c.id}/edit`,
      title: c.name,
      subtitle: [c.phone, c.city, c.email].filter(Boolean).join(" · "),
      group: "Klient",
    });
  }
  for (const t of r.tents.slice(0, PER_GROUP)) {
    out.push({
      href: "/inventory",
      title: t.name,
      subtitle: [t.size, t.set_color, t.code].filter(Boolean).join(" · "),
      group: "Namiot",
    });
  }
  for (const e of r.equipment.slice(0, PER_GROUP)) {
    out.push({
      href: `/inventory/${e.id}/edit`,
      title: e.name,
      subtitle: [e.code, e.category, `${e.quantity} szt.`].filter(Boolean).join(" · "),
      group: "Magazyn",
    });
  }
  return out;
}
