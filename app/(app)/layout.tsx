// app/(app)/layout.tsx — wspólny shell (sidebar + dolna nawigacja) dla całej aplikacji.
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout";
import { getCurrentProfile } from "@/lib/data/profiles";

export default async function AppGroupLayout({ children }: { children: ReactNode }) {
  const profile = await getCurrentProfile();
  return <AppShell profile={profile}>{children}</AppShell>;
}
