"use server"

import { revalidatePath } from "next/cache"

import { sendManagerClientReplyEmail } from "@/lib/cart-submission-email"
import { requireStaffProfile } from "@/lib/auth"
import { generateRequestClientQuotePdf, type RequestClientQuoteLine } from "@/lib/request-client-quote-pdf"

type ReplyResult = { ok: true; providerId: string | null } | { ok: false; error: string }
type QuoteResult = { ok: true; providerId: string | null; pdfBase64?: string; fileName?: string } | { ok: false; error: string }
type DeliveryScheduleResult = { ok: true } | { ok: false; error: string }

export type RequestClientQuoteInput = {
  requestId: string
  quoteNumber: string
  issueDate: string
  expiresOn: string
  clientAddress: string
  shipTo: string
  message: string
  lines: RequestClientQuoteLine[]
  deliveryCharge: number
  salesTaxRate: number
  terms: string
  ach?: { bankName: string; accountOwner: string; routingNumber: string; accountNumber: string }
}

const ALLOWED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
])

export async function organizeClientMaterialRequestAction(formData: FormData) {
  const requestId = String(formData.get("requestId") || "").trim()
  const force = formData.get("force") === "true"
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) return { ok: false as const, error: "This request could not be identified." }
  const { supabase } = await requireStaffProfile("customers")
  const { data: request } = await supabase.from("quote_requests").select("id").eq("id", requestId).maybeSingle<{ id: string }>()
  if (!request) return { ok: false as const, error: "This request was not found." }
  const { data, error } = await supabase.functions.invoke<{ ok?: boolean; status?: string; itemCount?: number; reviewCount?: number; error?: string }>("client-material-list-ai", { body: { requestId, force } })
  if (error || !data?.ok) return { ok: false as const, error: "The list could not be organized. Please try again." }
  revalidatePath(`/owner/materials/requests/${requestId}`)
  revalidatePath("/admin/supplier-quotes")
  return { ok: true as const, status: data.status || "organized", itemCount: data.itemCount || 0, reviewCount: data.reviewCount || 0 }
}

export async function updateOrganizedMaterialItemAction(formData: FormData) {
  const requestId = String(formData.get("requestId") || "").trim()
  const itemId = String(formData.get("itemId") || "").trim()
  const name = String(formData.get("name") || "").trim().replace(/\s+/g, " ").slice(0, 300)
  const quantity = Number(formData.get("quantity"))
  const unit = String(formData.get("unit") || "").trim().replace(/\s+/g, " ").slice(0, 60)
  const dimensions = String(formData.get("dimensions") || "").trim().replace(/\s+/g, " ").slice(0, 300)
  const thickness = String(formData.get("thickness") || "").trim().replace(/\s+/g, " ").slice(0, 160)
  const productType = String(formData.get("productType") || "").trim().replace(/\s+/g, " ").slice(0, 160)
  const screwLength = String(formData.get("screwLength") || "").trim().replace(/\s+/g, " ").slice(0, 80)
  const details = String(formData.get("details") || "").trim().replace(/\s+/g, " ").slice(0, 1200)
  const markReady = formData.get("markReady") === "true"
  if (!/^[0-9a-f-]{36}$/i.test(requestId) || !/^[0-9a-f-]{36}$/i.test(itemId)) return { ok: false as const, error: "This item could not be identified." }
  if (!name || !Number.isFinite(quantity) || quantity <= 0 || !unit) return { ok: false as const, error: "Enter the item, quantity, and unit." }

  const { supabase, user } = await requireStaffProfile("customers")
  const { data: item } = await supabase
    .from("quote_request_items")
    .select("id,metadata")
    .eq("id", itemId)
    .eq("request_id", requestId)
    .maybeSingle<{ id: string; metadata: Record<string, unknown> | null }>()
  if (!item || item.metadata?.ai_organized !== true) return { ok: false as const, error: "Only the organized material copy can be changed here." }

  const metadata = {
    ...(item.metadata ?? {}),
    dimensions,
    thickness,
    product_type: productType,
    screw_length: screwLength,
    request_details: details,
    manually_reviewed_at: new Date().toISOString(),
    manually_reviewed_by: user.id,
    ...(markReady ? { review_status: "ready", review_reasons: [], needs_review: false } : {}),
  }
  const { error } = await supabase
    .from("quote_request_items")
    .update({ name, quantity, unit, metadata, qualification_status: markReady ? "not_required" : "pending" })
    .eq("id", itemId)
    .eq("request_id", requestId)
  if (error) return { ok: false as const, error: "The item could not be saved. Please try again." }
  revalidatePath(`/owner/materials/requests/${requestId}`)
  return { ok: true as const }
}

