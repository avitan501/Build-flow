"use server"

import { revalidatePath } from "next/cache"

import { requireManagerPortalProfile } from "@/lib/auth"
import { normalizeAuraEmail, normalizeAuraPhone } from "@/lib/aura/communications"
import { serializeCommunicationLog, type CommunicationLog } from "@/lib/manager-command-center"
import { createAdminClient } from "@/lib/supabase/admin"
import { addAuraCommunicationLinks, type AuraEmailEntityType } from "@/lib/aura/email-links"
import { isSmsCorrectionReason, redactSmsTrainingText, smsTrainingIntent, smsTrainingLanguage, type SmsCorrectionReason } from "@/lib/ai/sms-training-privacy"
import { isExplicitCustomerRequestConfirmation } from "@/lib/customer-request-confirmation"

type ContactKind = "customer" | "lead" | "supplier"
type Result = { ok: true } | { ok: false; error: string }
type SmsAiMode = "off" | "draft" | "auto_safe"
type SmsAiStyle = "professional" | "friendly" | "brief"

async function findPhoneAuthUser(admin: ReturnType<typeof createAdminClient>, phone: string) {
  for (let page = 1; page <= 100; page += 1) {
    const result = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (result.error) return { user: null, error: result.error }
    const user = result.data.users.find((candidate) => normalizeAuraPhone(candidate.phone || "") === phone)
    if (user || result.data.users.length < 1000) return { user: user || null, error: null }
  }
  return { user: null, error: new Error("customer_directory_scan_limit") }
}

async function ensureSmsPhoneCustomer(phone: string, name: string) {
  const admin = createAdminClient()
  const authLookup = await findPhoneAuthUser(admin, phone)
  if (authLookup.error) return { ok: false as const, error: "The secure customer directory could not be checked." }
  let authUser = authLookup.user
  const profiles = await admin.from("profiles").select("id,email,full_name,phone").eq("role", "client").not("phone", "is", null).limit(1000).returns<Array<{ id: string; email: string; full_name: string | null; phone: string | null }>>()
  if (profiles.error) return { ok: false as const, error: "The customer directory could not be checked." }
  const profile = (profiles.data || []).find((candidate) => normalizeAuraPhone(candidate.phone || "") === phone)
  if (!authUser && profile) {
    const linked = await admin.auth.admin.updateUserById(profile.id, { phone, phone_confirm: true, user_metadata: { full_name: profile.full_name || name, phone, login_type: "sms_request" } })
    if (!linked.error) authUser = linked.data.user
    else authUser = (await findPhoneAuthUser(admin, phone)).user
  }
  if (!authUser) {
    const created = await admin.auth.admin.createUser({ phone, phone_confirm: true, user_metadata: { full_name: name, phone, login_type: "sms_request" } })
    if (created.error || !created.data.user) return { ok: false as const, error: "The secure phone customer could not be added." }
    authUser = created.data.user
  }
  const currentName = profile?.id === authUser.id ? profile.full_name?.trim() || "" : ""
  const fullName = currentName && currentName !== phone && !/^\+?[0-9 ()-]+$/.test(currentName) ? currentName : name
  const saved = await admin.from("profiles").upsert({ id: authUser.id, email: authUser.email || profile?.email || "", full_name: fullName, phone, role: "client", approval_status: "pending", is_active: true }, { onConflict: "id" })
  if (saved.error) return { ok: false as const, error: "The customer profile could not be saved." }
  return { ok: true as const, customerId: authUser.id }
}

export type SmsRequestProposal = {
  communicationId: string
  phone: string
  customerName: string
  customerAddress: string
  title: string
  department: string
  items: Array<{ name: string; quantity: number; unit: string }>
  sourceCommunicationIds: string[]
  sourceMessages: string[]
  existingRequestId: string | null
  existingRequestTitle: string | null
  kind: "create" | "update"
  reviewNote: string
  aiModel: string
}

