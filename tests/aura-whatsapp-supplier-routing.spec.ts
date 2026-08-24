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
  const [route, intake] = await Promise.all([
    readFile(path.join(root, "app/api/aura/whatsapp/twilio/route.ts"), "utf8"),
    readFile(path.join(root, "lib/aura/intake.ts"), "utf8"),
  ])

  expect(route).toContain("OWNER_ADD_PHONE")
  expect(route).toContain("createAuraIntake")
  expect(route).toContain("confirmAuraIntakeByCode")
  expect(route).toContain("cancelAuraIntakeByCode")
  expect(route).toContain("/^add")
  expect(intake).toContain('z.enum(["client", "lead", "task", "material_request"])')
  expect(intake).toContain("Reply CONFIRM")
})
