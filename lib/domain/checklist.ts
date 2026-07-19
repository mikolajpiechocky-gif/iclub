// Reguły domenowe: generowanie checklisty pakowania (§17) z konfiguracji
// zlecenia (namiot, pakiet, dodatki). Nie zaszyte w komponentach UI.

export interface ChecklistTemplateItem {
  category: string;
  label: string;
  qty?: string;
  required: boolean;
}

export function buildChecklistTemplate(opts: {
  tentName?: string | null;
  packageName?: string | null;
  addonNames?: string[];
}): ChecklistTemplateItem[] {
  const tent = opts.tentName ?? "Namiot";
  const pkg = (opts.packageName ?? "").toLowerCase();
  const addons = opts.addonNames ?? [];
  const items: ChecklistTemplateItem[] = [];

  // Magazyn — podstawa
  items.push({ category: "Magazyn", label: `${tent} — poszycie`, qty: "1 szt.", required: true });
  items.push({ category: "Magazyn", label: "Dmuchawa + wąż", qty: "1 szt.", required: true });
  items.push({ category: "Magazyn", label: "Kotwy i obciążniki", qty: "8 szt.", required: true });

  // Załadunek — nagłośnienie i światło (zawsze iClub)
  items.push({ category: "Załadunek", label: "Kolumny aktywne", qty: "2 szt.", required: false });
  items.push({ category: "Załadunek", label: "Głowice LED + statyw", qty: "4 szt.", required: false });
  items.push({ category: "Załadunek", label: "Kable i zasilanie", required: true });
  items.push({ category: "Załadunek", label: "Zabezpieczenie w transporcie", required: true });

  // Efekty — Premium / VIP
  if (pkg.includes("premium") || pkg.includes("vip")) {
    items.push({ category: "Sprzęt dodatkowy", label: "Wytwornica dymu + płyn", qty: "1 szt.", required: false });
    items.push({ category: "Sprzęt dodatkowy", label: "Laser animacyjny", qty: "1 szt.", required: false });
  }
  if (pkg.includes("vip")) {
    items.push({ category: "Sprzęt dodatkowy", label: "Oświetlenie UV", qty: "1 kpl.", required: false });
  }

  // Dodatki — z konfiguracji rezerwacji
  for (const a of addons) {
    items.push({ category: "Dodatki", label: a, required: false });
  }

  // Dokumenty
  items.push({ category: "Dokumenty", label: "Umowa i dokumenty", required: true });

  return items;
}

export const CHECKLIST_CATEGORY_ORDER = [
  "Magazyn", "Załadunek", "Sprzęt dodatkowy", "Dodatki", "Dokumenty",
];
