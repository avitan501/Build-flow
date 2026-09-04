"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { parseRequestClientDocument, type StoredRequestClientDocument } from "@/lib/request-client-document-data"
import { createClient } from "@/lib/supabase/server"

export type ClientDocumentAcceptanceState = {
  status: "idle" | "accepted" | "already-accepted" | "error" | "version-changed"
  message: string
  receipt?: {
    documentVersion: number
    termsVersion: string
    termsHash: string
    signerName: string
    signerEmail: string | null
    acceptedAt: string
    timezone: "America/New_York"
  }
}

type AcceptanceRpcRow = {
  accepted_document_version: number
  accepted_terms_version: string
  accepted_terms_hash: string
  accepted_signer_name: string
  accepted_signer_email: string | null
  accepted_timestamp: string
  accepted_timezone: "America/New_York"
  was_created: boolean
}

const acceptanceSchema = z.object({
  token: z.string().uuid(),
  documentVersion: z.coerce.number().int().positive(),
  signerName: z.string().trim().min(2).max(120),
  consent: z.literal("accepted"),
})

function acceptanceErrorMessage(error: { code?: string; message?: string } | null) {
  const message = error?.message || ""
  if (message.includes("client_document_version_changed")) return { status: "version-changed" as const, message: "This document was updated. Refresh the page and review the newest version before accepting it." }
  if (message.includes("client_document_email_mismatch")) return { status: "error" as const, message: "The email does not match this document. Check it and try again." }
  if (message.includes("client_document_signer_invalid")) return { status: "error" as const, message: "Enter the signer’s full name and try again." }
  if (message.includes("client_document_not_found")) return { status: "error" as const, message: "This document link is no longer available. Ask Avantia Build for the newest link." }
  if (message.includes("client_document_terms_invalid") || message.includes("client_document_terms_hash_mismatch")) return { status: "error" as const, message: "This document needs to be refreshed by Avantia Build before it can be accepted." }
  if (error?.code === "PGRST202" || message.includes("accept_request_client_document_public")) return { status: "error" as const, message: "Acceptance is temporarily unavailable. Please contact Avantia Build at (516) 908-8319." }
  return { status: "error" as const, message: "We could not save your acknowledgement. No acceptance was recorded. Refresh and try again, or contact Avantia Build at (516) 908-8319." }
}

export async function acceptClientDocumentAction(
  _previousState: ClientDocumentAcceptanceState,
  formData: FormData,
): Promise<ClientDocumentAcceptanceState> {
  const input = acceptanceSchema.safeParse({
    token: formData.get("token"),
    documentVersion: formData.get("documentVersion"),
    signerName: formData.get("signerName"),
    consent: formData.get("consent"),
  })
  if (!input.success) return { status: "error", message: "Enter your name and check the acknowledgement box." }

  try {
    const supabase = await createClient()
    const { data: row, error: documentError } = await supabase
      .rpc("get_request_client_document", { p_public_token: input.data.token })
      .maybeSingle<StoredRequestClientDocument>()
    if (documentError || !row) return { status: "error", message: "This document link is no longer available." }
    if (row.document_type === "receipt") return { status: "error", message: "Receipts do not require acknowledgement." }
    if (row.version !== input.data.documentVersion) return { status: "version-changed", message: "This document was updated. Refresh the page and review the newest version." }

    const document = parseRequestClientDocument(row)
    if (!document) return { status: "error", message: "This document cannot be acknowledged right now." }
    const signerEmail = document.clientEmail || null

    const { data, error } = await supabase.rpc("accept_request_client_document_public", {
      p_public_token: input.data.token,
      p_document_version: row.version,
      p_signer_name: input.data.signerName,
      p_signer_email: signerEmail,
    }).maybeSingle<AcceptanceRpcRow>()

    if (error || !data) {
      console.error(JSON.stringify({ level: "error", message: "Client document acknowledgement failed", route: "/client-document/[token]", errorCode: error?.code || "empty_rpc_response", error: error?.message || "No acknowledgement row returned" }))
      return acceptanceErrorMessage(error)
    }
    revalidatePath(`/client-document/${input.data.token}`)
    return {
      status: data.was_created ? "accepted" : "already-accepted",
      message: data.was_created ? "Acknowledgement recorded." : "This version was already acknowledged.",
      receipt: {
        documentVersion: data.accepted_document_version,
        termsVersion: data.accepted_terms_version,
        termsHash: data.accepted_terms_hash,
        signerName: data.accepted_signer_name,
        signerEmail: data.accepted_signer_email,
        acceptedAt: data.accepted_timestamp,
        timezone: data.accepted_timezone,
      },
    }
  } catch (cause) {
    console.error(JSON.stringify({ level: "error", message: "Client document acknowledgement crashed", route: "/client-document/[token]", error: cause instanceof Error ? cause.message : "Unknown error" }))
    return { status: "error", message: "We could not save your acknowledgement. No acceptance was recorded. Refresh and try again, or contact Avantia Build at (516) 908-8319." }
  }
}
