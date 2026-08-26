"use server"

import { revalidatePath } from "next/cache"

import { sendManagerClientReplyEmail } from "@/lib/cart-submission-email"
import { requireStaffProfile } from "@/lib/auth"
import { generateRequestClientQuotePdf, type RequestClientQuoteLine } from "@/lib/request-client-quote-pdf"

type ReplyResult = { ok: true; providerId: string | null } | { ok: false; error: string }
type QuoteResult = { ok: true; providerId: string | null; pdfBase64?: string; fileName?: string } | { ok: false; error: string }
type DeliveryScheduleResult = { ok: true } | { ok: false; error: string }
export type MaterialRequestStatus = "submitted" | "in_review" | "quoted" | "closed"
export type MaterialRequestAssignee = "carlos" | "david"

const MATERIAL_REQUEST_STATUSES = new Set<MaterialRequestStatus>(["submitted", "in_review", "quoted", "closed"])
const MATERIAL_REQUEST_ASSIGNEES = new Set<MaterialRequestAssignee>(["carlos", "david"])

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
  taxableDelivery?: boolean
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

export async function updateMaterialRequestStatusAction(input: { requestId: string; status: MaterialRequestStatus }) {
  const requestId = String(input.requestId || "").trim()
  const status = String(input.status || "") as MaterialRequestStatus
  if (!/^[0-9a-f-]{36}$/i.test(requestId) || !MATERIAL_REQUEST_STATUSES.has(status)) return { ok: false as const, error: "Choose a valid request status." }

  const { supabase } = await requireStaffProfile("customers")
  const { data: request } = await supabase
    .from("quote_requests")
    .select("id,owner_id,project_id,status")
    .eq("id", requestId)
    .maybeSingle<{ id: string; owner_id: string; project_id: string; status: string }>()
  if (!request) return { ok: false as const, error: "Request not found." }
  if (request.status === status) return { ok: true as const }

  const { data: updated, error: updateError } = await supabase.from("quote_requests").update({ status }).eq("id", requestId).select("id").maybeSingle<{ id: string }>()
  if (updateError || !updated) return { ok: false as const, error: "The request status could not be changed." }

  const labels: Record<MaterialRequestStatus, string> = { submitted: "New", in_review: "In progress", quoted: "Quote sent", closed: "Archived" }
  const { error: eventError } = await supabase.from("project_events").insert({
    project_id: request.project_id,
    owner_id: request.owner_id,
    event_type: "status_changed",
    source: "admin",
    title: `Material request marked ${labels[status]}`,
    description: `Manager changed the request from ${request.status.replaceAll("_", " ")} to ${labels[status].toLowerCase()}.`,
    metadata: { quote_request_id: request.id, manager_action: "request_status", previous_status: request.status, request_status: status },
  })
  if (eventError) {
    await supabase.from("quote_requests").update({ status: request.status }).eq("id", requestId)
    return { ok: false as const, error: "The status was not changed because its history could not be saved." }
  }

  revalidatePath("/owner/materials/requests")
  revalidatePath(`/owner/materials/requests/${requestId}`)
  revalidatePath("/admin/build-map")
  revalidatePath("/admin/users")
  revalidatePath("/admin/supplier-quotes")
  return { ok: true as const }
}

export async function updateMaterialRequestAssigneeAction(input: { requestId: string; assignee: MaterialRequestAssignee }) {
  const requestId = String(input.requestId || "").trim()
  const assignee = String(input.assignee || "").toLowerCase() as MaterialRequestAssignee
  if (!/^[0-9a-f-]{36}$/i.test(requestId) || !MATERIAL_REQUEST_ASSIGNEES.has(assignee)) return { ok: false as const, error: "Choose Carlos or David." }

  const { supabase } = await requireStaffProfile("customers")
  const { data: request } = await supabase.from("quote_requests").select("id,owner_id,project_id,manager_assignee").eq("id", requestId).maybeSingle<{ id: string; owner_id: string; project_id: string; manager_assignee: string }>()
  if (!request) return { ok: false as const, error: "Request not found." }
  if (request.manager_assignee === assignee) return { ok: true as const }

  const { data: updated, error: updateError } = await supabase.from("quote_requests").update({ manager_assignee: assignee }).eq("id", requestId).select("id").maybeSingle<{ id: string }>()
  if (updateError || !updated) return { ok: false as const, error: "The assignment could not be changed." }

  const name = assignee === "david" ? "David" : "Carlos"
  const { error: eventError } = await supabase.from("project_events").insert({
    project_id: request.project_id,
    owner_id: request.owner_id,
    event_type: "status_changed",
    source: "admin",
    title: `Material request assigned to ${name}`,
    description: `Manager assigned this material request to ${name}.`,
    metadata: { quote_request_id: request.id, manager_action: "request_assignee", previous_assignee: request.manager_assignee, request_assignee: assignee },
  })
  if (eventError) {
    await supabase.from("quote_requests").update({ manager_assignee: request.manager_assignee }).eq("id", requestId)
    return { ok: false as const, error: "The assignment was not changed because its history could not be saved." }
  }

  revalidatePath("/owner/materials/requests")
  revalidatePath(`/owner/materials/requests/${requestId}`)
  revalidatePath("/admin/build-map")
  return { ok: true as const }
}

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