export type SmsReplyDraft = {
  id: string
  communication_id: string
  counterparty_phone: string
  reply_text: string
  decision: "draft" | "blocked" | "auto_sent" | "sent_manually" | "send_failed"
  safety_reason: string | null
  safety_level: "green" | "yellow" | "red"
  safety_signals: string[]
  intent: string
  latency_ms: number | null
  input_tokens: number | null
  output_tokens: number | null
  estimated_cost_usd: number | null
  prompt_version: string
  ai_model: string | null
  updated_at: string
}

export async function completeSmsReplyDraftAction(input: { draftId: string; reply: string; teachAi: boolean; correctionReasons?: SmsCorrectionReason[] }) {
  const { supabase, user, access } = await requireManagerPortalProfile()
  if (!access.customers || !/^[0-9a-f-]{36}$/i.test(input.draftId)) return { ok: false as const, error: "Choose a valid AI draft." }
  const reply = String(input.reply || "").trim().slice(0, 1600)
  if (!reply) return { ok: false as const, error: "The sent reply cannot be empty." }

  const { data: draft, error: draftError } = await supabase.from("aura_sms_reply_drafts")
    .select("id,communication_id,reply_text")
    .eq("id", input.draftId)
    .maybeSingle<{ id: string; communication_id: string; reply_text: string }>()
  if (draftError || !draft) return { ok: false as const, error: "The AI draft could not be found." }

  const { data: communication, error: communicationError } = await supabase.from("aura_communications")
    .select("id,body,contact_id")
    .eq("id", draft.communication_id)
    .eq("channel", "sms")
    .eq("direction", "incoming")
    .maybeSingle<{ id: string; body: string | null; contact_id: string | null }>()
  if (communicationError || !communication?.body?.trim()) return { ok: false as const, error: "The customer message for this draft could not be found." }

  const { data: trainingContact } = communication.contact_id
    ? await supabase.from("aura_contacts").select("full_name,company").eq("id", communication.contact_id).maybeSingle<{ full_name: string | null; company: string | null }>()
    : { data: null }
  const privateTrainingValues = [
    trainingContact?.full_name,
    ...(trainingContact?.full_name?.split(/\s+/).filter((part) => part.length >= 3) || []),
    trainingContact?.company,
  ].filter((value): value is string => Boolean(value?.trim()))

  const { error: updateError } = await supabase.from("aura_sms_reply_drafts")
    .update({ reply_text: reply, decision: "sent_manually" })
    .eq("id", draft.id)
  if (updateError) return { ok: false as const, error: "The AI draft status could not be updated." }

  const corrected = reply !== draft.reply_text.trim()
  const correctionReasons = [...new Set((input.correctionReasons || []).filter(isSmsCorrectionReason))].slice(0, 6)
  const language = smsTrainingLanguage(communication.body)
  const intent = smsTrainingIntent(communication.body)
  const privateSafeOriginalReply = redactSmsTrainingText(draft.reply_text.trim(), privateTrainingValues)
  const privateSafeCorrectedReply = redactSmsTrainingText(reply, privateTrainingValues)
  const { error: feedbackError } = await supabase.from("aura_ai_reply_feedback").insert({
    communication_id: communication.id,
    draft_id: draft.id,
    original_reply: privateSafeOriginalReply,
    corrected_reply: privateSafeCorrectedReply,
    promoted_to_example: Boolean(input.teachAi),
    correction_reasons: correctionReasons,
    intent,
    language,
    privacy_redacted: true,
    learning_metadata: {
      corrected,
      reason_count: correctionReasons.length,
      redaction_version: "sms-training-v2",
      source_contains_raw_customer_text: false,
    },
    created_by: user.id,
  })
  if (feedbackError) return { ok: false as const, error: "The reply was sent, but its AI feedback could not be saved." }

  if (input.teachAi) {
    const privateSafeCustomerMessage = redactSmsTrainingText(communication.body, privateTrainingValues)
    const privateSafeApprovedReply = privateSafeCorrectedReply
    const { error: exampleError } = await supabase.from("aura_ai_reply_examples").upsert({
      customer_message: privateSafeCustomerMessage,
      approved_reply: privateSafeApprovedReply,
      language,
      intent,
      privacy_redacted: true,
      tags: [...(corrected ? ["manager-corrected"] : ["manager-approved"]), ...correctionReasons],
      enabled: true,
      source_draft_id: draft.id,
      approved_by: user.id,
    }, { onConflict: "source_draft_id" })
    if (exampleError) return { ok: false as const, error: "The reply was sent, but the approved AI example could not be saved." }
  }

  revalidatePath("/admin/communications")
  revalidatePath("/admin/ai-tools/sms-replies")
  return { ok: true as const, taught: Boolean(input.teachAi) }
}

