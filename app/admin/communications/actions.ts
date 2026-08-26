"use server"

import { revalidatePath } from "next/cache"

import { requireManagerPortalProfile } from "@/lib/auth"
import { normalizeAuraEmail, normalizeAuraPhone } from "@/lib/aura/communications"
import { serializeCommunicationLog, type CommunicationLog } from "@/lib/manager-command-center"
import { createAdminClient } from "@/lib/supabase/admin"
import { addAuraCommunicationLinks, type AuraEmailEntityType } from "@/lib/aura/email-links"

type ContactKind = "customer" | "lead" | "supplier"
type Result = { ok: true } | { ok: false; error: string }

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
  const { access } = await requireManagerPortalProfile()
  if (!access.customers) return { ok: false as const, error: "Customer communication access is required." }
  if (!new Set<ContactKind>(["customer", "lead", "supplier"]).has(input.kind) || !/^[A-Za-z0-9_-]{1,160}$/.test(input.sourceId)) {
    return { ok: false as const, error: "Choose a valid contact." }
  }
  const conversationPhone = normalizeAuraPhone(input.conversationPhone || "")
  const conversationEmail = normalizeAuraEmail(input.conversationEmail || "")
  if (!conversationPhone && !conversationEmail) return { ok: false as const, error: "This conversation has no phone or email to link." }

  const admin = createAdminClient()
  let existingQuery = admin.from("aura_contacts").select("id").limit(1)
  existingQuery = conversationPhone ? existingQuery.eq("normalized_phone", conversationPhone) : existingQuery.ilike("email", conversationEmail!)
  const existing = await existingQuery.maybeSingle()
  if (existing.error) return { ok: false as const, error: "The contact link could not be checked." }

  const contactValues = {
    full_name: input.name.trim().slice(0, 160) || "Linked contact",
    company: input.company?.trim().slice(0, 160) || null,
    normalized_phone: conversationPhone,
    email: conversationEmail,
    notes: `Avantia link:${input.kind}:${input.sourceId}`,
  }
  const contact = existing.data?.id
    ? await admin.from("aura_contacts").update(contactValues).eq("id", existing.data.id).select("id").single()
    : await admin.from("aura_contacts").insert(contactValues).select("id").single()
  if (contact.error || !contact.data?.id) return { ok: false as const, error: "The contact link could not be saved." }

  let communicationQuery = admin.from("aura_communications").update({ contact_id: contact.data.id })
  communicationQuery = conversationPhone
    ? communicationQuery.eq("counterparty_phone", conversationPhone)
    : communicationQuery.ilike("counterparty_email", conversationEmail!)
  const updated = await communicationQuery
  if (updated.error) return { ok: false as const, error: "The conversation could not be assigned." }

  const { data: emailCommunications } = await admin.from("aura_communications").select("id").eq("channel", "email").ilike("counterparty_email", conversationEmail || input.email || "")
  await addAuraCommunicationLinks((emailCommunications ?? []).map((item) => item.id), [{ entity_type: input.kind === "customer" ? "client" : input.kind, entity_id: input.sourceId, entity_label: input.name, link_source: "manual", confidence: 1 }], undefined)

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
