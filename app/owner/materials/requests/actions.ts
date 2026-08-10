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

  const result = await sendManagerClientReplyEmail({
    requestId: request.id,
    requestTitle: request.title,
    recipientName: client.full_name || "Client",
    recipientEmail: client.email,
    message,
  })

  if (result.status === "sent") return { ok: true, providerId: result.providerId }
  if (result.status === "not_configured") return { ok: false, error: "Website email is not configured." }
  if (result.status === "skipped") return { ok: false, error: "Email was not sent." }
  return { ok: false, error: result.error }
}
