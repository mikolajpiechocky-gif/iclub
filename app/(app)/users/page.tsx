// app/(app)/users/page.tsx — Zarządzanie użytkownikami (role, imiona). Tylko OWNER.
import { PageHeader } from "@/components/layout";
import { Alert } from "@/components/ui";
import { getCurrentProfile } from "@/lib/data/profiles";
import { listUsers } from "@/lib/data/users";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isServiceRoleConfigured } from "@/lib/supabase/admin";
import { UsersManager } from "./users-manager";
import { InviteUser } from "./invite-user";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const profile = await getCurrentProfile();
  if (profile && profile.role !== "OWNER") {
    return (
      <div className="mx-auto max-w-[820px] px-5 py-6 md:px-8">
        <PageHeader title="Użytkownicy" subtitle="Dostępne dla właściciela" />
        <Alert tone="info" title="Brak dostępu">Zarządzanie użytkownikami i rolami dostępne jest tylko dla właściciela.</Alert>
      </div>
    );
  }

  const users = await listUsers();
  const demo = !isSupabaseConfigured();

  return (
    <div className="mx-auto max-w-[820px] px-5 py-6 md:px-8">
      <PageHeader title="Użytkownicy" subtitle={`${users.length} ${users.length === 1 ? "osoba" : "osób"} · role i dostęp`} />
      {demo && (
        <div className="mb-4">
          <Alert tone="info" title="Tryb demo">Widzisz dane przykładowe. Po skonfigurowaniu Supabase zmiany będą zapisywane.</Alert>
        </div>
      )}
      <UsersManager users={users} currentUserId={profile?.id ?? null} disabled={demo} />

      <div className="mt-4">
        <InviteUser canInvite={!demo && isServiceRoleConfigured()} />
      </div>
    </div>
  );
}