export async function saveSmsAutomationAction(input: { phone: string; mode: SmsAiMode; style: SmsAiStyle; autoCreateRequestDrafts: boolean }) {
  const { supabase, access } = await requireManagerPortalProfile()
  if (!access.customers) return { ok: false as const, error: "Customer communication access is required." }
  if (!new Set<SmsAiMode>(["off", "draft", "auto_safe"]).has(input.mode) || !new Set<SmsAiStyle>(["professional", "friendly", "brief"]).has(input.style)) return { ok: false as const, error: "Choose valid AI settings." }
  const phone = normalizeAuraPhone(input.phone)
  if (!phone) return { ok: false as const, error: "Choose a conversation with a valid phone number." }
  const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>("aura-messaging-broker", { body: { action: "save_sms_automation", phone, mode: input.mode, style: input.style, autoCreateRequestDrafts: Boolean(input.autoCreateRequestDrafts) } })
  if (error || !data?.ok) return { ok: false as const, error: data?.error || "The AI reply settings could not be saved." }
  revalidatePath("/admin/communications")
  return { ok: true as const }
}

export async function generateSmsReplyAction(input: { communicationId: string }) {
  const { supabase, access } = await requireManagerPortalProfile()
  if (!access.customers || !/^[0-9a-f-]{36}$/i.test(input.communicationId)) return { ok: false as const, error: "Choose an incoming text message." }
  const { data, error } = await supabase.functions.invoke<{ ok?: boolean; reply?: string; safetyReason?: string; requestDetected?: boolean; error?: string }>("aura-messaging-broker", { body: { action: "generate_sms_reply", communicationId: input.communicationId } })
  if (error || !data?.ok || !data.reply) return { ok: false as const, error: data?.error || "AI could not prepare a reply right now." }
  return { ok: true as const, reply: data.reply, safetyReason: data.safetyReason || "Review before sending.", requestDetected: Boolean(data.requestDetected) }
}

export async function reviewSmsRequestAction(input: { communicationId: string }) {
  const { supabase, access } = await requireManagerPortalProfile()
  if (!access.customers || !/^[0-9a-f-]{36}$/i.test(input.communicationId)) return { ok: false as const, error: "Choose an incoming text message." }
  const { data, error } = await supabase.functions.invoke<{ ok?: boolean; proposal?: SmsRequestProposal; error?: string }>("aura-messaging-broker", { body: { action: "review_sms_request", communicationId: input.communicationId } })
  if (error || !data?.ok || !data.proposal) return { ok: false as const, error: data?.error || "AI could not review this conversation right now." }
  return { ok: true as const, proposal: data.proposal }
}

