"use client";
// =====================================================================
// iClub Management — layout aplikacji: sidebar (desktop), dolna nawigacja
// (mobile), nagłówek strony, karta zlecenia. Responsywność mobile-first:
//   - < md : dolna nawigacja + treść jednokolumnowa
//   - ≥ md : boczny sidebar + szersza treść
// =====================================================================

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Icon, type IconName } from "./icons";
import { StatusBadge } from "./ui";
import { UserMenu } from "./auth/user-menu";
import { PullToRefresh } from "./pull-to-refresh";
import { HeaderBell } from "./header-bell";
import type { StatusKey } from "@/lib/types";
import type { ProfileRecord } from "@/lib/data/types";

/* Konfiguracja nawigacji — pełna dla sidebar desktop, pogrupowana. */
const NAV_GROUPS: { group: string; tint: string; ownerOnly?: boolean; items: { href: string; label: string; icon: IconName; badge?: string; ownerOnly?: boolean }[] }[] = [
  { group: "Główne", tint: "#14b8c4", items: [
    { href: "/dashboard", label: "Pulpit", icon: "home", ownerOnly: true },
    { href: "/calendar", label: "Kalendarz", icon: "calendar" },
    { href: "/planner", label: "Planer tras", icon: "navigation", ownerOnly: true },
  ]},
  { group: "Sprzedaż", tint: "#7c3aed", items: [
    { href: "/inquiries", label: "Zapytania", icon: "inbox", ownerOnly: true },
    { href: "/reservations", label: "Rezerwacje", icon: "bookmark" },
    { href: "/field", label: "Realizacje", icon: "truck" },
    { href: "/adverts", label: "Ogłoszenia OLX", icon: "tag", ownerOnly: true },
  ]},
  { group: "Zasoby", tint: "#3b82f6", items: [
    { href: "/customers", label: "Klienci", icon: "users" },
    { href: "/inventory", label: "Magazyn", icon: "box" },
    { href: "/employees", label: "Pracownicy", icon: "users", ownerOnly: true },
    { href: "/vehicles", label: "Flota", icon: "truck", ownerOnly: true },
  ]},
  { group: "Finanse", tint: "#22c55e", items: [
    { href: "/pricing", label: "Cennik", icon: "doc" },
    { href: "/costs", label: "Koszty", icon: "coins", ownerOnly: true },
    { href: "/payments", label: "Płatności", icon: "card", ownerOnly: true },
    { href: "/reports", label: "Raporty", icon: "chart", ownerOnly: true },
  ]},
  { group: "System", tint: "#64748b", items: [
    { href: "/media", label: "Zgłoszenia i szkody", icon: "camera" },
    { href: "/service", label: "Serwis", icon: "refresh", ownerOnly: true },
    { href: "/users", label: "Użytkownicy", icon: "users", ownerOnly: true },
    { href: "/settings", label: "Ustawienia", icon: "gear", ownerOnly: true },
  ]},
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

/* ---------------------- MobileDrawer (menu z boku) -------------------- */
// Menu boczne dla mobile: ikona (hamburger) w nagłówku + szuflada wysuwana z lewej.
// Otwierana gestem (swipe od lewej krawędzi) i zamykana swipe w lewo / tapnięciem tła.
export function MobileDrawer({ profile }: { profile: ProfileRecord | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isOwner = profile?.role === "OWNER";
  const groups = NAV_GROUPS.filter((g) => !g.ownerOnly || isOwner);
  const homeHref = isOwner ? "/dashboard" : "/me";

  // Zamknij przy zmianie ekranu (np. przycisk wstecz / nawigacja programowa; linki i tak zamykają od razu).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setOpen(false); }, [pathname]);

  // Gest: otwórz przeciągnięciem od lewej krawędzi, zamknij przeciągnięciem w lewo.
  useEffect(() => {
    let startX = 0, startY = 0, tracking = false;
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      startX = t.clientX; startY = t.clientY;
      tracking = open || startX < 24; // otwieranie tylko od lewej krawędzi
    };
    const onMove = (e: TouchEvent) => {
      if (!tracking) return;
      const t = e.touches[0];
      const dx = t.clientX - startX, dy = t.clientY - startY;
      if (Math.abs(dy) > Math.abs(dx) + 8) { tracking = false; return; } // pionowy scroll — nie reaguj
      if (!open && dx > 60) { setOpen(true); tracking = false; }
      else if (open && dx < -60) { setOpen(false); tracking = false; }
    };
    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    return () => { document.removeEventListener("touchstart", onStart); document.removeEventListener("touchmove", onMove); };
  }, [open]);

  const linkCls = (href: string, tint: string) => {
    const active = isActive(pathname, href);
    return { active, tint };
  };

  return (
    <>
      {/* Ikona menu — tylko mobile, w nagłówku */}
      <button type="button" onClick={() => setOpen(true)} aria-label="Menu" className="flex h-10 w-10 flex-none items-center justify-center rounded-field border border-border bg-surface-2 text-ink-2 transition hover:text-ink md:hidden">
        <Icon name="menu" className="h-5 w-5" />
      </button>

      {/* Nakładka + szuflada (mobile) */}
      <div className={`fixed inset-0 z-[60] md:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
        <div onClick={() => setOpen(false)} className={`absolute inset-0 bg-black/55 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`} />
        <aside className={`absolute inset-y-0 left-0 flex w-[272px] max-w-[82vw] flex-col overflow-y-auto bg-panel px-3 pb-6 shadow-2xl transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="mt-4 mb-2 flex items-center justify-between px-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-iclub.png" alt="iClub" className="h-9 w-auto" />
            <button type="button" onClick={() => setOpen(false)} aria-label="Zamknij menu" className="flex h-9 w-9 items-center justify-center rounded-field text-ink-2 hover:text-ink"><Icon name="x" className="h-5 w-5" /></button>
          </div>

          <Link href={homeHref} onClick={() => setOpen(false)} className={`mb-1 flex items-center gap-2.5 rounded-[10px] px-2 py-2 text-[14px] font-semibold ${isActive(pathname, homeHref) ? "bg-brand text-white" : "text-[#d3d7e1] hover:bg-surface"}`}>
            <span className="flex h-7 w-7 flex-none items-center justify-center rounded-[9px] bg-[#14b8c4] text-white"><Icon name="home" className="h-[15px] w-[15px]" /></span>
            <span className="flex-1">Start</span>
          </Link>

          {groups.map((g) => {
            const items = g.items.filter((it) => !it.ownerOnly || isOwner);
            if (items.length === 0) return null;
            return (
              <div key={g.group}>
                <div className="mt-3 mb-1.5 px-2.5 text-[10px] font-bold uppercase tracking-[1.2px] text-[#4a4f60]">{g.group}</div>
                {items.map((it) => {
                  const { active } = linkCls(it.href, g.tint);
                  return (
                    <Link key={it.href} href={it.href} onClick={() => setOpen(false)} className={`mb-0.5 flex items-center gap-2.5 rounded-[10px] px-2 py-2 text-[14px] font-semibold transition ${active ? "bg-brand text-white" : "text-[#d3d7e1] hover:bg-surface"}`}>
                      <span className="flex h-7 w-7 flex-none items-center justify-center rounded-[9px] text-white" style={{ background: active ? "rgba(255,255,255,0.22)" : g.tint }}>
                        <Icon name={it.icon} className="h-[15px] w-[15px]" />
                      </span>
                      <span className="flex-1">{it.label}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}

          <div className="mt-auto border-t border-border pt-3"><UserMenu profile={profile} /></div>
        </aside>
      </div>
    </>
  );
}

/* ---------------------- AppShell -------------------------------------- */
export function AppShell({ children, profile, unread = 0 }: { children: ReactNode; profile: ProfileRecord | null; unread?: number }) {
  return (
    <div className="flex min-h-screen bg-workspace">
      <PullToRefresh />
      <AppSidebar profile={profile} unread={unread} />
      <main className="min-w-0 flex-1 pb-6 md:pb-0">
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-[#1b1d27] bg-panel px-4 py-2.5 md:px-8">
          <MobileDrawer profile={profile} />
          <div className="ml-auto"><HeaderBell unread={unread} /></div>
        </div>
        {children}
      </main>
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
