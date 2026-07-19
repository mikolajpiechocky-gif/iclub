"use server";
// Server Actions modułu Klienci: walidacja + zapis przez warstwę danych.
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createCustomer, updateCustomer, type CustomerInput } from "@/lib/data/customers";
import type { CustomerType } from "@/lib/data/types";

export interface CustomerFormValues {
  type: CustomerType;
  name: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  tax_id: string;
  notes: string;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  id?: string;
}

const DEMO_MSG =
  "Tryb demo: aby zapisywać klientów, skonfiguruj Supabase (patrz docs/SUPABASE_SETUP.md).";

function validate(v: CustomerFormValues): Record<string, string> {
  const e: Record<string, string> = {};
  if (!v.name.trim()) {
    e.name = v.type === "COMPANY" ? "Podaj nazwę firmy." : "Podaj imię i nazwisko.";
  }
  if (v.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email.trim())) {
    e.email = "Nieprawidłowy adres e-mail.";
  }
  return e;
}

function toInput(v: CustomerFormValues): CustomerInput {
  const clean = (s: string) => {
    const t = s.trim();
    return t ? t : null;
  };
  return {
    type: v.type,
    name: v.name.trim(),
    phone: clean(v.phone),
    email: clean(v.email),
    city: clean(v.city),
    address: clean(v.address),
    tax_id: clean(v.tax_id),
    notes: clean(v.notes),
  };
}

export async function createCustomerAction(values: CustomerFormValues): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO_MSG };
  const fieldErrors = validate(values);
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };
  try {
    const { id } = await createCustomer(toInput(values));
    revalidatePath("/customers");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zapisać klienta." };
  }
}

export async function updateCustomerAction(id: string, values: CustomerFormValues): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO_MSG };
  const fieldErrors = validate(values);
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };
  try {
    await updateCustomer(id, toInput(values));
    revalidatePath("/customers");
    revalidatePath(`/customers/${id}/edit`);
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zapisać zmian." };
  }
}