export async function createSmsMaterialRequestAction(input: {
  communicationId: string
  confirmationCommunicationId: string
  phone: string
  customerName: string
  customerAddress: string
  title: string
  department: string
  items: Array<{ name: string; quantity: number; unit: string }>
  sourceCommunicationIds: string[]
}) {
  const phone = normalizeAuraPhone(input.phone)
  const customerName = String(input.customerName || "").trim().replace(/\s+/g, " ").slice(0, 160) || phone
  const customerAddress = String(input.customerAddress || "").trim().replace(/\s+/g, " ").slice(0, 500)
  const title = String(input.title || "").trim().replace(/\s+/g, " ").slice(0, 180)
  const department = String(input.department || "Unassigned").trim().replace(/\s+/g, " ").slice(0, 100) || "Unassigned"
  const items = Array.isArray(input.items) ? input.items.slice(0, 50).flatMap((item) => {
    const name = String(item?.name || "").trim().replace(/\s+/g, " ").slice(0, 300)
    const quantity = Number(item?.quantity)
    const unit = String(item?.unit || "each").trim().replace(/\s+/g, " ").slice(0, 40) || "each"
    return name ? [{ name, quantity: Number.isFinite(quantity) && quantity > 0 ? Math.min(quantity, 1_000_000) : 1, unit }] : []
  }) : []
  const sourceCommunicationIds = [...new Set([input.communicationId, ...(input.sourceCommunicationIds || [])])].filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 20)
  const confirmationCommunicationId = String(input.confirmationCommunicationId || "").trim()
  if (!phone || !title || !items.length || !sourceCommunicationIds.length) return { ok: false as const, error: "Add a request title and at least one material item." }
  if (!/^[0-9a-f-]{36}$/i.test(confirmationCommunicationId) || !sourceCommunicationIds.includes(confirmationCommunicationId)) return { ok: false as const, error: "Choose the customer's explicit confirmation message." }

  const { supabase, user, access } = await requireManagerPortalProfile()
  if (!access.customers) return { ok: false as const, error: "Customer access is required." }
  const admin = createAdminClient()
  const confirmation = await admin.from("aura_communications").select("id,channel,direction,counterparty_phone,body").eq("id", confirmationCommunicationId).maybeSingle<{ id: string; channel: string; direction: string | null; counterparty_phone: string | null; body: string | null }>()
  if (confirmation.error || !confirmation.data || confirmation.data.channel !== "sms" || confirmation.data.direction !== "incoming" || normalizeAuraPhone(confirmation.data.counterparty_phone || "") !== phone || !isExplicitCustomerRequestConfirmation(confirmation.data.body)) return { ok: false as const, error: "The selected inbound text does not clearly confirm this request." }
  const reservation = await admin.from("aura_sms_request_confirmations").insert({ confirmation_communication_id: confirmationCommunicationId, normalized_phone: phone, confirmation_actor_id: user.id }).select("confirmation_communication_id").maybeSingle()
  if (reservation.error) {
    const existing = await admin.from("aura_sms_request_confirmations").select("request_id").eq("confirmation_communication_id", confirmationCommunicationId).maybeSingle<{ request_id: string | null }>()
    if (!existing.data?.request_id) return { ok: false as const, error: "This confirmation is already being processed. Refresh before trying again." }
    const prior = await admin.from("quote_requests").select("public_number").eq("id", existing.data.request_id).maybeSingle<{ public_number: number }>()
    await admin.from("customer_request_portal_access").upsert({ request_id: existing.data.request_id, normalized_phone: phone, delivery_address: customerAddress }, { onConflict: "request_id" })
    return { ok: true as const, requestId: existing.data.request_id, publicNumber: prior.data?.public_number || null, invitation: prior.data?.public_number ? `Your Avantia Build material request #${prior.data.public_number} is ready. Open https://build.avantiap.com/requests and request a one-time code for secure access.` : "Open your Avantia Build request securely: https://build.avantiap.com/requests" }
  }

  const tagged = await quickTagPhoneContactAction({ phone, kind: "customer", name: customerName || phone })
  if (!tagged.ok) {
    await admin.from("aura_sms_request_confirmations").delete().eq("confirmation_communication_id", confirmationCommunicationId)
    return tagged
  }
  const notes = [`Created from SMS after manager review.`, `Customer phone: ${phone}`, customerAddress ? `Job address: ${customerAddress}` : "", `Source messages: ${sourceCommunicationIds.length}`].filter(Boolean).join("\n")
  const { data: requestId, error } = await supabase.rpc("staff_create_client_request", { p_customer_id: tagged.sourceId, p_department: department, p_title: title, p_lines: items, p_notes: notes.slice(0, 4000) })
  if (error || typeof requestId !== "string") {
    await admin.from("aura_sms_request_confirmations").delete().eq("confirmation_communication_id", confirmationCommunicationId)
    return { ok: false as const, error: "The material request could not be created." }
  }
  // Record the created request immediately so any later partial failure can be
  // retried idempotently without creating a second customer request.
  await admin.from("aura_sms_request_confirmations").update({ request_id: requestId }).eq("confirmation_communication_id", confirmationCommunicationId)
  const requestNumber = await admin.from("quote_requests").select("public_number").eq("id", requestId).single<{ public_number: number }>()
  if (requestNumber.error || !requestNumber.data?.public_number) return { ok: false as const, error: "The request was created, but its public number needs attention.", requestId }
  const portalAccess = await admin.from("customer_request_portal_access").upsert({ request_id: requestId, normalized_phone: phone, delivery_address: customerAddress, claimed_by: tagged.sourceId, invited_at: new Date().toISOString() }, { onConflict: "request_id" })
  if (portalAccess.error) return { ok: false as const, error: "The request was created, but portal access needs attention.", requestId }
  await admin.from("aura_sms_request_confirmations").update({ completed_at: new Date().toISOString() }).eq("confirmation_communication_id", confirmationCommunicationId)
  const request = await supabase.from("quote_requests").update({ manager_assignee: "carlos" }).eq("id", requestId).select("project_id").maybeSingle<{ project_id: string }>()
  if (request.error || !request.data) return { ok: false as const, error: "The request was created, but Carlos could not be assigned." }
  if (customerAddress) {
    const addressUpdate = await supabase.from("projects").update({ address: customerAddress }).eq("id", request.data.project_id)
    if (addressUpdate.error) return { ok: false as const, error: "The request was created, but the address could not be saved." }
  }
  const linked = await supabase.functions.invoke<{ ok?: boolean; error?: string }>("aura-messaging-broker", { body: { action: "link_sms_material_request", requestId, phone, customerName, communicationIds: sourceCommunicationIds } })
  if (linked.error || !linked.data?.ok) return { ok: false as const, error: linked.data?.error || "The request was created, but the conversation link needs attention.", requestId }
  revalidatePath("/admin/communications")
  revalidatePath("/owner/materials/requests")
  revalidatePath(`/owner/materials/requests/${requestId}`)
  return { ok: true as const, requestId, publicNumber: requestNumber.data.public_number, invitation: `Your Avantia Build material request #${requestNumber.data.public_number} is ready. Open https://build.avantiap.com/requests and request a one-time code for secure access.` }
}

