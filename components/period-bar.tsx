// §20 Pasek nawigacji okresu (miesiąc / rok / wszystko) dla kosztów i płatności.
// Server component — same linki, zachowuje aktywne filtry w query.
import Link from "next/link";
import { Icon } from "@/components/icons";
import { type Period, periodParam, periodLabel, shiftMonth } from "@/lib/domain/period";

export function PeriodBar({ basePath, period, extraParams = {} }: { basePath: string; period: Period; extraParams?: Record<string, string> }) {
  const now = new Date();
  const build = (pParam: string) => {
    const sp = new URLSearchParams({ ...extraParams, period: pParam });
    return `${basePath}?${sp.toString()}`;
  };
  const thisMonthParam = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const isThisMonth = period.kind === "month" && periodParam(period) === thisMonthParam;
  const isYear = period.kind === "year";
  const isAll = period.kind === "all";

  const chip = (label: string, href: string, active: boolean) => (
    <Link href={href} className={`rounded-[9px] border px-2.5 py-1.5 text-[12px] font-semibold ${active ? "border-accent bg-[#271017] text-accent-soft" : "border-border bg-surface text-ink-2"}`}>{label}</Link>
  );

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5">
        <Link href={build(periodParam(shiftMonth(period, -1, now)))} aria-label="Poprzedni miesiąc" className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-border bg-surface text-ink-2">
          <Icon name="chevron-left" className="h-4 w-4" />
        </Link>
        <span className="min-w-[132px] text-center text-[13px] font-bold text-ink">{periodLabel(period)}</span>
        <Link href={build(periodParam(shiftMonth(period, 1, now)))} aria-label="Następny miesiąc" className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-border bg-surface text-ink-2">
          <Icon name="chevron-right" className="h-4 w-4" />
        </Link>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {chip("Ten miesiąc", build(thisMonthParam), isThisMonth)}
        {chip(`Rok ${now.getFullYear()}`, build(String(now.getFullYear())), isYear)}
        {chip("Wszystko", build("all"), isAll)}
      </div>
    </div>
  );
}
