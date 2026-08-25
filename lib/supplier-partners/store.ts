import "server-only";

import {
  SUPPLIER_PARTNERS,
  emptySupplierPartnerProgress,
  type SupplierPartnerProgress,
} from "@/lib/supplier-partners/catalog";
import { createAdminClient } from "@/lib/supabase/admin";

const SOURCE_PREFIX = "supplier-partnership:";
const NOTES_PREFIX = "supplier_partner_v1:";

type TaskRow = {
  source_item_key: string | null;
  notes: string | null;
  updated_at: string;
};

export function supplierPartnerTaskKey(slug: string) {
  return `${SOURCE_PREFIX}${slug}`;
}

export function parseSupplierPartnerProgress(notes: string | null): SupplierPartnerProgress | null {
  if (!notes?.startsWith(NOTES_PREFIX)) return null;
  try {
    return JSON.parse(notes.slice(NOTES_PREFIX.length)) as SupplierPartnerProgress;
  } catch {
    return null;
  }
}

export function serializeSupplierPartnerProgress(progress: SupplierPartnerProgress) {
  return `${NOTES_PREFIX}${JSON.stringify(progress)}`;
}

export async function loadSupplierPartnerProgress() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("aura_tasks")
    .select("source_item_key, notes, updated_at")
    .like("source_item_key", `${SOURCE_PREFIX}%`);

  if (error) throw new Error(`Unable to load supplier progress: ${error.message}`);

  const stored = new Map<string, TaskRow>();
  for (const row of (data || []) as TaskRow[]) {
    if (row.source_item_key) stored.set(row.source_item_key.slice(SOURCE_PREFIX.length), row);
  }

  return Object.fromEntries(
    SUPPLIER_PARTNERS.map((partner) => {
      const row = stored.get(partner.slug);
      const parsed = parseSupplierPartnerProgress(row?.notes || null);
      return [
        partner.slug,
        parsed
          ? { ...emptySupplierPartnerProgress(partner), ...parsed, updatedAt: row?.updated_at || parsed.updatedAt }
          : emptySupplierPartnerProgress(partner),
      ];
    }),
  ) as Record<string, SupplierPartnerProgress>;
}

export async function saveSupplierPartnerProgress(slug: string, progress: SupplierPartnerProgress) {
  const supabase = createAdminClient();
  const sourceItemKey = supplierPartnerTaskKey(slug);
  const { data: existing, error: readError } = await supabase
    .from("aura_tasks")
    .select("id")
    .eq("source_item_key", sourceItemKey)
    .maybeSingle();

  if (readError) throw new Error(`Unable to read supplier progress: ${readError.message}`);

  const partner = SUPPLIER_PARTNERS.find((item) => item.slug === slug);
  if (!partner) throw new Error("Supplier was not found.");

  const payload = {
    title: `Carlos supplier partnership · ${partner.company}`,
    notes: serializeSupplierPartnerProgress(progress),
    due_at: progress.followUpDate ? new Date(`${progress.followUpDate}T14:00:00.000Z`).toISOString() : null,
    priority: progress.status === "Follow-up" ? "high" : "normal",
    status: progress.status === "Set up" || progress.status === "Not a fit" ? "done" : "open",
    source_item_key: sourceItemKey,
  };

  const result = existing
    ? await supabase.from("aura_tasks").update(payload).eq("id", existing.id)
    : await supabase.from("aura_tasks").insert(payload);

  if (result.error) throw new Error(`Unable to save supplier progress: ${result.error.message}`);
}
