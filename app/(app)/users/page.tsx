// app/(app)/users/page.tsx — Zarządzanie użytkownikami (role, imiona). Tylko OWNER.
import { PageHeader } from "@/components/layout";
import { Alert } from "@/components/ui";
import { getCurrentProfile } from "@/lib/data/profiles";
import { listUsers } from "@/lib/data/users";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isServiceRoleConfigured, createAdminClient } from "@/lib/supabase/admin";
import { UsersManager } from "./users-manager";
import { InviteUser } from "./invite-user";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const profile = await getCurrentProfile();
  if (profile && profile.role !== "OWNER") {
    return (
      <div className="mx-auto max-w-[820px] px-5 py-6 md:px-8">
        <PageHeader title="Użytkownicy" subtitle="Dostępne dla szefa" />
        <Alert tone="info" title="Brak dostępu">Zarządzanie użytkownikami i rolami dostępne jest tylko dla szefa.</Alert>
      </div>
    );
  }

  const users = await listUsers();
  const demo = !isSupabaseConfigured();
  const canAdmin = !demo && isServiceRoleConfigured();

  // E-maile pobieramy z Auth (service_role) — w profiles ich nie ma.
  const emails: Record<string, string> = {};
  if (canAdmin) {
    try {
      const admin = createAdminClient();
      const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
      for (const u of data?.users ?? []) if (u.email) emails[u.id] = u.email;
    } catch {}
  }
  const usersWithEmail = users.map((u) => ({ ...u, email: emails[u.id] ?? "" }));

  return (
    <div className="mx-auto max-w-[820px] px-5 py-6 md:px-8">
      <PageHeader title="Użytkownicy" subtitle={`${users.length} ${users.length === 1 ? "osoba" : "osób"} · role i dostęp`} />
      {demo && (
        <div className="mb-4">
          <Alert tone="info" title="Tryb demo">Widzisz dane przykładowe. Po skonfigurowaniu Supabase zmiany będą zapisywane.</Alert>
        </div>
      )}
      <UsersManager users={usersWithEmail} currentUserId={profile?.id ?? null} disabled={demo} canAdmin={canAdmin} />

      <div className="mt-4">
        <InviteUser canInvite={!demo && isServiceRoleConfigured()} />
      </div>
    </div>
  );
}
