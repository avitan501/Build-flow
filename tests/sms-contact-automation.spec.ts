import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"

const root = process.cwd()

test("communications offers guarded per-contact AI modes and fast contact tags", async () => {
  const [workspace, actions] = await Promise.all([
    readFile(path.join(root, "components/buildflow/unified-communication-inbox.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/communications/actions.ts"), "utf8"),
  ])
  for (const label of ["AI off", "AI drafts", "Auto when safe", "AI answer", "Tag as"]) expect(workspace).toContain(label)
  for (const kind of ["customer", "lead", "supplier"]) expect(actions).toContain(`"${kind}"`)
  expect(actions).toContain("phoneLoginEmailForPhone")
  expect(actions).toContain("staff_upsert_supplier_directory_entry")
})

test("incoming client SMS automation keeps conversational context and blocks sensitive auto replies", async () => {
  const broker = await readFile(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8")
  expect(broker).toContain("processCustomerSmsAutomation")
  expect(broker).toContain("smsConversationContext")
  expect(broker).toContain("Conversation (oldest to newest)")
  expect(broker).toContain("Never say information is missing when it is clearly present earlier")
  expect(broker).not.toContain("interval '6 hours'")
  expect(broker).toContain('result.autoSafe;')
  expect(broker).toContain("stop|unsubscribe|end|quit")
  expect(broker).toContain("forbiddenAuto")
  expect(broker).toContain("phone === TRUSTED_SMS_COMMAND_PHONE")
  expect(broker).toContain("likelyMaterialList")
  expect(broker).toContain("store: false")
  expect(broker).toContain("quality_check_sms_ai")
  expect(broker).toContain("max_output_tokens: 3000")
})

test("material lists from texts enter a review queue before becoming requests", async () => {
  const [migration, page, actions] = await Promise.all([
    readFile(path.join(root, "supabase/migrations/20260827233210_add_sms_contact_automation.sql"), "utf8"),
    readFile(path.join(root, "app/owner/materials/requests/page.tsx"), "utf8"),
    readFile(path.join(root, "app/owner/materials/requests/actions.ts"), "utf8"),
  ])
  expect(migration).toContain("create table if not exists public.aura_sms_request_drafts")
  expect(migration).toContain("enable row level security")
  expect(page).toContain("Requests found in text messages")
  expect(page).toContain("customer_name")
  expect(actions).toContain("staff_create_client_request")
  expect(actions).toContain('status: "converted"')
})
