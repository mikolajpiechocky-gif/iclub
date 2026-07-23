// Reguły domenowe: generowanie checklisty pakowania (§17) z konfiguracji zlecenia.
// Sekcje tematyczne; pozycje otagowane pakietem i włączane KUMULACYJNIE:
// Standard = tier 1; Premium = tier ≤ 2 (Standard + Premium); VIP = wszystko (tier ≤ 3).
// „Dodatki" są w każdym pakiecie. Ogrzewanie/wentylacja NIE są tu na stałe:
// wentylacja dopina się z alertu temperatury, ogrzewanie z opcji rezerwacji (nagrzewnica).

export interface ChecklistTemplateItem {
  category: string;
  label: string;
  qty?: string;
  required: boolean;
}

type Tier = 1 | 2 | 3; // 1 = Standard, 2 = Premium, 3 = VIP

interface CatalogItem { category: string; label: string; qty?: string; required?: boolean; tier: Tier }

// {TENT} zostaje podmienione na nazwę namiotu z rezerwacji.
const CATALOG: CatalogItem[] = [
  // — Namiot (baza) —
  { category: "Namiot", label: "{TENT} — poszycie", qty: "1 szt.", required: true, tier: 1 },
  { category: "Namiot", label: "Dmuchawa + zapasowa", required: true, tier: 1 },
  { category: "Namiot", label: "Przedłużacz do dmuchawy", required: true, tier: 1 },
  { category: "Namiot", label: "Kotwy / worki z piaskiem", required: true, tier: 1 },
  { category: "Namiot", label: "Logo", tier: 1 },

  // — Nagłośnienie —
  { category: "Nagłośnienie", label: "Kolumny", tier: 1 },
  { category: "Nagłośnienie", label: "Zasilanie kolumn", tier: 1 },
  { category: "Nagłośnienie", label: "Mikser / odbiornik BT", tier: 1 },
  { category: "Nagłośnienie", label: "Zasilacz miksera (5V) / odbiornika BT", tier: 1 },
  { category: "Nagłośnienie", label: "Kable: mikser/odbiornik ↔ kolumny", tier: 1 },
  { category: "Nagłośnienie", label: "Kabel kolumny Yamaha jack/jack", tier: 1 },
  { category: "Nagłośnienie", label: "Przedłużacze do nagłośnienia", tier: 1 },
  { category: "Nagłośnienie", label: "Mikrofony + kable", tier: 3 },

  // — Oświetlenie i efekty —
  { category: "Oświetlenie i efekty", label: "Laser RGB (mały) + zasilacz 12V", tier: 1 },
  { category: "Oświetlenie i efekty", label: "Kula LED", qty: "2 szt.", tier: 1 },
  { category: "Oświetlenie i efekty", label: "Wytwornica dymu + zapasowa", tier: 1 },
  { category: "Oświetlenie i efekty", label: "Sterownik do wytwornicy + zapas", tier: 1 },
  { category: "Oświetlenie i efekty", label: "Płyn do wytwornicy", tier: 1 },
  { category: "Oświetlenie i efekty", label: "Lampa LED + pilot", tier: 1 },
  { category: "Oświetlenie i efekty", label: "Trójnik", tier: 1 },
  { category: "Oświetlenie i efekty", label: "Laser animacyjny + zasilacz", tier: 2 },
  { category: "Oświetlenie i efekty", label: "Oświetlenie UV", tier: 3 },

  // — Wystrój / wyposażenie —
  { category: "Wystrój / wyposażenie", label: "Stolik koktajlowy (do dużego namiotu)", tier: 1 },
  { category: "Wystrój / wyposażenie", label: "Sztuczna trawa", tier: 2 },
  { category: "Wystrój / wyposażenie", label: "Pałeczki fluo", qty: "50 szt.", tier: 2 },
  { category: "Wystrój / wyposażenie", label: "Czerwony dywan", tier: 3 },
  { category: "Wystrój / wyposażenie", label: "Słupki + liny", tier: 3 },
  { category: "Wystrój / wyposażenie", label: "Stoliki koktajlowe", tier: 3 },
  { category: "Wystrój / wyposażenie", label: "Pokrowce do stolików", tier: 3 },

  // — Dodatki (każdy pakiet) —
  { category: "Dodatki", label: "Szmatka + woda", tier: 1 },
  { category: "Dodatki", label: "Materac + koc + poduszka", tier: 1 },
  { category: "Dodatki", label: "Skrzynka z narzędziami", tier: 1 },
  { category: "Dodatki", label: "Szampan", tier: 1 },
];

function packageTier(packageName?: string | null): Tier {
  const p = (packageName ?? "").toLowerCase();
  if (p.includes("vip")) return 3;
  if (p.includes("premium")) return 2;
  return 1;
}

export function buildChecklistTemplate(opts: {
  tentName?: string | null;
  packageName?: string | null;
  addonNames?: string[];
}): ChecklistTemplateItem[] {
  const tent = opts.tentName ?? "Namiot";
  const tier = packageTier(opts.packageName);
  const addons = opts.addonNames ?? [];

  const items: ChecklistTemplateItem[] = CATALOG
    .filter((c) => c.tier <= tier)
    .map((c) => ({ category: c.category, label: c.label.replace("{TENT}", tent), qty: c.qty, required: Boolean(c.required) }));

  // Dodatki z rezerwacji (zamówione przez klienta / dopięte automatycznie, np. nagrzewnica).
  for (const a of addons) items.push({ category: "Dodatki", label: a, required: false });

  // Dokumenty na koniec.
  items.push({ category: "Dokumenty", label: "Umowa i dokumenty", required: true });

  return items;
}

export const CHECKLIST_CATEGORY_ORDER = [
  "Namiot", "Nagłośnienie", "Oświetlenie i efekty", "Wystrój / wyposażenie", "Dodatki", "Dokumenty",
];
