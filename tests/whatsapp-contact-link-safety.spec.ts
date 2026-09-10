import { readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

import { normalizeAuraPhone } from "../lib/aura/identity"

const read = (file: string) => readFile(path.join(process.cwd(), file), "utf8")

test("international E.164 WhatsApp numbers are accepted without a US-only rule", () => {
  expect(normalizeAuraPhone("+507 6849-9015")).toBe("+50768499015")
})

test("phone save and duplicate selection use the authenticated broker", async () => {
  const [actions, broker, inbox] = await Promise.all([
    read("app/admin/communications/actions.ts"),
    read("supabase/functions/aura-messaging-broker/index.ts"),
    read("components/buildflow/unified-communication-inbox.tsx"),
  ])
  const linkAction = actions.slice(
    actions.indexOf("export async function linkCommunicationContactAction"),
    actions.indexOf("export async function linkEmailConversationAction"),
  )

  expect(linkAction).toContain('action: "link_communication_contact"')
  expect(linkAction).not.toContain("createAdminClient")
  expect(linkAction).not.toContain("addAuraCommunicationLinks")
  expect(actions).toContain('action: "ensure_phone_customer"')
  expect(broker.indexOf("const manager = await requireManager(req)")).toBeLessThan(
    broker.indexOf('input.action === "link_communication_contact"'),
  )
  expect(broker).toContain("managerContactLinkTarget(input.kind, input.sourceId)")
  expect(broker).toContain("manager_conversation_contact_linked")
  expect(broker).toContain("on conflict (communication_id, entity_type, entity_id) do update")
  expect(inbox).toContain('activeConversation?.identityStatus === "ambiguous"')
  expect(inbox).toContain("No history was deleted.")
})

test("free-form Meta sends enforce the 24-hour window before text or media delivery", async () => {
  const [broker, actions] = await Promise.all([
    read("supabase/functions/aura-messaging-broker/index.ts"),
    read("app/owner/aura/actions.ts"),
  ])

  expect(broker).toContain("requireOpenMetaWhatsAppWindow(destination)")
  expect(broker).toContain("if (useMeta) await requireOpenMetaWhatsAppWindow(to)")
  expect(broker).toContain("and occurred_at > now() - interval '24 hours'")
  expect(actions).toMatch(/outside the 24-hour reply window/)
  expect(actions).not.toMatch(/non-US|United States only|US-only/i)
})

test("unlinked communications remain visible to authorized staff", async () => {
  const [page, updates, broker] = await Promise.all([
    read("app/admin/communications/page.tsx"),
    read("app/api/admin/communications/updates/route.ts"),
    read("supabase/functions/aura-messaging-broker/index.ts"),
  ])

  expect(page).toContain('action: "load_communication_by_id"')
  expect(page).not.toMatch(/\.from\("aura_communications"\)/)
  expect(updates).toContain('action: "load_communication_updates"')
  expect(updates).not.toMatch(/\.from\("aura_communications"\)/)
  expect(broker).toContain('input.action === "load_communication_by_id"')
  expect(broker).toContain('input.action === "load_communication_updates"')
  expect(broker).toContain("communication.last_event_at >")
})

test("the new conversation button supports every channel and a new recipient", async () => {
  const inbox = await read("components/buildflow/unified-communication-inbox.tsx")

  expect(inbox).toContain('aria-label="New conversation"')
  expect(inbox).toContain("New conversation channel")
  expect(inbox).toContain("Choose an existing contact or enter a new")
  expect(inbox).toContain('inputMode={channel === "email" ? "email" : "tel"}')
  expect(inbox).toContain('setChannel("whatsapp")')
  expect(inbox).toContain('setAttachments([])')
})

test("the compact inbox header exposes WhatsApp and contact management", async () => {
  const inbox = await read("components/buildflow/unified-communication-inbox.tsx")

  expect(inbox).toContain('aria-label="New WhatsApp message"')
  expect(inbox).toContain('title="View, edit, or link this contact"')
  expect(inbox).toContain('aria-label="Contact details and links"')
  expect(inbox).toContain("Open profile")
  expect(inbox).toContain("Link to another person…")
  expect(inbox).toContain("Add as new supplier")
})
