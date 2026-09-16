"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import { requireStaffProfile } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import type { ReviewableMaterialItem } from "@/lib/client-material-review"
import { materialReviewChoiceUpdate } from "@/lib/material-review-recommendations"
import { requestItemRevision } from "@/lib/request-item-revision"
import { itemEditSnapshot } from "@/lib/request-item-continuity"
import { requestItemFieldsMetadata, type RequestItemField } from "@/lib/request-item-fields"
import { sourceFileChangeNotice } from "@/lib/request-source-file-change"

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const columns = "id,name,department,quantity,unit,metadata,qualification_status"
type EditInput = { requestId: string; itemId: string; revision: string; field?: string; value?: string; undoReceiptId?: string; edit?: { name: string; quantity: number; unit: string; details: string; fields: RequestItemField[]; recognitionQuestions?: string[] } }

/** No overwrite/retry on conflict: return the current item for an explicit review first. */
export async function saveReviewedRequestItemAction(input: EditInput) {
  if (!input || !uuid.test(input.requestId || "") || !uuid.test(input.itemId || "") || !/^[a-f0-9]{64}$/.test(input.revision || "")) return { ok: false as const, error: "Refresh this product before editing." }
  const { supabase, user } = await requireStaffProfile("customers")
  const { data: item } = await supabase.from("quote_request_items").select(columns).eq("request_id", input.requestId).eq("id", input.itemId).maybeSingle<ReviewableMaterialItem>()
  if (!item || item.metadata?.ai_organized !== true) return { ok: false as const, error: "This organized product is no longer available." }
  const sourceId = typeof item.metadata.source_item_id === "string" && uuid.test(item.metadata.source_item_id) ? item.metadata.source_item_id : null
  const { data: source } = sourceId ? await supabase.from("quote_request_items").select(columns).eq("request_id", input.requestId).eq("id", sourceId).maybeSingle<ReviewableMaterialItem>() : { data: null }
  if (sourceId && !source) return { ok: false as const, error: "The original source is unavailable. Review it before editing." }
  const revision = requestItemRevision(item, source)
  if (revision !== input.revision) return { ok: false as const, conflict: true as const, item, source, revision, error: "This product or its original source changed. Review the latest version before applying your answer." }
  const questions=input.edit?.recognitionQuestions
  if(questions!==undefined && (!Array.isArray(questions)||questions.length>20||questions.some(q=>typeof q!=="string"||q.length>300))) return {ok:false as const,error:"Review the recognition questions before saving."}
  if (input.edit && (typeof input.edit.name !== "string" || !input.edit.name.trim() || input.edit.name.length > 300 || !Number.isFinite(input.edit.quantity) || input.edit.quantity <= 0 || typeof input.edit.unit !== "string" || !input.edit.unit.trim() || input.edit.unit.length > 60 || typeof input.edit.details !== "string" || input.edit.details.length > 20000 || !Array.isArray(input.edit.fields))) return { ok: false as const, error: "Enter the product, quantity and unit." }
  const updated = input.undoReceiptId ? item : input.edit ? {
    ...item, name: input.edit.name.trim(), quantity: input.edit.quantity, unit: input.edit.unit.trim(),
    metadata: { ...item.metadata, ...requestItemFieldsMetadata(input.edit.fields), request_details: input.edit.details.trim().slice(0, 1200) },
  } : materialReviewChoiceUpdate(item, input.field || "", input.value || "")
  if (!updated || (input.undoReceiptId && !uuid.test(input.undoReceiptId))) return { ok: false as const, error: "This question changed. Review the current product first." }
  const metadata: Record<string, unknown> = { ...updated.metadata, manually_reviewed_at: new Date().toISOString(), manually_reviewed_by: user.id }
  if(questions?.length){
    const previous=Array.isArray(metadata.review_reasons)?metadata.review_reasons.filter((q):q is string=>typeof q==="string"):[]
    metadata.review_reasons=[...new Set([...previous,...questions])]
    metadata.needs_review=true
    metadata.review_status="check"
  }
  const receiptId = input.undoReceiptId || randomUUID()
  const { data, error } = await createAdminClient().rpc("staff_apply_request_item_edit", {
    p_request_id: input.requestId, p_item_id: input.itemId, p_actor_id: user.id, p_receipt_id: receiptId,
    p_expected: itemEditSnapshot(item), p_source_id: sourceId, p_source_expected: source ? itemEditSnapshot(source) : null,
    p_patch: input.undoReceiptId ? {} : { name: updated.name, quantity: updated.quantity, unit: updated.unit, metadata, qualification_status: questions?.length ? "pending" : input.edit ? item.qualification_status : metadata.needs_review ? "pending" : "not_required" }, p_undo: Boolean(input.undoReceiptId),
  })
  if (error) return { ok: false as const, error: "Not saved. Safe editing is unavailable; your existing data was not replaced." }
  if (!data?.ok) return { ok: false as const, error: "Not changed. A newer edit or source update must be reviewed first. Refresh this product." }
  const { data: saved } = await supabase.from("quote_request_items").select(columns).eq("request_id", input.requestId).eq("id", input.itemId).maybeSingle<ReviewableMaterialItem>()
  revalidatePath(`/owner/materials/requests/${input.requestId}`)
  if (!saved) return { ok: false as const, error: "Saved, but this product could not be reloaded. Refresh before continuing." }
  // Upload may commit after our edit but before readback. Never silently acknowledge
  // the newer source as if the employee reviewed it when submitting the old answer.
  const fileChange = sourceFileChangeNotice(item, saved)
  if (fileChange) {
    const { data: latestSource } = sourceId ? await supabase.from("quote_request_items").select(columns).eq("request_id", input.requestId).eq("id", sourceId).maybeSingle<ReviewableMaterialItem>() : { data: null }
    return { ok: false as const, conflict: true as const, item: saved, source: latestSource, revision: requestItemRevision(saved, latestSource), error: `Your edit was saved before a source-file update. ${fileChange}` }
  }
  return { ok: true as const, item: saved, source, revision: requestItemRevision(saved, source), receiptId: input.undoReceiptId ? null : receiptId }
}
