"use server";
// Server Actions: namioty w magazynie (§17). §II.2 Dodawanie/edycja dostępne dla
// każdego zalogowanego pracownika (spójne z RLS tents_write).
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createTent, updateTent, getTent, type TentInput } from "@/lib/data/resources";
import type { TentStatus } from "@/lib/data/types";

export interface TentFormValues {
  code: string;
  name: string;
  size: string;
  has_back_door: boolean;
  status: TentStatus;
  notes: string;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  id?: string;
}

const DEMO = "Tryb demo: skonfiguruj Supabase, aby zapisywać namioty (docs/SUPABASE_SETUP.md).";
const clean = (s: string) => (s.trim() ? s.trim() : null);

function genCode(name: string): string {
  const base = name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 8) || "NAMIOT";
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase();
  return `${base}-${suffix}`;
}

function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/duplicate key|23505|unique/i.test(msg)) return "Namiot o tym kodzie już istnieje — podaj inny kod.";
  if (/row-level security|permission|policy/i.test(msg)) return "Brak uprawnień do zapisu namiotu — uruchom migrację 0051 (RLS namiotów).";
  return msg;
}

function validate(v: TentFormValues): Record<string, string> {
  const e: Record<string, string> = {};
  if (!v.name.trim()) e.name = "Podaj nazwę namiotu.";
  return e;
}

function toInput(v: TentFormValues): TentInput {
  return {
    code: v.code.trim(),
    name: v.name.trim(),
    size: clean(v.size),
    set_color: null, // §II.1 logika kolorów zestawów usunięta
    has_back_door: v.has_back_door,
    status: v.status,
    notes: clean(v.notes),
  };
}

export async function createTentAction(v: TentFormValues): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  const fieldErrors = validate(v);
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };
  try {
    const input = toInput(v);
    if (!input.code) input.code = genCode(v.name);
    const { id } = await createTent(input);
    revalidatePath("/inventory");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
}

export async function updateTentAction(id: string, v: TentFormValues): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  const fieldErrors = validate(v);
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };
  try {
    const input = toInput(v);
    if (!input.code) {
      const before = await getTent(id);
      input.code = before?.code || genCode(v.name);
    }
    await updateTent(id, input);
    revalidatePath("/inventory");
    revalidatePath(`/inventory/tents/${id}/edit`);
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
}
