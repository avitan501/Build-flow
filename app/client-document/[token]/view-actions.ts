"use server"

import { createClient } from "@/lib/supabase/server"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function recordClientDocumentViewAction(input: {
  token: string
  documentVersion: number
  managerPreviewToken?: string | null
}) {
  const token = String(input.token || "").trim()
  const documentVersion = Number(input.documentVersion)
  const rawManagerPreviewToken = String(input.managerPreviewToken || "").trim()
  const managerPreviewToken = UUID_PATTERN.test(rawManagerPreviewToken) ? rawManagerPreviewToken : null
  if (
    !UUID_PATTERN.test(token)
    || !Number.isSafeInteger(documentVersion)
    || documentVersion < 1
  ) return { ok: false as const }

  const supabase = await createClient()
  const { error } = await supabase.rpc("record_request_client_document_view", {
    p_public_token: token,
    p_document_version: documentVersion,
    p_manager_preview_token: managerPreviewToken,
  })
  return { ok: !error as boolean }
}