export async function quickTagPhoneContactAction(input: { phone: string; kind: ContactKind; name?: string }) {
  const { supabase, user, access } = await requireManagerPortalProfile()
  if (!access.customers) return { ok: false as const, error: "Customer communication access is required." }
  const phone = normalizeAuraPhone(input.phone)
  if (!phone || !new Set<ContactKind>(["customer", "lead", "supplier"]).has(input.kind)) return { ok: false as const, error: "Choose a valid phone conversation and tag." }
  const name = input.name?.trim().slice(0, 160) || phone
  let sourceId = ""
  if (input.kind === "customer") {
    const customer = await ensureSmsPhoneCustomer(phone, name)
    if (!customer.ok) return customer
    sourceId = customer.customerId
  } else if (input.kind === "lead") {
    const existing = await supabase.from("manager_outreach_leads").select("id").eq("phone", phone).limit(1).maybeSingle<{ id: string }>()
    if (existing.error) return { ok: false as const, error: "The lead directory could not be checked." }
    if (existing.data?.id) sourceId = existing.data.id
    else {
      const created = await supabase.from("manager_outreach_leads").insert({ full_name: name, phone, status: "new", notes: "Added from Communications", created_by: user.id }).select("id").single<{ id: string }>()
      if (created.error || !created.data) return { ok: false as const, error: "The lead could not be added." }
      sourceId = created.data.id
    }
  } else {
    if (!access.suppliers) return { ok: false as const, error: "Supplier access is required." }
    const snapshot = await supabase.rpc("staff_load_supplier_directory_snapshot")
    const suppliers = ((snapshot.data as { settings?: { suppliers?: Array<{ id: string; phone?: string; whatsapp?: string }> } } | null)?.settings?.suppliers || [])
    const existing = suppliers.find((supplier) => normalizeAuraPhone(supplier.phone || supplier.whatsapp || "") === phone)
    sourceId = existing?.id || `sms-${phone.replace(/\D/g, "").slice(-10)}`
    if (!existing) {
      const saved = await supabase.rpc("staff_upsert_supplier_directory_entry", { p_supplier: { id: sourceId, name, phone, whatsapp: phone, email: "", contactLabel: "Supplier contact", contactName: "", trustLevel: "not-reviewed", catalogDepartments: [], catalogEnabledDepartments: [], portalUrl: "", deliveryNotes: "", notes: "Added from Communications", address: "", materials: "" }, p_create: true })
      if (saved.error) return { ok: false as const, error: "The supplier could not be added." }
    }
  }
  const linked = await linkCommunicationContactAction({ kind: input.kind, sourceId, name, phone, conversationPhone: phone })
  if (!linked.ok) return linked
  revalidatePath("/admin/users")
  revalidatePath("/admin/vendors")
  revalidatePath("/admin/goals-progress")
  return { ok: true as const, sourceId }
}