export async function scheduleRequestDeliveryAction(input: { requestId: string; date: string; startTime: string; durationHours: number; address: string }): Promise<DeliveryScheduleResult> {
  const requestId = String(input.requestId || "").trim()
  const date = String(input.date || "").trim()
  const startTime = String(input.startTime || "").trim()
  const durationHours = Number(input.durationHours)
  const address = String(input.address || "").trim().slice(0, 500)
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) return { ok: false, error: "This request could not be identified." }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T12:00:00`))) return { ok: false, error: "Choose a delivery date." }
  const [deliveryHour, deliveryMinute] = startTime.split(":").map(Number)
  if (!/^\d{2}:\d{2}$/.test(startTime) || !Number.isInteger(deliveryHour) || deliveryHour < 0 || deliveryHour > 23 || !Number.isInteger(deliveryMinute) || deliveryMinute < 0 || deliveryMinute > 59) return { ok: false, error: "Choose when the delivery window starts." }
  if (!Number.isFinite(durationHours) || durationHours < 0.5 || durationHours > 12 || !Number.isInteger(durationHours * 2)) return { ok: false, error: "Choose a delivery window from 30 minutes to 12 hours, in half-hour increments." }
  const windowEndMinutes = deliveryHour * 60 + deliveryMinute + durationHours * 60
  if (windowEndMinutes >= 24 * 60) return { ok: false, error: "Choose a delivery window that ends before midnight." }
  const endTime = `${String(Math.floor(windowEndMinutes / 60)).padStart(2, "0")}:${String(windowEndMinutes % 60).padStart(2, "0")}`
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
    description: `${date} between ${startTime} and ${endTime} (${durationHours} hour${durationHours === 1 ? "" : "s"}) · ${address}`,
    metadata: {
      quote_request_id: request.id,
      client_action: "delivery_scheduled",
      delivery_date: date,
      delivery_time: startTime,
      delivery_window_start: startTime,
      delivery_window_end: endTime,
      delivery_window_hours: durationHours,
      delivery_address: address,
    },
  })
  if (error) return { ok: false, error: "The delivery schedule could not be saved. Please try again." }
  revalidatePath(`/owner/materials/requests/${requestId}`)
  return { ok: true }
}

export async function updateRequestWorkflowStepAction(input: { requestId: string; step: number; completed: boolean }) {
  const requestId = String(input.requestId || "").trim()
  const step = Number(input.step)
  if (!/^[0-9a-f-]{36}$/i.test(requestId) || !Number.isInteger(step) || step < 1 || step > 4 || typeof input.completed !== "boolean") {
    return { ok: false as const, error: "This workflow step could not be updated." }
  }

  const { supabase } = await requireStaffProfile("customers")
  const { data: request } = await supabase
    .from("quote_requests")
    .select("id,owner_id,project_id")
    .eq("id", requestId)
    .maybeSingle<{ id: string; owner_id: string; project_id: string }>()
  if (!request) return { ok: false as const, error: "Request not found." }

  const { error } = await supabase.from("project_events").insert({
    project_id: request.project_id,
    owner_id: request.owner_id,
    event_type: "status_changed",
    source: "admin",
    title: input.completed ? `Step ${step} completed` : `Step ${step} reopened`,
    description: input.completed ? "Marked done by the Manager." : "Reopened by the Manager for additional work.",
    metadata: {
      quote_request_id: request.id,
      manager_action: "workflow_step_status",
      workflow_step: step,
      workflow_completed: input.completed,
    },
  })
  if (error) return { ok: false as const, error: "The workflow step could not be updated." }
  revalidatePath(`/owner/materials/requests/${requestId}`)
  return { ok: true as const }
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
    taxableDelivery: input.taxableDelivery !== false,
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
