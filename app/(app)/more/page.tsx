"use client";
// app/(app)/more/page.tsx — Mobilne menu „Więcej” (pozycje spoza dolnej nawigacji).
import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";

const LINKS: { href: string; label: string; icon: IconName }[] = [
  { href: "/notifications", label: "Powiadomienia", icon: "inbox" },
  { href: "/customers", label: "Klienci", icon: "users" },
  { href: "/inquiries", label: "Zapytania", icon: "inbox" },
  { href: "/reservations", label: "Rezerwacje", icon: "bookmark" },
  { href: "/planner", label: "Planer tras", icon: "navigation" },
  { href: "/availability", label: "Dostępność", icon: "calendar" },
  { href: "/employees", label: "Pracownicy", icon: "users" },
  { href: "/vehicles", label: "Flota", icon: "truck" },
  { href: "/pricing", label: "Cennik", icon: "doc" },
  { href: "/costs", label: "Koszty", icon: "coins" },
  { href: "/payments", label: "Płatności", icon: "card" },
  { href: "/reports", label: "Raporty", icon: "chart" },
  { href: "/media", label: "Zgłoszenia i szkody", icon: "camera" },
  { href: "/service", label: "Serwis", icon: "refresh" },
  { href: "/settings", label: "Ustawienia", icon: "gear" },
];

export default function MorePage() {
  return (
    <div className="mx-auto max-w-md px-4 py-4">
      <h1 className="mb-4 font-display text-[22px] font-bold text-white">Więcej</h1>
      <div className="overflow-hidden rounded-card border border-border bg-surface">
        {LINKS.map((l, i) => (
          <Link key={l.href} href={l.href} className={`flex items-center gap-3 px-4 py-3.5 ${i > 0 ? "border-t border-border-soft" : ""}`}>
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-surface-2 text-ink-2"><Icon name={l.icon} className="h-4.5 w-4.5" /></span>
            <span className="flex-1 text-[14px] font-semibold text-ink">{l.label}</span>
            <Icon name="chevron-right" className="h-4 w-4 text-ink-2" />
          </Link>
        ))}
      </div>
    </div>
  );
}
