"use server"

import { sendManagerClientReplyEmail } from "@/lib/cart-submission-email"
import { requireOwnerAccess } from "@/lib/owner-access"

type ReplyResult = { ok: true; providerId: string | null } | { ok: false; error: string }

export async function sendClientReplyAction(input: { requestId: string; message: string }): Promise<ReplyResult> {
  const message = input.message.trim()
  if (!message) return { ok: false, error: "Write a message before sending." }
  if (message.length > 10_000) return { ok: false, error: "The message is too long." }

  const { supabase } = await requireOwnerAccess()
  const { data: request } = await supabase
    .from("quote_requests")
    .select("id,title,owner_id")
    .eq("id", input.requestId)
    .maybeSingle<{ id: string; title: string; owner_id: string }>()
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

  const result = await sendManagerClientReplyEmail({
    requestId: request.id,
    requestTitle: request.title,
    recipientName: client.full_name || "Client",
    recipientEmail: client.email,
    message,
    items: emailItems,
  })

  if (result.status === "sent") return { ok: true, providerId: result.providerId }
  if (result.status === "not_configured") return { ok: false, error: "Website email is not configured." }
  if (result.status === "skipped") return { ok: false, error: "Email was not sent." }
  return { ok: false, error: result.error }
}
