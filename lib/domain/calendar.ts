// Reguły tytułów kalendarza (§53). Współdzielone przez synchronizację do Google
// Calendar i widok kalendarza w aplikacji — żeby format był identyczny:
//  - iClub: "{M/D/MD/DD} {Pakiet} - {Miejscowość}"
//  - Wypożyczalnia: nazwa sprzętu albo "Wynajem sprzętu" (kilka pozycji).

// M (mały) gdy największy wymiar < 6 m; D (duży) gdy ≥ 6 m. (5,4×5,4 → M, 6×8 → D)
export function tentSizeCode(size: string | null): "M" | "D" {
  if (!size) return "M";
  const nums = size.split(/[×x]/i).map((s) => parseFloat(s.replace(",", ".").trim())).filter((n) => !Number.isNaN(n));
  return (nums.length ? Math.max(...nums) : 0) >= 6 ? "D" : "M";
}

// Kod z 1–2 namiotów: małe przed dużymi → M, D, MD, DD, MM.
export function tentsCode(sizes: (string | null)[]): string {
  const codes = sizes.filter((s): s is string => Boolean(s)).map(tentSizeCode);
  codes.sort((a, b) => (a === b ? 0 : a === "M" ? -1 : 1));
  return codes.join("");
}

// Miejscowość do tytułu kalendarza. Priorytet: miasto klienta (pole „city"). Gdy brak —
// wyciągamy miasto z adresu: segment po kodzie pocztowym „NN-NNN Miasto", inaczej drugi
// segment (zwykle miasto po ulicy), a w ostateczności pierwszy. NIE bierzemy już ulicy
// (dawniej split(",")[0] dawał ulicę zamiast miejscowości).
export function cityFrom(location: string | null, customerCity: string | null): string {
  const cc = customerCity?.trim();
  if (cc) return cc;
  const loc = location?.trim();
  if (!loc) return "";
  const parts = loc.split(",").map((s) => s.trim()).filter(Boolean);
  for (const p of parts) {
    const m = p.match(/\d{2}-\d{3}\s+(.+)/); // „05-500 Piaseczno" → „Piaseczno"
    if (m) return m[1].trim();
  }
  return (parts[1] || parts[0] || loc).trim();
}

export interface CalendarTitleInput {
  businessLine: string;
  tentSizes: (string | null)[];
  packageName: string | null;
  location: string | null;
  customerCity: string | null;
  customerName: string | null;
  rentalItems: string | null;
}

export function reservationCalendarTitle(o: CalendarTitleInput): string {
  if (o.businessLine === "ICLUB") {
    const code = tentsCode(o.tentSizes);
    const city = cityFrom(o.location, o.customerCity);
    const head = [code, o.packageName].filter(Boolean).join(" ");
    return [head, city].filter(Boolean).join(" - ") || o.customerName || "Rezerwacja iClub";
  }
  const items = (o.rentalItems ?? "").trim();
  return !items || items.includes(",") ? "Wynajem sprzętu" : items;
}
