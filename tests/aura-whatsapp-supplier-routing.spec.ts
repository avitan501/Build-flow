import { readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

const root = process.cwd()

test("manager WhatsApp shortcut opens the internal filtered communication log", async () => {
  const [shell, page, workspace] = await Promise.all([
    readFile(path.join(root, "components/buildflow/admin-shell.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/communications/page.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/aura-communication-workspace.tsx"), "utf8"),
  ])

  expect(shell).toContain("/admin/communications?channel=whatsapp")
  expect(page).toContain("initialChannelFilter")
  expect(workspace).toContain("useState(initialChannelFilter)")
  expect(workspace).toContain("useState(initialQuery)")
})

test("manager communications can reach customers, leads, and suppliers", async () => {
  const [page, workspace] = await Promise.all([
    readFile(path.join(root, "app/admin/communications/page.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/aura-communication-workspace.tsx"), "utf8"),
  ])

  expect(page).toContain('from("manager_outreach_leads")')
  expect(page).toContain('rpc("staff_load_supplier_directory_snapshot")')
  expect(page).toContain("leads={liveAura.leads}")
  expect(page).toContain("suppliers={liveAura.suppliers}")
  expect(workspace).toContain('<option value="customer">Customers</option>')
  expect(workspace).toContain('<option value="lead">Leads</option>')
  expect(workspace).toContain('<option value="supplier">Suppliers</option>')
  expect(workspace).toContain('if (channel === "whatsapp") return recipient.whatsapp || recipient.phone')
  expect(workspace).toContain("Contact someone")
})

test("manager communications support removable photos and phone-number history", async () => {
  const [workspace, actions] = await Promise.all([
    readFile(path.join(root, "components/buildflow/aura-communication-workspace.tsx"), "utf8"),
    readFile(path.join(root, "app/owner/aura/actions.ts"), "utf8"),
  ])

  expect(workspace).toContain('aria-label="Remove attached photo"')
  expect(workspace).toContain("By phone number")
  expect(workspace).toContain("communicationsByNumber")
  expect(workspace).toContain("prepared.quoWebUrl")
  expect(workspace).toContain("prepared.attachmentUrl")
  expect(workspace).toContain("Confirm Delivered or Read")
  expect(workspace).toContain("window.setInterval(refresh, 10_000)")
  expect(workspace).toContain("Live · updates every 10 sec")
  expect(actions).toContain('quoWebUrl: "https://my.quo.com/inbox"')
  expect(actions).toContain("attachmentUrl: signed.data.signedUrl")
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

test("owner ADD WhatsApp commands require AI review and confirmation", async () => {
  const [route, command, intake] = await Promise.all([
    readFile(path.join(root, "app/api/aura/whatsapp/twilio/route.ts"), "utf8"),
    readFile(path.join(root, "lib/aura/owner-command.ts"), "utf8"),
    readFile(path.join(root, "lib/aura/intake.ts"), "utf8"),
  ])

  expect(route).toContain("processAuraOwnerCommand")
  expect(command).toContain("OWNER_ADD_PHONE")
  expect(command).toContain("createAuraIntake")
  expect(command).toContain("confirmAuraIntakeByCode")
  expect(command).toContain("cancelAuraIntakeByCode")
  expect(command).toContain("/^add")
  expect(intake).toContain('z.enum(["client", "lead", "task", "material_request"])')
  expect(intake).toContain("Reply CONFIRM")
})
