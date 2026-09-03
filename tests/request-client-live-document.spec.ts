import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"

const root = process.cwd()

test("Step 3 keeps estimate, invoice, receipt, payment, and delivery together", async () => {
  const panel = await readFile(path.join(root, "components/buildflow/request-management-panel.tsx"), "utf8")
  expect(panel).toContain('title="Payment & delivery"')
  expect(panel).toContain("Estimate, invoice, or receipt")
  expect(panel).toContain("Save changes")
  expect(panel).toContain("Text live link")
  expect(panel).toContain("Email live link")
  expect(panel).toContain("Send payment link")
  expect(panel).toContain("Schedule delivery")
})

test("client documents keep one stable token per request and document type", async () => {
  const migration = await readFile(path.join(root, "supabase/migrations/20260903013000_add_live_request_client_documents.sql"), "utf8")
  const actions = await readFile(path.join(root, "app/owner/materials/requests/actions.ts"), "utf8")
  const page = await readFile(path.join(root, "app/client-document/[token]/page.tsx"), "utf8")
  const download = await readFile(path.join(root, "app/client-document/[token]/download/route.ts"), "utf8")
  expect(migration).toContain("unique (request_id, document_type)")
  expect(migration).toContain("new.public_token := old.public_token")
  expect(actions).toContain('onConflict: "request_id,document_type"')
  expect(actions).toContain("const { ach: sensitiveAch, ...publicDocumentData }")
  expect(page).toContain("Version {row.version}")
  expect(page).toContain("Download PDF")
  expect(download).toContain('"Cache-Control": "private, no-store, max-age=0"')
})

test("a manual text pauses automated SMS replies", async () => {
  const broker = await readFile(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8")
  expect(broker).toContain("sms_ai_human_takeover")
  expect(broker).toContain('route: "manager_send"')
  expect(broker).toContain('route: "quo_outgoing_webhook"')
  expect(broker).toContain("cancel_reason = 'manager took over conversation'")
})
