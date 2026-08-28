"use server"

import { revalidatePath } from "next/cache"

import { requireManagerPortalProfile } from "@/lib/auth"
import { normalizeAuraEmail, normalizeAuraPhone } from "@/lib/aura/communications"
import { phoneLoginEmailForPhone } from "@/lib/auth-phone"
import { serializeCommunicationLog, type CommunicationLog } from "@/lib/manager-command-center"
import { createAdminClient } from "@/lib/supabase/admin"
import { addAuraCommunicationLinks, type AuraEmailEntityType } from "@/lib/aura/email-links"

type ContactKind = "customer" | "lead" | "supplier"
type Result = { ok: true } | { ok: false; error: string }
type SmsAiMode = "off" | "draft" | "auto_safe"
type SmsAiStyle = "professional" | "friendly" | "brief"

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
  if (!phone || !title || !items.length || !sourceCommunicationIds.length) return { ok: false as const, error: "Add a request title and at least one material item." }

  const tagged = await quickTagPhoneContactAction({ phone, kind: "customer", name: customerName || phone })
  if (!tagged.ok) return tagged
  const { supabase, access } = await requireManagerPortalProfile()
  if (!access.customers) return { ok: false as const, error: "Customer access is required." }
  const notes = [`Created from SMS after manager review.`, `Customer phone: ${phone}`, customerAddress ? `Job address: ${customerAddress}` : "", `Source messages: ${sourceCommunicationIds.length}`].filter(Boolean).join("\n")
  const { data: requestId, error } = await supabase.rpc("staff_create_client_request", { p_customer_id: tagged.sourceId, p_department: department, p_title: title, p_lines: items, p_notes: notes.slice(0, 4000) })
  if (error || typeof requestId !== "string") return { ok: false as const, error: "The material request could not be created." }
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
  return { ok: true as const, requestId }
}

export async function quickTagPhoneContactAction(input: { phone: string; kind: ContactKind; name?: string }) {
  const { supabase, user, access } = await requireManagerPortalProfile()
  if (!access.customers) return { ok: false as const, error: "Customer communication access is required." }
  const phone = normalizeAuraPhone(input.phone)
  if (!phone || !new Set<ContactKind>(["customer", "lead", "supplier"]).has(input.kind)) return { ok: false as const, error: "Choose a valid phone conversation and tag." }
  const name = input.name?.trim().slice(0, 160) || phone
  let sourceId = ""
  if (input.kind === "customer") {
    const existing = await supabase.from("profiles").select("id").eq("role", "client").eq("phone", phone).limit(1).maybeSingle<{ id: string }>()
    if (existing.error) return { ok: false as const, error: "The customer directory could not be checked." }
    if (existing.data?.id) sourceId = existing.data.id
    else {
      const created = await supabase.functions.invoke<{ ok?: boolean; customerId?: string }>("create-manager-client", { body: { fullName: name, email: phoneLoginEmailForPhone(phone), phone, companyName: null } })
      if (created.error || !created.data?.ok || !created.data.customerId) return { ok: false as const, error: "The customer could not be added." }
      sourceId = created.data.customerId
    }
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
