"use client";
// §20 Filtr listy jako <select> nawigujący po query (zachowuje pozostałe parametry).
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function FilterSelect({ name, allLabel, options }: { name: string; allLabel: string; options: { value: string; label: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get(name) ?? "";

  const onChange = (value: string) => {
    const sp = new URLSearchParams(params.toString());
    if (value) sp.set(name, value);
    else sp.delete(name);
    router.push(`${pathname}?${sp.toString()}`);
  };

  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-[10px] border border-border bg-surface-2 px-3 py-2 text-[12.5px] font-semibold text-ink outline-none focus:border-accent"
    >
      <option value="">{allLabel}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
