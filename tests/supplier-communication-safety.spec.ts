import { readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

import { supplierFollowUpAction } from "../lib/supplier-follow-up-policy"

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
  const [page, broker] = await Promise.all([
    readFile(path.join(root, "app/owner/materials/requests/[requestId]/page.tsx"), "utf8"),
    readFile(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8"),
  ])

  expect(page).toContain('action: "load_request_communications"')
  expect(page).toContain('structuredSupplierCommunicationIds')
  expect(page).toContain('Could not load request communications')
  expect(page).not.toContain('.eq("channel", "email")')
  expect(page).not.toContain("createAdminClient")
  expect(broker).toContain('input.action === "load_request_communications"')
  expect(broker).toContain("request_link.entity_type = 'material_request'")
  expect(broker).toContain("link.entity_type in ('client', 'supplier')")
})

test("supplier updates suppress generic phone pushes and use the website workflow", async () => {
  const broker = await readFile(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8")
  expect(broker).toContain('Handled in supplier communication workflow')
  expect(broker).toContain('call_message:${input.communicationId}')
  expect(broker).toContain('missed_call:${input.communicationId}')
  expect(broker.indexOf('Handled in supplier communication workflow')).toBeLessThan(broker.indexOf('if (input.direction !== "incoming") return;'))
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
  expect(notifications).toContain('.eq("tag", "supplier-follow-up")')
  expect(notifications).toContain('reminderCreatedAtByKey')
  expect(notifications).toContain('supplierFollowUpAction')
  expect(notifications).not.toContain('occurredAt > row.updated_at')
  expect(notifications).not.toContain('.limit(50)')
})

test("follow-up policy advances only after a real post-reminder supplier message", () => {
  const cutoff = "2026-09-07T12:00:00.000Z"
  const firstReminderAt = "2026-09-04T12:00:00.000Z"
  const secondReminderAt = "2026-09-05T12:00:00.000Z"

  expect(supplierFollowUpAction({ cutoff, outboundActivity: [] })).toBe("follow_up_1")
  expect(supplierFollowUpAction({ cutoff, firstReminderAt, outboundActivity: [] })).toBeNull()
  expect(supplierFollowUpAction({ cutoff, firstReminderAt, outboundActivity: ["2026-09-03T12:00:00.000Z"] })).toBeNull()
  expect(supplierFollowUpAction({ cutoff, firstReminderAt, outboundActivity: ["2026-09-04T13:00:00.000Z"] })).toBe("follow_up_2")
  expect(supplierFollowUpAction({ cutoff, firstReminderAt, secondReminderAt, outboundActivity: ["2026-09-05T13:00:00.000Z"] })).toBe("no_response")
  expect(supplierFollowUpAction({ cutoff, firstReminderAt, secondReminderAt, outboundActivity: ["2026-09-07T13:00:00.000Z"] })).toBeNull()
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

test("supplier profiles expose one-tap mobile sharing with a clipboard fallback", async () => {
  const directory = await readFile(path.join(root, "components/buildflow/supplier-routing-manager.tsx"), "utf8")

  expect(directory).toContain("async function shareSupplier")
  expect(directory).toContain("navigator.share")
  expect(directory).toContain("navigator.clipboard.writeText")
  expect(directory).toContain("void shareSupplier(selectedSupplier)")
  expect(directory).toContain("<Share2")
})
