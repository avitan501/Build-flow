"use server"

import { sendManagerClientReplyEmail } from "@/lib/cart-submission-email"
import { requireOwnerAccess } from "@/lib/owner-access"

type ReplyResult = { ok: true; providerId: string | null } | { ok: false; error: string }

const ALLOWED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
])

export async function sendClientReplyAction(formData: FormData): Promise<ReplyResult> {
  const requestId = String(formData.get("requestId") || "").trim()
  const message = String(formData.get("message") || "").trim()
  if (!message) return { ok: false, error: "Write a message before sending." }
  if (message.length > 10_000) return { ok: false, error: "The message is too long." }

  const attachmentValue = formData.get("attachment")
  const attachment = attachmentValue instanceof File && attachmentValue.size > 0 ? attachmentValue : null
  if (attachment && attachment.size > 10 * 1024 * 1024) return { ok: false, error: "Keep the attachment under 10 MB." }
  if (attachment && !ALLOWED_ATTACHMENT_TYPES.has(attachment.type)) return { ok: false, error: "Attach a PDF, image, Word document, or Excel file." }

  const { supabase } = await requireOwnerAccess()
  const { data: request } = await supabase
    .from("quote_requests")
    .select("id,title,owner_id,project_id")
    .eq("id", requestId)
    .maybeSingle<{ id: string; title: string; owner_id: string; project_id: string }>()
  if (!request) return { ok: false, error: "Request not found." }

  const { data: client } = await supabase
    .from("profiles")
    .select("full_name,email")
    .eq("id", request.owner_id)
    .maybeSingle<{ full_name: string | null; email: string | null }>()
  if (!client?.email) return { ok: false, error: "This client does not have an email address." }

  const [{ data: requestItems }, { data: questionnaireResponses }] = await Promise.all([
    supabase
      .from("quote_request_items")
      .select("name,quantity,unit,answers,metadata")
      .eq("request_id", request.id)
      .order("created_at", { ascending: true })
      .returns<Array<{
        name: string
        quantity: number
        unit: string | null
        answers: Array<{ label: string; value: string }> | null
        metadata: Record<string, unknown> | null
      }>>(),
    supabase
      .from("material_questionnaire_responses")
      .select("id")
      .eq("request_id", request.id)
      .returns<Array<{ id: string }>>(),
  ])

  const responseIds = (questionnaireResponses ?? []).map((response) => response.id)
  const { data: questionnaireAnswers } = responseIds.length
    ? await supabase
        .from("material_request_answers")
        .select("response_id,question_label_snapshot,answer_display_snapshot")
        .in("response_id", responseIds)
        .order("created_at", { ascending: true })
        .returns<Array<{ response_id: string; question_label_snapshot: string; answer_display_snapshot: string }>>()
    : { data: [] as Array<{ response_id: string; question_label_snapshot: string; answer_display_snapshot: string }> }

  const questionnaireDetails = (questionnaireAnswers ?? [])
    .filter((answer) => answer.answer_display_snapshot.trim())
    .map((answer) => `${answer.question_label_snapshot}: ${answer.answer_display_snapshot}`)
  const emailItems = (requestItems ?? []).map((item, index) => {
    const requestDetails = typeof item.metadata?.request_details === "string" ? item.metadata.request_details.trim() : ""
    return {
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      details: [
        ...(index === 0 ? questionnaireDetails : []),
        ...(item.answers ?? []).filter((answer) => answer.value.trim()).map((answer) => `${answer.label}: ${answer.value}`),
        ...(requestDetails ? [requestDetails] : []),
      ],
    }
  })

  const attachmentPayload = attachment ? {
    filename: attachment.name.replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 180) || "attachment",
    content: Buffer.from(await attachment.arrayBuffer()).toString("base64"),
  } : undefined
  const emailInput = {
    requestId: request.id,
    requestTitle: request.title,
    recipientName: client.full_name || "Client",
    recipientEmail: client.email,
    message,
    items: emailItems,
    attachment: attachmentPayload,
  }
  const directResult = await sendManagerClientReplyEmail(emailInput)
  let sent = directResult.status === "sent"
  let providerId = directResult.status === "sent" ? directResult.providerId : null
  let deliveryError = directResult.status === "failed" ? directResult.error : "Website email is not configured."

  if (!sent && directResult.status !== "skipped") {
    const { data: fallback, error: fallbackError } = await supabase.functions.invoke<{ ok?: boolean; providerId?: string | null; error?: string }>("send-supplier-quote", {
      body: { action: "send_client_reply", requestId: request.id, message, items: emailItems, attachment: attachmentPayload },
    })
    sent = !fallbackError && Boolean(fallback?.ok)
    providerId = fallback?.providerId || null
    deliveryError = fallback?.error || fallbackError?.message || deliveryError
  }

  if (sent) {
    await supabase.from("project_events").insert({
      project_id: request.project_id,
      owner_id: request.owner_id,
      event_type: "status_changed",
      source: "admin",
      title: "Reply emailed to client",
      description: message.slice(0, 2000),
      metadata: { quote_request_id: request.id, client_action: "email_reply", attachment_name: attachment?.name || null },
    })
    return { ok: true, providerId }
  }
  if (directResult.status === "skipped") return { ok: false, error: "Email was not sent." }
  return { ok: false, error: deliveryError }
}
