"use server"

import { requireStaffProfile } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { finalizedRouteSourceError, requestRouteSnapshot } from "@/lib/finalized-procurement-route"
import type { ReviewableMaterialItem } from "@/lib/client-material-review"
import type { QuoteComparisonItemRecord } from "@/lib/quote-comparison"
import { revalidatePath } from "next/cache"

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export async function finalizeProductChoicesAction(input: { comparisonId: string; expectedDraftRevision: number; expectedSourceFingerprint: string; idempotencyKey: string }) {
  const { supabase, user } = await requireStaffProfile("suppliers")
  if (!input || !uuid.test(input.comparisonId || "") || !uuid.test(input.idempotencyKey || "") || !Number.isSafeInteger(input.expectedDraftRevision) || input.expectedDraftRevision < 0 || !/^[a-f0-9]{64}$/.test(input.expectedSourceFingerprint || "")) return { ok: false as const, error: "Reload your saved product choices before finalizing." }
  const { data: comparison, error } = await supabase.from("quote_comparisons").select("id,request_id").eq("id", input.comparisonId).maybeSingle<{ id: string; request_id: string | null }>()
  if (error || !comparison) return { ok: false as const, error: "Comparison unavailable." }
  const [items, originals] = await Promise.all([
    supabase.from("quote_comparison_items").select("*").eq("comparison_id", comparison.id).returns<QuoteComparisonItemRecord[]>(),
    comparison.request_id ? supabase.from("quote_request_items").select("id,name,department,quantity,unit,metadata,qualification_status").eq("request_id", comparison.request_id).returns<ReviewableMaterialItem[]>() : Promise.resolve({ data: [] as ReviewableMaterialItem[], error: null }),
  ])
  if (items.error || originals.error) return { ok: false as const, error: "Could not verify current request products." }
  if (comparison.request_id) {
    const sourceError = finalizedRouteSourceError(originals.data ?? [], items.data ?? [])
    if (sourceError) return { ok: false as const, error: sourceError }
  }
  const { data, error: finalizeError } = await createAdminClient().rpc("staff_finalize_quote_comparison_route", {
    p_comparison_id: comparison.id, p_actor_id: user.id, p_expected_revision: input.expectedDraftRevision,
    p_source_fingerprint: input.expectedSourceFingerprint, p_idempotency_key: input.idempotencyKey,
    p_expected_request_items: requestRouteSnapshot(originals.data ?? []),
  })
  if (finalizeError || !data?.ok) return { ok: false as const, error: "Route not finalized. Review changed prices, product matches and supplier delivery/tax, then retry." }
  revalidatePath(`/admin/quote-comparison/${comparison.id}`)
  if (comparison.request_id) revalidatePath(`/owner/materials/requests/${comparison.request_id}`)
  return { ok: true as const, routeId: String(data.routeId), alreadyFinalized: Boolean(data.alreadyFinalized) }
}
