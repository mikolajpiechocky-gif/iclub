// app/(app)/more/page.tsx — Mobilne menu „Więcej” (pozycje spoza dolnej nawigacji).
// Pracownik widzi tylko dozwolone pozycje; reszta jest ownerOnly.
import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import { LogoutButton } from "@/components/auth/logout-button";
import { getCurrentProfile } from "@/lib/data/profiles";

export const dynamic = "force-dynamic";

const LINKS: { href: string; label: string; icon: IconName; ownerOnly?: boolean }[] = [
  { href: "/notifications", label: "Powiadomienia", icon: "inbox" },
  { href: "/customers", label: "Klienci", icon: "users" },
  { href: "/inquiries", label: "Zapytania", icon: "inbox", ownerOnly: true },
  { href: "/reservations", label: "Rezerwacje", icon: "bookmark" },
  { href: "/pricing", label: "Cennik", icon: "doc" },
  { href: "/media", label: "Zgłoszenia i szkody", icon: "camera" },
  { href: "/planner", label: "Planer tras", icon: "navigation", ownerOnly: true },
  { href: "/employees", label: "Pracownicy", icon: "users", ownerOnly: true },
  { href: "/vehicles", label: "Flota", icon: "truck", ownerOnly: true },
  { href: "/costs", label: "Koszty", icon: "coins", ownerOnly: true },
  { href: "/payments", label: "Płatności", icon: "card", ownerOnly: true },
  { href: "/reports", label: "Raporty", icon: "chart", ownerOnly: true },
  { href: "/service", label: "Serwis", icon: "refresh", ownerOnly: true },
  { href: "/users", label: "Użytkownicy", icon: "users", ownerOnly: true },
  { href: "/settings", label: "Ustawienia", icon: "gear", ownerOnly: true },
];

export default async function MorePage() {
  const profile = await getCurrentProfile();
  const isOwner = profile?.role === "OWNER";
  const links = LINKS.filter((l) => !l.ownerOnly || isOwner);

  return (
    <div className="mx-auto max-w-md px-4 py-4">
      <h1 className="mb-4 font-display text-[22px] font-bold text-white">Więcej</h1>
      <div className="overflow-hidden rounded-card border border-border bg-surface">
        {links.map((l, i) => (
          <Link key={l.href} href={l.href} className={`flex items-center gap-3 px-4 py-3.5 ${i > 0 ? "border-t border-border-soft" : ""}`}>
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-surface-2 text-ink-2"><Icon name={l.icon} className="h-4.5 w-4.5" /></span>
            <span className="flex-1 text-[14px] font-semibold text-ink">{l.label}</span>
            <Icon name="chevron-right" className="h-4 w-4 text-ink-2" />
          </Link>
        ))}
      </div>
      <LogoutButton className="mt-4 flex w-full items-center justify-center rounded-card border border-border bg-surface px-4 py-3.5 text-[14px] font-bold text-bad disabled:opacity-50" />
    </div>
  );
}
