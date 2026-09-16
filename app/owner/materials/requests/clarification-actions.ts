"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import { requireStaffProfile } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { itemEditSnapshot } from "@/lib/request-item-continuity"
import { clarificationMetadata } from "@/lib/material-list-clarifications"
import type { ReviewableMaterialItem } from "@/lib/client-material-review"
import { requestItemRevision } from "@/lib/request-item-revision"

export async function saveMaterialClarifications(input: { requestId: string; itemId: string; revision: string; answers: Record<string, string> }) {
  const uuid = /^[0-9a-f-]{36}$/i
  if (!input || !uuid.test(input.requestId) || !uuid.test(input.itemId) || !/^[a-f0-9]{64}$/.test(input.revision) || !input.answers || Array.isArray(input.answers) || typeof input.answers !== "object" || Object.keys(input.answers).length > 6) return { ok: false as const, error: "Invalid answers. Refresh and try again." }
  const { supabase, user } = await requireStaffProfile("customers")
  const { data: item } = await supabase.from("quote_request_items").select("id,name,department,quantity,unit,metadata,qualification_status").eq("request_id", input.requestId).eq("id", input.itemId).maybeSingle<ReviewableMaterialItem>()
  if (!item || item.metadata?.ai_organized === true || item.metadata?.source_item_id) return { ok: false as const, error: "Select the original list, not a supplier quote or organized product." }
  if (requestItemRevision(item, null) !== input.revision) return { ok: false as const, error: "The original changed. Reload it before answering; nothing was overwritten." }
  let metadata: Record<string, unknown>
  try { metadata = clarificationMetadata(String(item.metadata?.request_details || item.name), item.metadata, input.answers) }
  catch (error) { return { ok: false as const, error: error instanceof Error ? error.message : "Invalid answers." } }
  const { data, error } = await createAdminClient().rpc("staff_apply_request_item_edit", {
    p_request_id: input.requestId, p_item_id: item.id, p_actor_id: user.id, p_receipt_id: randomUUID(),
    p_expected: itemEditSnapshot(item), p_source_id: null, p_source_expected: null,
    p_patch: { metadata: { ...metadata, clarification_actor_id: user.id, clarification_updated_at: new Date().toISOString() } }, p_undo: false,
  })
  if (error || !data?.ok) return { ok: false as const, error: "Answers were not saved. The list may have changed; reload before trying again." }
  revalidatePath(`/owner/materials/requests/${input.requestId}`)
  return { ok: true as const }
}
