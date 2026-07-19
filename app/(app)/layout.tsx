// app/(app)/layout.tsx — wspólny shell (sidebar + dolna nawigacja) dla całej aplikacji.
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout";
import { getCurrentProfile } from "@/lib/data/profiles";
import { unreadCount } from "@/lib/data/notifications";

export default async function AppGroupLayout({ children }: { children: ReactNode }) {
  const [profile, unread] = await Promise.all([getCurrentProfile(), unreadCount()]);
  return <AppShell profile={profile} unread={unread}>{children}</AppShell>;
}