export async function saveCommunicationLogAction(input: {
  clientId: string
  channel: "call" | "whatsapp"
  direction: "outbound" | "inbound"
  summary: string
  outcome: string
}): Promise<Result> {
  const { supabase, user, access } = await requireManagerPortalProfile()
  const clientId = input.clientId.trim()
  const summary = input.summary.trim().slice(0, 1500)
  const outcome = input.outcome.trim().slice(0, 500)
  if (!access.customers) return { ok: false, error: "Customer access is required to add a communication log." }
  if (!clientId || !summary) return { ok: false, error: "Choose a client and add a short summary." }
  const client = await supabase.from("profiles").select("id,full_name,email").eq("id", clientId).eq("role", "client").maybeSingle<{ id: string; full_name: string | null; email: string | null }>()
  if (!client.data) return { ok: false, error: "The selected client could not be found." }
  const clientName = String(client.data.full_name || client.data.email || "Client").slice(0, 120)
  const log: CommunicationLog = {
    id: crypto.randomUUID(),
    clientId,
    clientName,
    channel: input.channel,
    direction: input.direction,
    summary,
    outcome,
    createdAt: new Date().toISOString(),
  }
  const result = await supabase.from("manager_goals").insert({
    assignee: access.owner ? "david" : "carlos",
    title: `${input.channel === "call" ? "Call" : "WhatsApp"} · ${clientName}`.slice(0, 120),
    details: serializeCommunicationLog(log),
    status: "completed",
    created_by: user.id,
  })
  if (result.error) return { ok: false, error: "The communication could not be added to the client log." }
  revalidatePath("/admin/communications")
  return { ok: true }
}

