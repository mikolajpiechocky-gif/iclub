// app/(app)/customers/page.tsx — Lista klientów (RSC, dane z Supabase lub demo).
import Link from "next/link";
import { PageHeader } from "@/components/layout";
import { PrimaryButton, EmptyState, Pill } from "@/components/ui";
import { listCustomers } from "@/lib/data/customers";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { CUSTOMER_TYPE_LABELS } from "@/lib/data/types";

export const dynamic = "force-dynamic";

const typePill = (type: "PRIVATE" | "COMPANY") =>
  type === "COMPANY"
    ? { label: CUSTOMER_TYPE_LABELS.COMPANY, fg: "#b98cf5", bg: "#271b3f" }
    : { label: CUSTOMER_TYPE_LABELS.PRIVATE, fg: "#7fa8f5", bg: "#182238" };

export default async function CustomersPage() {
  const customers = await listCustomers();
  const demo = !isSupabaseConfigured();

  return (
    <div className="mx-auto max-w-[1280px] px-5 py-6 md:px-8">
      <PageHeader
        title="Klienci"
        subtitle={`${customers.length} ${customers.length === 1 ? "klient" : "klientów"} w bazie`}
        actions={
          <Link href="/customers/new">
            <PrimaryButton icon="plus">Dodaj klienta</PrimaryButton>
          </Link>
        }
      />

      {demo && (
        <div className="mb-4 flex items-center gap-2 rounded-card border border-[#3d3216] bg-[#241e10] px-4 py-3 text-[12.5px] text-warn">
          Tryb demo — dane przykładowe. Po skonfigurowaniu Supabase lista pokaże prawdziwych klientów.
        </div>
      )}

      {customers.length === 0 ? (
        <EmptyState
          icon="users"
          title="Brak klientów"
          desc="Dodaj pierwszego klienta, aby zacząć."
          action={
            <Link href="/customers/new">
              <PrimaryButton icon="plus">Dodaj klienta</PrimaryButton>
            </Link>
          }
        />
      ) : (
        <>
          {/* DESKTOP: tabela */}
          <div className="hidden overflow-hidden rounded-card border border-border bg-surface md:block">
            <table className="w-full text-left">
              <thead className="border-b border-border bg-[#12131a] text-[11px] font-bold uppercase tracking-[0.5px] text-muted">
                <tr>
                  {["Nazwa", "Typ", "Telefon", "E-mail", "Miejscowość", ""].map((h, i) => (
                    <th key={i} className="px-4 py-3 font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => {
                  const p = typePill(c.type);
                  return (
                    <tr key={c.id} className="border-b border-border-soft last:border-0 hover:bg-surface-2">
                      <td className="px-4 py-3"><Link href={`/customers/${c.id}/edit`} className="text-[13.5px] font-bold text-ink">{c.name}</Link></td>
                      <td className="px-4 py-3"><Pill label={p.label} fg={p.fg} bg={p.bg} /></td>
                      <td className="px-4 py-3 text-[13px] text-ink-2">{c.phone || "—"}</td>
                      <td className="px-4 py-3 text-[13px] text-ink-2">{c.email || "—"}</td>
                      <td className="px-4 py-3 text-[13px] text-ink-2">{c.city || "—"}</td>
                      <td className="px-4 py-3 text-right"><Link href={`/customers/${c.id}/edit`} className="text-[12.5px] font-semibold">Edytuj →</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* MOBILE: karty */}
          <div className="flex flex-col gap-3 md:hidden">
            {customers.map((c) => {
              const p = typePill(c.type);
              return (
                <Link key={c.id} href={`/customers/${c.id}/edit`} className="rounded-card border border-border bg-surface p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-[14.5px] font-bold text-ink">{c.name}</div>
                    <Pill label={p.label} fg={p.fg} bg={p.bg} />
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-ink-2">
                    {c.phone && <span>📞 {c.phone}</span>}
                    {c.email && <span>✉ {c.email}</span>}
                    {c.city && <span>📍 {c.city}</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
