"use client";
// =====================================================================
// iClub Management — layout aplikacji: sidebar (desktop), dolna nawigacja
// (mobile), nagłówek strony, karta zlecenia. Responsywność mobile-first:
//   - < md : dolna nawigacja + treść jednokolumnowa
//   - ≥ md : boczny sidebar + szersza treść
// =====================================================================

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Icon, type IconName } from "./icons";
import { StatusBadge } from "./ui";
import type { StatusKey } from "@/lib/types";

/* Konfiguracja nawigacji — pełna dla sidebar desktop, pogrupowana. */
const NAV_GROUPS: { group: string; items: { href: string; label: string; icon: IconName; badge?: string }[] }[] = [
  { group: "Główne", items: [
    { href: "/dashboard", label: "Pulpit", icon: "home" },
    { href: "/calendar", label: "Kalendarz", icon: "calendar" },
  ]},
  { group: "Sprzedaż", items: [
    { href: "/inquiries", label: "Zapytania", icon: "inbox", badge: "5" },
    { href: "/reservations/new", label: "Rezerwacje", icon: "bookmark" },
    { href: "/jobs/1042", label: "Zlecenia", icon: "clipboard" },
    { href: "/field/1042", label: "Realizacje", icon: "truck" },
  ]},
  { group: "Zasoby", items: [
    { href: "/inventory", label: "Magazyn", icon: "box" },
    { href: "/conflicts", label: "Konflikty", icon: "warning" },
    { href: "/inventory#gear", label: "Sprzęt", icon: "cube" },
  ]},
  { group: "Finanse", items: [
    { href: "/costs/new", label: "Koszty", icon: "coins", badge: "3" },
    { href: "/payments", label: "Płatności", icon: "card" },
    { href: "/dashboard#raporty", label: "Raporty", icon: "chart" },
  ]},
  { group: "System", items: [
    { href: "/media", label: "Zdjęcia i szkody", icon: "camera" },
    { href: "/dashboard#dokumenty", label: "Dokumenty", icon: "doc" },
    { href: "/dashboard#ustawienia", label: "Ustawienia", icon: "gear" },
  ]},
];

/* Dolna nawigacja mobile — 5 kluczowych pozycji. */
const BOTTOM_NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/me", label: "Start", icon: "home" },
  { href: "/calendar", label: "Kalendarz", icon: "calendar" },
  { href: "/field/1042", label: "Realizacje", icon: "truck" },
  { href: "/inventory", label: "Magazyn", icon: "box" },
  { href: "/more", label: "Więcej", icon: "more" },
];

function isActive(pathname: string, href: string) {
  const base = href.split("#")[0];
  if (base === "/dashboard") return pathname === "/dashboard" || pathname === "/";
  return pathname === base || pathname.startsWith(base + "/");
}

/* ---------------------- AppSidebar (desktop) -------------------------- */
export function AppSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-[230px] flex-none flex-col overflow-y-auto border-r border-[#1b1d27] bg-panel px-3 pb-6 md:flex">
      <Link href="/dashboard" className="mt-4 mb-2 flex items-center gap-2.5 px-2">
        <span className="bg-brand flex h-9 w-9 items-center justify-center rounded-[11px] font-display text-lg font-bold text-white shadow-[0_6px_20px_rgba(225,29,116,0.45)]">i</span>
        <span className="font-display text-[17px] font-bold text-white">iClub</span>
      </Link>
      {NAV_GROUPS.map((g) => (
        <div key={g.group}>
          <div className="mt-4 mb-2 px-2.5 text-[10px] font-bold uppercase tracking-[1.2px] text-[#4a4f60]">{g.group}</div>
          {g.items.map((it) => {
            const active = isActive(pathname, it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`mb-0.5 flex items-center gap-3 rounded-[10px] px-2.5 py-2.5 text-[13.5px] font-semibold transition ${active ? "bg-brand text-white" : "text-ink-2 hover:bg-surface"}`}
              >
                <Icon name={it.icon} className="h-[18px] w-[18px] flex-none" />
                <span className="flex-1">{it.label}</span>
                {it.badge && <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1.5 text-[10.5px] font-bold text-white">{it.badge}</span>}
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
}

/* ---------------------- MobileBottomNavigation ------------------------ */
export function MobileBottomNavigation() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[#17181f] bg-panel px-2 pt-2 pb-3.5 md:hidden" aria-label="Nawigacja główna">
      {BOTTOM_NAV.map((it) => {
        const active = isActive(pathname, it.href);
        return (
          <Link key={it.href} href={it.href} className="flex flex-1 flex-col items-center gap-1 py-1.5">
            <span className={`flex h-8 w-full max-w-[54px] items-center justify-center rounded-[10px] ${active ? "bg-brand text-white" : "text-muted"}`}>
              <Icon name={it.icon} className="h-[18px] w-[18px]" />
            </span>
            <span className="text-[10px] font-bold" style={{ color: active ? "#fff" : "var(--color-muted)" }}>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/* ---------------------- AppShell -------------------------------------- */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-workspace">
      <AppSidebar />
      <main className="min-w-0 flex-1 pb-24 md:pb-0">{children}</main>
      <MobileBottomNavigation />
    </div>
  );
}

/* ---------------------- PageHeader ------------------------------------ */
export function PageHeader({ title, subtitle, actions, back }: { title: string; subtitle?: string; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {back && (
          <Link href={back.href} className="mb-1 inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink-2">
            <Icon name="chevron-left" className="h-3.5 w-3.5" />{back.label}
          </Link>
        )}
        <h1 className="font-display text-2xl font-bold tracking-[-0.5px] text-white sm:text-[26px]">{title}</h1>
        {subtitle && <div className="mt-1.5 text-[13px] font-medium text-ink-2">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
    </header>
  );
}

/* ---------------------- JobCard --------------------------------------- */
export function JobCard({ href, day, time, client, place, tent, team, status }: { href: string; day: string; time: string; client: string; place: string; tent: string; team: string; status: StatusKey }) {
  return (
    <Link href={href} className="flex items-center gap-3.5 rounded-[13px] px-3.5 py-3 transition hover:bg-surface-2">
      <div className="w-14 flex-none text-center">
        <div className="font-display text-[14px] font-bold text-accent-soft">{day}</div>
        <div className="text-[12px] font-bold text-ink">{time}</div>
      </div>
      <div className="h-9 w-px flex-none bg-border" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-bold text-ink">{client}</div>
        <div className="mt-0.5 truncate text-[12px] font-medium text-ink-2">{place} · {tent} · {team}</div>
      </div>
      <StatusBadge status={status} className="flex-none" />
    </Link>
  );
}
