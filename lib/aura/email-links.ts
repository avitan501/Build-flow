import "server-only"

import { normalizeAuraEmail } from "@/lib/aura/identity"
import { createAdminClient } from "@/lib/supabase/admin"

export type AuraEmailEntityType = "client" | "lead" | "supplier" | "material_request"

export type AuraCommunicationLink = {
  communication_id: string
  entity_type: AuraEmailEntityType
  entity_id: string
  entity_label: string
  link_source: "automatic" | "manual" | "thread"
  confidence: number
}

type LinkInput = Omit<AuraCommunicationLink, "communication_id">

export async function addAuraCommunicationLinks(communicationIds: string[], links: LinkInput[], createdBy?: string | null) {
  const ids = [...new Set(communicationIds.filter((id) => /^[0-9a-f-]{36}$/i.test(id)))]
  if (!ids.length || !links.length) return
  const admin = createAdminClient()
  const rows = ids.flatMap((communicationId) => links.map((link) => ({
    communication_id: communicationId,
    entity_type: link.entity_type,
    entity_id: link.entity_id.slice(0, 160),
    entity_label: link.entity_label.slice(0, 240),
    link_source: link.link_source,
    confidence: link.confidence,
    created_by: createdBy || null,
  })))
  const { error } = await admin.from("aura_communication_links").upsert(rows, { onConflict: "communication_id,entity_type,entity_id" })
  if (error) throw new Error(`Unable to link email conversation: ${error.message}`)
}

export async function autoLinkAuraEmail(input: { communicationId: string; counterpartyEmail: string | null; subject?: string | null; inReplyTo?: string | null }) {
  const email = normalizeAuraEmail(input.counterpartyEmail)
  const admin = createAdminClient()
  const links: LinkInput[] = []

  if (email) {
    const [{ data: clients }, { data: leads }, { data: settingsRow }] = await Promise.all([
      admin.from("profiles").select("id,full_name,company_name,email").eq("role", "client").ilike("email", email).limit(5),
      admin.from("manager_outreach_leads").select("id,full_name,company_name,email").ilike("email", email).limit(5),
      admin.from("workflow_manager_settings").select("state").eq("id", "singleton").maybeSingle<{ state: { qualificationSettings?: { suppliers?: Array<{ id?: string; name?: string; email?: string }> } } }>(),
    ])
    for (const client of clients ?? []) links.push({ entity_type: "client", entity_id: client.id, entity_label: client.full_name || client.company_name || client.email || "Client", link_source: "automatic", confidence: 1 })
    for (const lead of leads ?? []) links.push({ entity_type: "lead", entity_id: lead.id, entity_label: lead.full_name || lead.company_name || lead.email || "Lead", link_source: "automatic", confidence: 1 })
    for (const supplier of settingsRow?.state?.qualificationSettings?.suppliers ?? []) {
      if (normalizeAuraEmail(supplier.email) === email && supplier.id) links.push({ entity_type: "supplier", entity_id: supplier.id, entity_label: supplier.name || email, link_source: "automatic", confidence: 1 })
    }
  }

  const requestPrefix = input.subject?.match(/\[AVB-([0-9A-F]{8})\]/i)?.[1]?.toLowerCase()
  if (requestPrefix) {
    const { data: requests } = await admin.from("quote_requests").select("id,title").order("created_at", { ascending: false }).limit(500)
    const request = requests?.find((row) => row.id.toLowerCase().startsWith(requestPrefix))
    if (request) links.push({ entity_type: "material_request", entity_id: request.id, entity_label: request.title, link_source: "automatic", confidence: 1 })
  }

  if (input.inReplyTo) {
    const { data: parent } = await admin.from("aura_communications").select("id").eq("message_id", input.inReplyTo).maybeSingle<{ id: string }>()
    if (parent?.id) {
      const { data: parentLinks } = await admin.from("aura_communication_links").select("entity_type,entity_id,entity_label,confidence").eq("communication_id", parent.id).returns<Array<{ entity_type: AuraEmailEntityType; entity_id: string; entity_label: string; confidence: number }>>()
      for (const link of parentLinks ?? []) links.push({ ...link, link_source: "thread" })
    }
  }

  if (email && !links.some((link) => link.entity_type === "material_request")) {
    const { data: recent } = await admin.from("aura_communications").select("id").eq("channel", "email").ilike("counterparty_email", email).neq("id", input.communicationId).order("occurred_at", { ascending: false }).limit(5)
    const recentIds = (recent ?? []).map((row) => row.id)
    if (recentIds.length) {
      const { data: recentLinks } = await admin.from("aura_communication_links").select("entity_type,entity_id,entity_label,confidence").in("communication_id", recentIds).eq("entity_type", "material_request").limit(1).returns<Array<{ entity_type: AuraEmailEntityType; entity_id: string; entity_label: string; confidence: number }>>()
      for (const link of recentLinks ?? []) links.push({ ...link, link_source: "thread", confidence: Math.min(Number(link.confidence), 0.9) })
    }
  }

  await addAuraCommunicationLinks(input.communicationId ? [input.communicationId] : [], [...new Map(links.map((link) => [`${link.entity_type}:${link.entity_id}`, link])).values()])
}

export async function loadAuraCommunicationLinks(communicationIds: string[]) {
  if (!communicationIds.length) return [] as AuraCommunicationLink[]
  const { data, error } = await createAdminClient().from("aura_communication_links").select("communication_id,entity_type,entity_id,entity_label,link_source,confidence").in("communication_id", communicationIds).returns<AuraCommunicationLink[]>()
  if (error) return []
  return data ?? []
}
