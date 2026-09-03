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
// wyciągamy SAMĄ miejscowość z adresu, odrzucając ulicę i kod pocztowy:
//  - „05-500 Piaseczno" → „Piaseczno" (miasto po kodzie),
//  - „Rusiec 97-438" → „Rusiec" (kod po nazwie — usuwamy kod),
//  - „Rusiec, ul. Kwiatowa 5" → „Rusiec" (segment bez cech ulicy),
//  - „Kliny 18" → „Kliny" (ostatecznie: obcinamy numer/prefiks ulicy).
export function cityFrom(location: string | null, customerCity: string | null): string {
  const cc = customerCity?.trim();
  if (cc) return cc;
  const raw = location?.trim();
  if (!raw) return "";
  // 1) „NN-NNN Miasto" → Miasto (miasto zapisane PO kodzie pocztowym)
  const afterPc = raw.match(/\d{2}-\d{3}\s+([^,]+)/);
  if (afterPc) return afterPc[1].trim();
  // 2) usuń kod pocztowy i rozbij na segmenty; wybierz ostatni segment bez cech ulicy (prefiks/numer)
  const parts = raw.replace(/\d{2}-\d{3}/g, "").split(",").map((s) => s.trim()).filter(Boolean);
  const looksLikeStreet = (s: string) => /^(ul|al|pl|os)\.?\s/i.test(s) || /\d/.test(s);
  const cityLike = [...parts].reverse().find((s) => !looksLikeStreet(s));
  if (cityLike) return cityLike;
  // 3) fallback: oczyść najlepszy segment z prefiksu ulicy i numeru domu
  const seg = parts[parts.length - 1] || raw;
  return seg.replace(/^(ul|al|pl|os)\.?\s+/i, "").replace(/\s*\d+[a-z]?(\/\d+[a-z]?)?\s*$/i, "").trim() || seg;
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
