import { readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

const root = process.cwd()

test("manager communications shortcut opens the unified internal log", async () => {
  const [shell, page, workspace] = await Promise.all([
    readFile(path.join(root, "components/buildflow/admin-shell.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/communications/page.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/unified-communication-inbox.tsx"), "utf8"),
  ])

  expect(shell).toContain('href: "/admin/communications"')
  expect(page).toContain("initialChannelFilter")
  expect(page).toContain('requestedChannel === "email-list"')
  expect(workspace).toContain("useState(initialChannelFilter)")
  expect(workspace).toContain("useState(initialQuery)")
  expect(workspace).toContain("initialCommunicationForQuery(communications, initialQuery, initialChannelFilter)")
  expect(workspace).toContain("changeChannelFilter")
})

test("manager communications can reach customers, leads, and suppliers", async () => {
  const [page, workspace] = await Promise.all([
    readFile(path.join(root, "app/admin/communications/page.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/unified-communication-inbox.tsx"), "utf8"),
  ])

  expect(page).toContain('from("manager_outreach_leads")')
  expect(page).toContain('rpc("staff_load_supplier_directory_snapshot")')
  expect(page).toContain("leads={liveAura.leads}")
  expect(page).toContain("suppliers={liveAura.suppliers}")
  expect(workspace).toContain('<option value="customer">Customers</option>')
  expect(workspace).toContain('<option value="lead">Leads</option>')
  expect(workspace).toContain('<option value="supplier">Suppliers / Vendors</option>')
  expect(workspace).toContain('nextChannel === "whatsapp"')
  expect(workspace).toContain("Unified communications inbox")
  expect(workspace).toContain("Suppliers / Vendors")
  expect(workspace).toContain("ExpandableMessage")
  expect(workspace).toContain("Link email to…")
  expect(workspace).toContain('<optgroup label="Leads">')
})

test("manager communications support file attachments and phone-number history", async () => {
  const [workspace, actions] = await Promise.all([
    readFile(path.join(root, "components/buildflow/unified-communication-inbox.tsx"), "utf8"),
    readFile(path.join(root, "app/owner/aura/actions.ts"), "utf8"),
  ])

  expect(workspace).toContain('aria-label="Remove attachment"')
  expect(workspace).toContain("Add attachment")
  expect(actions).toContain("Keep Q U O attachments under 5 MB")
  expect(workspace).toContain("Search chats")
  expect(workspace).toContain("activeConversation.messages.map")
  expect(workspace).toContain("prepared.quoWebUrl")
  expect(workspace).toContain("prepared.attachmentUrl")
  expect(workspace).toContain("/api/admin/communications/updates?after=")
  expect(workspace).toContain("window.setTimeout(sync, delay)")
  expect(actions).toContain('quoWebUrl: "https://my.quo.com/inbox"')
  expect(actions).toContain("attachmentUrl: signed.data.signedUrl")
  expect(actions).toContain("prepareQuoAttachmentMessageAction")
  expect(actions).toContain("5 * 1024 * 1024")
})

test("WhatsApp failures explain Sandbox and reply-window requirements", async () => {
  const actions = await readFile(path.join(root, "app/owner/aura/actions.ts"), "utf8")

  expect(actions).toContain("function whatsappSendError")
  expect(actions).toContain('detail.includes("63015")')
  expect(actions).toContain('detail.includes("63016")')
  expect(actions).toContain("joined the Avantia Twilio Sandbox")
  expect(actions).toContain("outside the 24-hour reply window")
})

test("supplier draft supports channel checkboxes and an exact safe preview", async () => {
  const draft = await readFile(path.join(root, "components/buildflow/supplier-request-draft.tsx"), "utf8")
  const page = await readFile(path.join(root, "app/owner/materials/requests/[requestId]/supplier-request/page.tsx"), "utf8")

  expect(draft).toContain('type DeliveryChannel = "email" | "sms" | "whatsapp"')
  expect(draft).toContain("Exact message preview")
  expect(draft).toContain('"Client: Avantia Build"')
  expect(draft).toContain("Shipping address:")
  expect(draft).toContain("sendAuraMessageAction")
  expect(page).toContain("preferredDeliveryMethod")
  expect(page).toContain("whatsapp: supplier.whatsapp")
})

test("trusted phone ADD commands require AI review and owner approval", async () => {
  const [broker, command, intake] = await Promise.all([
    readFile(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8"),
    readFile(path.join(root, "supabase/functions/_shared/trusted-phone-intake-routing.ts"), "utf8"),
    readFile(path.join(root, "lib/aura/intake.ts"), "utf8"),
  ])

  expect(command).toContain("trustedPhoneAddCommandText")
  expect(command).toContain("isExplicitTrustedPhoneAddCommand")
  expect(broker).toContain("createTrustedSmsIntake")
  expect(broker).toContain("Nothing is saved until the owner approves it")
  expect(intake).toContain('z.enum(["contact", "client", "lead", "task", "material_request"])')
  expect(intake).toContain("Reply CONFIRM")
})
