// §II.3 Generowanie checklisty pakowania dla zlecenia. Wspólne dla akcji „Wygeneruj/Przegeneruj"
// oraz automatycznego tworzenia przy potwierdzeniu realizacji.
import { getJob } from "./jobs";
import { listAddons } from "./resources";
import { generateChecklist, listChecklistItems } from "./checklist";
import { buildChecklistTemplate, type ChecklistTemplateItem } from "@/lib/domain/checklist";
import { getEventWeather } from "@/lib/integrations/weather";

export async function generateChecklistForJob(jobId: string, opts: { onlyIfEmpty?: boolean } = {}): Promise<void> {
  if (opts.onlyIfEmpty) {
    const existing = await listChecklistItems(jobId);
    if (existing.length > 0) return; // nie nadpisujemy odhaczonej checklisty
  }
  const [job, addons] = await Promise.all([getJob(jobId), listAddons()]);
  const r = job?.reservation;

  // §wypożyczalnia Checklista = konkretne itemy z magazynu (dodatki z ilościami). Bez namiotu,
  // pakietów i katalogu iClub — wprowadzamy dokładnie to, co klient wypożyczył.
  if (job?.business_line === "EQUIPMENT_RENTAL") {
    const items: ChecklistTemplateItem[] = [];
    for (const id of r?.addon_ids ?? []) {
      const a = addons.find((x) => x.id === id);
      if (!a) continue;
      const q = r?.addon_qty?.[id] ?? 1;
      items.push({ category: "Do wydania", label: a.name, qty: `${q} szt.`, required: true });
    }
    await generateChecklist(jobId, items);
    return;
  }

  const addonNames = (r?.addon_ids ?? [])
    .map((id) => addons.find((a) => a.id === id)?.name)
    .filter((n): n is string => Boolean(n));
  if (r?.heating) addonNames.push("Nagrzewnica HT-01");
  try {
    if (r?.location && r?.event_date) {
      const w = await getEventWeather(r.location, r.event_date);
      if (w?.warnings.some((x) => x.kind === "heat")) addonNames.push("Wentylacja / wentylator");
    }
  } catch { /* pogoda opcjonalna */ }
  const template = buildChecklistTemplate({ tentName: r?.tent?.name, packageName: r?.package?.name, addonNames, skipGrass: r?.skip_grass ?? false });
  await generateChecklist(jobId, template);
}