export async function sendClientReplyAction(formData: FormData): Promise<ReplyResult> {
  const requestId = String(formData.get("requestId") || "").trim()
  const message = String(formData.get("message") || "").trim()
  if (!message) return { ok: false, error: "Write a message before sending." }
  if (message.length > 10_000) return { ok: false, error: "The message is too long." }

  const attachmentValue = formData.get("attachment")
  const attachment = attachmentValue instanceof File && attachmentValue.size > 0 ? attachmentValue : null
  if (attachment && attachment.size > 10 * 1024 * 1024) return { ok: false, error: "Keep the attachment under 10 MB." }
  if (attachment && !ALLOWED_ATTACHMENT_TYPES.has(attachment.type)) return { ok: false, error: "Attach a PDF, image, Word document, or Excel file." }

  const { supabase } = await requireStaffProfile("customers")
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

export async function scheduleRequestDeliveryAction(input: { requestId: string; date: string; time: string; address: string }): Promise<DeliveryScheduleResult> {
  const requestId = String(input.requestId || "").trim()
  const date = String(input.date || "").trim()
  const time = String(input.time || "").trim()
  const address = String(input.address || "").trim().slice(0, 500)
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) return { ok: false, error: "This request could not be identified." }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T12:00:00`))) return { ok: false, error: "Choose a delivery date." }
  const [deliveryHour, deliveryMinute] = time.split(":").map(Number)
  if (!/^\d{2}:\d{2}$/.test(time) || !Number.isInteger(deliveryHour) || deliveryHour < 0 || deliveryHour > 23 || !Number.isInteger(deliveryMinute) || deliveryMinute < 0 || deliveryMinute > 59) return { ok: false, error: "Choose a delivery time." }
  if (!address) return { ok: false, error: "Enter the delivery address." }

  const { supabase } = await requireStaffProfile("customers")
  const { data: request } = await supabase
    .from("quote_requests")
    .select("id,title,owner_id,project_id")
    .eq("id", requestId)
    .maybeSingle<{ id: string; title: string; owner_id: string; project_id: string }>()
  if (!request) return { ok: false, error: "Request not found." }

  const { error } = await supabase.from("project_events").insert({
    project_id: request.project_id,
    owner_id: request.owner_id,
    event_type: "status_changed",
    source: "admin",
    title: "Delivery scheduled",
    description: `${date} at ${time} · ${address}`,
    metadata: {
      quote_request_id: request.id,
      client_action: "delivery_scheduled",
      delivery_date: date,
      delivery_time: time,
      delivery_address: address,
    },
  })
  if (error) return { ok: false, error: "The delivery schedule could not be saved. Please try again." }
  revalidatePath(`/owner/materials/requests/${requestId}`)
  return { ok: true }
}

async function prepareRequestClientQuote(input: RequestClientQuoteInput) {
  const { supabase } = await requireStaffProfile("customers")
  const requestId = String(input.requestId || "").trim()
  const quoteNumber = String(input.quoteNumber || "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 40)
  if (!requestId || quoteNumber.length < 3) return { ok: false as const, error: "Enter a valid estimate code." }
  const lines = (input.lines ?? []).map((line) => ({
    description: String(line.description || "").trim().slice(0, 500),
    quantity: Number(line.quantity),
    unit: String(line.unit || "each").trim().slice(0, 40) || "each",
    unitPrice: Number(line.unitPrice),
  })).filter((line) => line.description)
  if (!lines.length || lines.length > 100) return { ok: false as const, error: "Add between 1 and 100 estimate items." }
  if (lines.some((line) => !Number.isFinite(line.quantity) || line.quantity <= 0 || !Number.isFinite(line.unitPrice) || line.unitPrice < 0)) return { ok: false as const, error: "Check every quantity and unit price." }
  const deliveryCharge = Number(input.deliveryCharge)
  const salesTaxRate = Number(input.salesTaxRate)
  if (!Number.isFinite(deliveryCharge) || deliveryCharge < 0 || !Number.isFinite(salesTaxRate) || salesTaxRate < 0 || salesTaxRate > 20) return { ok: false as const, error: "Check delivery and sales tax amounts." }

  const { data: request, error: requestError } = await supabase.from("quote_requests").select("id,title,owner_id,project_id,projects(address)").eq("id", requestId).maybeSingle<{ id: string; title: string; owner_id: string; project_id: string; projects: { address: string | null } | null }>()
  if (requestError || !request) return { ok: false as const, error: "Request not found." }
  const { data: client } = await supabase.from("profiles").select("full_name,email").eq("id", request.owner_id).maybeSingle<{ full_name: string | null; email: string | null }>()
  if (!client?.email) return { ok: false as const, error: "This client does not have an email address." }

  const pdfInput = {
    quoteNumber,
    issueDate: String(input.issueDate || "").slice(0, 30),
    expiresOn: String(input.expiresOn || "").slice(0, 30),
    clientName: client.full_name || client.email,
    clientAddress: String(input.clientAddress || "").trim().slice(0, 500),
    shipTo: String(input.shipTo || request.projects?.address || "").trim().slice(0, 500),
    requestTitle: request.title,
    lines,
    deliveryCharge: Math.round(deliveryCharge * 100) / 100,
    salesTaxRate: Math.round(salesTaxRate * 1000) / 1000,
    terms: String(input.terms || "").trim().slice(0, 4000),
    ach: input.ach ? {
      bankName: String(input.ach.bankName || "").trim().slice(0, 120),
      accountOwner: String(input.ach.accountOwner || "").trim().slice(0, 160),
      routingNumber: String(input.ach.routingNumber || "").replace(/\D/g, "").slice(0, 9),
      accountNumber: String(input.ach.accountNumber || "").replace(/[^0-9A-Za-z-]/g, "").slice(0, 34),
    } : undefined,
  }
  const pdf = await generateRequestClientQuotePdf(pdfInput)
  return { ok: true as const, supabase, request, client, pdf, quoteNumber, lines, pdfInput }
}

export async function previewRequestClientQuoteAction(input: RequestClientQuoteInput): Promise<QuoteResult> {
  const prepared = await prepareRequestClientQuote(input)
  if (!prepared.ok) return prepared
  return { ok: true, providerId: null, pdfBase64: prepared.pdf.toString("base64"), fileName: `Avantia-Build-Estimate-${prepared.quoteNumber}.pdf` }
}

export async function sendRequestClientQuoteAction(input: RequestClientQuoteInput): Promise<QuoteResult> {
  const prepared = await prepareRequestClientQuote(input)
  if (!prepared.ok) return prepared
  const fileName = `Avantia-Build-Estimate-${prepared.quoteNumber}.pdf`
  const message = String(input.message || "Please review the attached Avantia Build estimate.").trim().slice(0, 5000)
  const emailInput = {
    requestId: prepared.request.id,
    requestTitle: `Estimate ${prepared.quoteNumber}: ${prepared.request.title}`,
    recipientName: prepared.client.full_name || "Client",
    recipientEmail: prepared.client.email!,
    message,
    items: prepared.lines.map((line) => ({ name: line.description, quantity: line.quantity, unit: line.unit, details: [`Unit price: $${line.unitPrice.toFixed(2)}`] })),
    attachment: { filename: fileName, content: prepared.pdf.toString("base64") },
  }
  const direct = await sendManagerClientReplyEmail(emailInput)
  let sent = direct.status === "sent"
  let providerId = direct.status === "sent" ? direct.providerId : null
  let deliveryError = direct.status === "failed" ? direct.error : "Website email is not configured."
  if (!sent && direct.status !== "skipped") {
    const { data: fallback, error } = await prepared.supabase.functions.invoke<{ ok?: boolean; providerId?: string | null; error?: string }>("send-supplier-quote", { body: { action: "send_client_reply", requestId: prepared.request.id, message, items: emailInput.items, attachment: emailInput.attachment } })
    sent = !error && Boolean(fallback?.ok)
    providerId = fallback?.providerId || null
    deliveryError = fallback?.error || error?.message || deliveryError
  }
  if (!sent) return { ok: false, error: direct.status === "skipped" ? "Email was not sent." : deliveryError }

  await prepared.supabase.from("project_events").insert({
    project_id: prepared.request.project_id,
    owner_id: prepared.request.owner_id,
    event_type: "status_changed",
    source: "admin",
    title: `Estimate ${prepared.quoteNumber} emailed to client`,
    description: message,
    metadata: { quote_request_id: prepared.request.id, client_action: "estimate_sent", quote_number: prepared.quoteNumber, attachment_name: fileName },
  })
  return { ok: true, providerId, fileName }
}
