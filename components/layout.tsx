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
import { UserMenu } from "./auth/user-menu";
import type { StatusKey } from "@/lib/types";
import type { ProfileRecord } from "@/lib/data/types";

/* Konfiguracja nawigacji — pełna dla sidebar desktop, pogrupowana. */
const NAV_GROUPS: { group: string; tint: string; ownerOnly?: boolean; items: { href: string; label: string; icon: IconName; badge?: string; ownerOnly?: boolean }[] }[] = [
  { group: "Główne", tint: "#14b8c4", items: [
    { href: "/dashboard", label: "Pulpit", icon: "home" },
    { href: "/calendar", label: "Kalendarz", icon: "calendar" },
    { href: "/notifications", label: "Powiadomienia", icon: "inbox" },
  ]},
  { group: "Sprzedaż", tint: "#7c3aed", items: [
    { href: "/inquiries", label: "Zapytania", icon: "inbox" },
    { href: "/reservations", label: "Rezerwacje", icon: "bookmark" },
    { href: "/field", label: "Realizacje", icon: "truck" },
  ]},
  { group: "Zasoby", tint: "#3b82f6", items: [
    { href: "/customers", label: "Klienci", icon: "users" },
    { href: "/inventory", label: "Magazyn", icon: "box" },
    { href: "/employees", label: "Pracownicy", icon: "users" },
    { href: "/availability", label: "Dostępność", icon: "calendar" },
    { href: "/vehicles", label: "Flota", icon: "truck" },
  ]},
  { group: "Finanse", tint: "#22c55e", ownerOnly: true, items: [
    { href: "/costs", label: "Koszty", icon: "coins" },
    { href: "/payments", label: "Płatności", icon: "card" },
    { href: "/reports", label: "Raporty", icon: "chart" },
  ]},
  { group: "System", tint: "#64748b", items: [
    { href: "/media", label: "Zgłoszenia i szkody", icon: "camera" },
    { href: "/service", label: "Serwis", icon: "refresh" },
    { href: "/settings", label: "Ustawienia", icon: "gear", ownerOnly: true },
  ]},
];

/* Dolna nawigacja mobile — 5 kluczowych pozycji. */
const BOTTOM_NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/me", label: "Start", icon: "home" },
  { href: "/calendar", label: "Kalendarz", icon: "calendar" },
  { href: "/field", label: "Realizacje", icon: "truck" },
  { href: "/inventory", label: "Magazyn", icon: "box" },
  { href: "/more", label: "Więcej", icon: "more" },
];

function isActive(pathname: string, href: string) {
  if (href.includes("#")) return false; // kotwice (#) nie oznaczają aktywnej strony
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

/* ---------------------- AppSidebar (desktop) -------------------------- */
export function AppSidebar({ profile, unread = 0 }: { profile: ProfileRecord | null; unread?: number }) {
  const pathname = usePathname();
  const isOwner = profile?.role === "OWNER";
  const groups = NAV_GROUPS.filter((g) => !g.ownerOnly || isOwner);
  return (
    <aside className="hidden w-[230px] flex-none flex-col overflow-y-auto border-r border-[#1b1d27] bg-panel px-3 pb-6 md:flex">
      <Link href="/dashboard" className="mt-5 mb-3 flex items-center px-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-iclub.png" alt="iClub" className="h-10 w-auto" />
      </Link>
      {groups.map((g) => {
        const items = g.items.filter((it) => !it.ownerOnly || isOwner);
        if (items.length === 0) return null;
        return (
        <div key={g.group}>
          <div className="mt-4 mb-2 px-2.5 text-[10px] font-bold uppercase tracking-[1.2px] text-[#4a4f60]">{g.group}</div>
          {items.map((it) => {
            const active = isActive(pathname, it.href);
            const badge = it.href === "/notifications" ? (unread > 0 ? String(unread) : undefined) : it.badge;
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`mb-0.5 flex items-center gap-2.5 rounded-[10px] px-2 py-1.5 text-[13.5px] font-semibold transition ${active ? "bg-brand text-white" : "text-[#d3d7e1] hover:bg-surface"}`}
              >
                <span
                  className="flex h-7 w-7 flex-none items-center justify-center rounded-[9px] text-white"
                  style={{ background: active ? "rgba(255,255,255,0.22)" : g.tint }}
                >
                  <Icon name={it.icon} className="h-[15px] w-[15px]" />
                </span>
                <span className="flex-1">{it.label}</span>
                {badge && <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1.5 text-[10.5px] font-bold text-white">{badge}</span>}
              </Link>
            );
          })}
        </div>
        );
      })}
      <UserMenu profile={profile} />
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
export function AppShell({ children, profile, unread = 0 }: { children: ReactNode; profile: ProfileRecord | null; unread?: number }) {
  return (
    <div className="flex min-h-screen bg-workspace">
      <AppSidebar profile={profile} unread={unread} />
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
