"use server"

import { requireStaffProfile } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { completeClientQuoteDraft, parseClientQuoteDraft, type ClientQuoteDraftEnvelope } from "@/lib/client-quote-draft"
import type { AutosaveResult } from "@/lib/autosave-queue"

const validId = (value: string) => /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value)

export async function loadClientQuoteDraftAction(comparisonId: string): Promise<{ ok: true; data: ClientQuoteDraftEnvelope } | { ok: false; error: string }> {
  const { user } = await requireStaffProfile("suppliers")
  if (!validId(comparisonId)) return { ok: false, error: "Choose a saved comparison." }
  const { data, error } = await createAdminClient().rpc("staff_load_client_quote_draft", { p_comparison_id: comparisonId, p_actor_id: user.id })
  if (error || !data || !Number.isSafeInteger(Number(data.revision)) || Number(data.revision) < 0
    || !data.source || typeof data.source !== "object" || Array.isArray(data.source) || typeof data.locked !== "boolean") return { ok: false, error: "The shared draft could not be loaded. Retry before editing." }
  const draft = data.draft === null ? null : parseClientQuoteDraft(data.draft)
  if (data.draft !== null && !draft) return { ok: false, error: "The saved draft needs review. No changes were made." }
  return { ok: true, data: { ...data, draft, revision: Number(data.revision), actorId: user.id } as ClientQuoteDraftEnvelope }
}

export async function saveClientQuoteDraftAction(input: { comparisonId: string; expectedRevision: number; source: unknown; draft: unknown }): Promise<AutosaveResult> {
  const { user } = await requireStaffProfile("suppliers")
  const draft = parseClientQuoteDraft(input.draft)
  if (!validId(input.comparisonId) || !draft || !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0) return { ok: false, error: "The draft is too long or has an invalid field. Your changes remain here." }
  const { data, error } = await createAdminClient().rpc("staff_save_client_quote_draft", {
    p_comparison_id: input.comparisonId, p_actor_id: user.id, p_expected_revision: input.expectedRevision,
    p_expected_source: input.source, p_draft: draft,
  })
  if (error) {
    if (error.code === "40001") return { ok: false, conflict: true, error: "The shared draft, quote, or supplier route changed. Your edits are still here; review the latest version before continuing." }
    if (error.message.includes("locked")) return { ok: false, conflict: true, error: "This quote has already entered delivery. Your draft was not applied." }
    return { ok: false, error: "Draft not saved. Your edits remain here; retry before leaving." }
  }
  if (!Number.isSafeInteger(Number(data)) || Number(data) <= input.expectedRevision) return { ok: false, conflict: true, error: "The draft save could not be verified. Review before continuing." }
  return { ok: true, revision: Number(data) }
}

export async function prepareClientQuoteDraftAction(input: { comparisonId: string; routeId: string; expectedClient: unknown; expectedRevision: number; source: unknown; draft: unknown }): Promise<{ ok: true; data: { clientSnapshot: unknown; draftRevision: number } } | { ok: false; error: string }> {
  const { user } = await requireStaffProfile("suppliers")
  const draft = parseClientQuoteDraft(input.draft)
  if (!validId(input.comparisonId) || !validId(input.routeId) || !draft || !completeClientQuoteDraft(draft) || !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0) return { ok: false, error: "Complete every client price and required field before preparing." }
  const { data, error } = await createAdminClient().rpc("staff_prepare_mixed_client_quote_draft", {
    p_comparison_id: input.comparisonId, p_route_id: input.routeId, p_actor_id: user.id,
    p_expected_client: input.expectedClient, p_expected_draft_revision: input.expectedRevision,
    p_expected_source: input.source, p_draft: draft,
  })
  if (error) {
    if (error.code === "40001" || error.message.includes("changed")) return { ok: false, error: "The shared draft or quote changed. Nothing was prepared; review the latest version." }
    if (error.code === "55P03" || error.code === "40P01") return { ok: false, error: "Another update is finishing. Nothing was prepared; retry in a moment." }
    if (error.code === "23505") return { ok: false, error: "This quote number is already in use." }
    return { ok: false, error: "The quote could not be prepared. Review the client, prices and supplier route." }
  }
  if (!data?.clientSnapshot || !Number.isSafeInteger(Number(data.draftRevision)) || Number(data.draftRevision) <= input.expectedRevision) return { ok: false, error: "Preparation could not be verified. Reload and review before sending." }
  return { ok: true, data: { clientSnapshot: data.clientSnapshot, draftRevision: Number(data.draftRevision) } }
}
