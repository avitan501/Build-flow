import { readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

const root = process.cwd()

test("request timelines distinguish client replies from supplier replies", async () => {
  const [timeline, panel] = await Promise.all([
    readFile(path.join(root, "components/buildflow/related-email-timeline.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/request-management-panel.tsx"), "utf8"),
  ])

  expect(timeline).toContain('party === "supplier" ? "Supplier replied" : "Client replied"')
  expect(panel).toContain('party="supplier"')
  expect(panel).toContain('party="client"')
})

test("request supplier activity uses structured links across all communication channels", async () => {
  const page = await readFile(path.join(root, "app/owner/materials/requests/[requestId]/page.tsx"), "utf8")

  expect(page).toContain('"id,channel,direction,counterparty_email,counterparty_phone,subject,body,occurred_at,status,media"')
  expect(page).toContain('structuredSupplierCommunicationIds')
  expect(page).toContain('.in("entity_type", ["client", "supplier"])')
  expect(page).not.toContain('.eq("channel", "email")')
})

test("quick supplier creation is collision-safe and verified before linking", async () => {
  const actions = await readFile(path.join(root, "app/admin/communications/actions.ts"), "utf8")

  expect(actions).toContain('createHash("sha256").update(email)')
  expect(actions).toContain('emailFingerprint')
  expect(actions).toContain('verifiedSupplier')
  expect(actions).toContain('normalizeAuraEmail(verifiedSupplier.email || "") !== email')
  expect(actions).toContain('conversation was not linked')
})

test("supplier reminders count only post-status messages and cannot starve after 50 rows", async () => {
  const notifications = await readFile(path.join(root, "lib/manager-notification-store.ts"), "utf8")

  expect(notifications).toContain('.eq("should_contact", true)')
  expect(notifications).toContain('.range(from, from + pageSize - 1)')
  expect(notifications).toContain('.in("channel", ["email", "sms", "whatsapp"])')
  expect(notifications).toContain('.filter((occurredAt) => occurredAt > row.updated_at)')
  expect(notifications).toContain('followUpActivity.length >= 2')
  expect(notifications).not.toContain('.limit(50)')
})

test("supplier PDF review and supplier AI blocking remain review-only", async () => {
  const [timeline, broker] = await Promise.all([
    readFile(path.join(root, "components/buildflow/related-email-timeline.tsx"), "utf8"),
    readFile(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8"),
  ])

  expect(timeline).toContain('return { label: "Review quote"')
  expect(timeline).toContain('file.type === "application/pdf"')
  expect(broker).toContain('supplier_ai_auto_reply_blocked')
  expect(broker).toContain('entity_type = \'supplier\'')
  expect(broker).toContain('if (supplierLink[0]?.linked)')
})