export async function linkCommunicationContactAction(input: {
  kind: ContactKind
  sourceId: string
  name: string
  company?: string
  phone?: string
  email?: string
  conversationPhone?: string
  conversationEmail?: string
}) {
  const { supabase, access } = await requireManagerPortalProfile()
  if (!access.customers) return { ok: false as const, error: "Customer communication access is required." }
  if (!new Set<ContactKind>(["customer", "lead", "supplier"]).has(input.kind) || !/^[A-Za-z0-9_-]{1,160}$/.test(input.sourceId)) {
    return { ok: false as const, error: "Choose a valid contact." }
  }
  const conversationPhone = normalizeAuraPhone(input.conversationPhone || "")
  const conversationEmail = normalizeAuraEmail(input.conversationEmail || "")
  if (!conversationPhone && !conversationEmail) return { ok: false as const, error: "This conversation has no phone or email to link." }

  const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>("aura-messaging-broker", { body: {
    action: "link_communication_contact", kind: input.kind, sourceId: input.sourceId,
    name: input.name, company: input.company || "", conversationPhone, conversationEmail,
  } })
  if (error || !data?.ok) return { ok: false as const, error: data?.error || "The contact link could not be saved." }

  revalidatePath("/admin/communications")
  return { ok: true as const }
}

export async function linkEmailConversationAction(input: { conversationEmail: string; entityType: AuraEmailEntityType; entityId: string }): Promise<Result> {
  const { user, access } = await requireManagerPortalProfile()
  const email = normalizeAuraEmail(input.conversationEmail)
  if (!access.customers || !email) return { ok: false, error: "Choose a valid email conversation." }
  if (!new Set<AuraEmailEntityType>(["client", "lead", "supplier", "material_request"]).has(input.entityType) || !/^[A-Za-z0-9_-]{1,160}$/.test(input.entityId)) return { ok: false, error: "Choose what this email belongs to." }
  const admin = createAdminClient()
  let label = "Linked record"
  if (input.entityType === "client") {
    const { data } = await admin.from("profiles").select("id,full_name,company_name,email").eq("id", input.entityId).eq("role", "client").maybeSingle()
    if (!data) return { ok: false, error: "That client could not be found." }
    label = data.full_name || data.company_name || data.email || "Client"
  } else if (input.entityType === "material_request") {
    const { data } = await admin.from("quote_requests").select("id,title").eq("id", input.entityId).maybeSingle()
    if (!data) return { ok: false, error: "That material request could not be found." }
    label = data.title
  } else if (input.entityType === "lead") {
    const { data } = await admin.from("manager_outreach_leads").select("id,full_name,company_name,email").eq("id", input.entityId).maybeSingle()
    if (!data) return { ok: false, error: "That lead could not be found." }
    label = data.full_name || data.company_name || data.email || "Lead"
  } else {
    const { data } = await admin.from("workflow_manager_settings").select("state").eq("id", "singleton").maybeSingle<{ state: { qualificationSettings?: { suppliers?: Array<{ id: string; name: string }> } } }>()
    const supplier = data?.state?.qualificationSettings?.suppliers?.find((item) => item.id === input.entityId)
    if (!supplier) return { ok: false, error: "That supplier could not be found." }
    label = supplier.name
  }
  const { data: rows, error } = await admin.from("aura_communications").select("id").eq("channel", "email").ilike("counterparty_email", email)
  if (error || !rows?.length) return { ok: false, error: "No email messages were found in this conversation." }
  await addAuraCommunicationLinks(rows.map((row) => row.id), [{ entity_type: input.entityType, entity_id: input.entityId, entity_label: label, link_source: "manual", confidence: 1 }], user.id)
  revalidatePath("/admin/communications")
  revalidatePath("/admin/vendors")
  if (input.entityType === "material_request") revalidatePath(`/owner/materials/requests/${input.entityId}`)
  return { ok: true }
}

export async function markEmailConversationReadAction(input: { conversationEmail: string }): Promise<Result> {
  const { access } = await requireManagerPortalProfile()
  const email = normalizeAuraEmail(input.conversationEmail)
  if (!access.customers || !email) return { ok: false, error: "Choose a valid email conversation." }
  const { error } = await createAdminClient().from("aura_communications").update({ read_at: new Date().toISOString() }).eq("channel", "email").eq("direction", "incoming").ilike("counterparty_email", email).is("read_at", null)
  if (error) return { ok: false, error: "The email could not be marked as read." }
  revalidatePath("/admin/communications")
  return { ok: true }
}
