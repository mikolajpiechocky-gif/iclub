// Skład pakietu do umowy (§3.1), gdy pakiet nie ma rozpisanych pozycji w `package_items`.
// Źródłem jest opis pakietu (`packages.description`), który jest KUMULATYWNY:
//   STANDARD: „Namiot iClub, montaż, oświetlenie LED, laser, dym, serwis, nagłośnienie."
//   PREMIUM:  „Standard + parkiet ze sztucznej trawy, laser animacyjny, 50 pałeczek fluo."
//   VIP:      „Premium + 100 pałeczek fluo, oświetlenie UV, strefa VIP, karaoke."
// Rozwijamy odwołania „<Pakiet> + …" rekurencyjnie i składamy pełną, płaską listę pozycji.

export interface PackageDesc { code: string | null; name: string | null; description: string | null }

const stripList = (s: string): string[] =>
  s.replace(/\.\s*$/, "").split(/[,;••]/).map((x) => x.trim()).filter(Boolean);

// Dedup po treści bez liczb: „50 pałeczek fluo" i „100 pałeczek fluo" to ta sama pozycja — zostaje
// OSTATNIA (wyższy pakiet nadpisuje niższy, czyli „100" wygrywa). Inne pozycje zostają bez zmian.
function dedupeByNumberless(items: string[]): string[] {
  const keyOf = (s: string) => s.toLowerCase().replace(/\d+/g, "").replace(/\s+/g, " ").trim();
  const idx = new Map<string, number>();
  const out: string[] = [];
  for (const it of items) {
    const k = keyOf(it);
    const at = idx.get(k);
    if (at != null) out[at] = it;
    else { idx.set(k, out.length); out.push(it); }
  }
  return out;
}

// Płaska lista pozycji pakietu, rozwijając kumulatywny opis („<Pakiet> + …").
export function expandPackageContents(target: PackageDesc, all: PackageDesc[], depth = 0): string[] {
  const desc = (target.description ?? "").trim();
  if (!desc || depth > 5) return desc ? stripList(desc) : [];
  const m = desc.match(/^\s*([\p{L}]+)\s*\+\s*([\s\S]+)$/u); // „Premium + reszta…"
  if (m) {
    const parentKey = m[1].trim().toLowerCase();
    const parent = all.find((p) => (p.name ?? "").trim().toLowerCase() === parentKey || (p.code ?? "").trim().toLowerCase() === parentKey);
    const parentItems = parent && parent !== target ? expandPackageContents(parent, all, depth + 1) : [];
    return dedupeByNumberless([...parentItems, ...stripList(m[2])]);
  }
  return dedupeByNumberless(stripList(desc));
}
