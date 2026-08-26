import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  SUPPLIER_PARTNERS,
  emptySupplierPartnerProgress,
  type SupplierPartnerProgress,
} from "@/lib/supplier-partners/catalog";

export const SUPPLIER_PARTNER_NOTES_PREFIX = "supplier_partner_v2:";

type GoalRow = {
  id: string;
  details: string | null;
  updated_at: string;
};

type StoredSupplierPartnerProgress = {
  slug: string;
  progress: SupplierPartnerProgress;
};

export function parseSupplierPartnerProgress(details: string | null): StoredSupplierPartnerProgress | null {
  if (!details?.startsWith(SUPPLIER_PARTNER_NOTES_PREFIX)) return null;
  try {
    const parsed = JSON.parse(details.slice(SUPPLIER_PARTNER_NOTES_PREFIX.length)) as StoredSupplierPartnerProgress;
    if (!parsed.slug || !parsed.progress) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function serializeSupplierPartnerProgress(slug: string, progress: SupplierPartnerProgress) {
  return `${SUPPLIER_PARTNER_NOTES_PREFIX}${JSON.stringify({ slug, progress })}`;
}

export async function loadSupplierPartnerProgress(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("manager_goals")
    .select("id, details, updated_at")
    .eq("assignee", "carlos")
    .like("details", `${SUPPLIER_PARTNER_NOTES_PREFIX}%`);

  if (error) throw new Error(`Unable to load supplier progress: ${error.message}`);

  const stored = new Map<string, { row: GoalRow; progress: SupplierPartnerProgress }>();
  for (const row of (data || []) as GoalRow[]) {
    const parsed = parseSupplierPartnerProgress(row.details);
    if (parsed) stored.set(parsed.slug, { row, progress: parsed.progress });
  }

  return Object.fromEntries(
    SUPPLIER_PARTNERS.map((partner) => {
      const storedProgress = stored.get(partner.slug);
      return [
        partner.slug,
        storedProgress
          ? {
              ...emptySupplierPartnerProgress(partner),
              ...storedProgress.progress,
              updatedAt: storedProgress.row.updated_at || storedProgress.progress.updatedAt,
            }
          : emptySupplierPartnerProgress(partner),
      ];
    }),
  ) as Record<string, SupplierPartnerProgress>;
}

export async function saveSupplierPartnerProgress(
  supabase: SupabaseClient,
  userId: string,
  slug: string,
  progress: SupplierPartnerProgress,
) {
  const partner = SUPPLIER_PARTNERS.find((item) => item.slug === slug);
  if (!partner) throw new Error("Supplier was not found.");

  const title = `Carlos supplier partnership · ${partner.company}`;
  const { data: existing, error: readError } = await supabase
    .from("manager_goals")
    .select("id")
    .eq("assignee", "carlos")
    .eq("title", title)
    .maybeSingle();

  if (readError) throw new Error(`Unable to read supplier progress: ${readError.message}`);

  const payload = {
    assignee: "carlos" as const,
    title,
    details: serializeSupplierPartnerProgress(slug, progress),
    status: progress.status === "Set up" || progress.status === "Not a fit" ? "completed" : "open",
  };

  const result = existing
    ? await supabase.from("manager_goals").update(payload).eq("id", existing.id)
    : await supabase.from("manager_goals").insert({ ...payload, created_by: userId });

  if (result.error) throw new Error(`Unable to save supplier progress: ${result.error.message}`);
}
