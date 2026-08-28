import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"

const root = process.cwd()

test("each incoming SMS can be reviewed and converted into a Carlos request", async () => {
  const [workspace, actions, broker] = await Promise.all([
    readFile(path.join(root, "components/buildflow/unified-communication-inbox.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/communications/actions.ts"), "utf8"),
    readFile(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8"),
  ])

  expect(workspace).toContain("Create request")
  expect(workspace).toContain("Review new request")
  expect(workspace).toContain("Nothing is created until you confirm")
  expect(workspace).toContain("Confirm & create")
  expect(actions).toContain("review_sms_request")
  expect(actions).toContain("staff_create_client_request")
  expect(actions).toContain('manager_assignee: "carlos"')
  expect(broker).toContain("reviewSmsConversation")
  expect(broker).toContain("sourceCommunicationIds")
})

test("AI keeps the sender phone as fallback and extracts later names and addresses for review", async () => {
  const [broker, migration] = await Promise.all([
    readFile(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260828143000_expand_sms_request_review.sql"), "utf8"),
  ])

  expect(broker).toContain("explicitly identifies their personal or company name")
  expect(broker).toContain("complete street address")
  expect(broker).toContain("A clear construction-material list written by the Customer is a material request")
  expect(broker).toContain("extractReviewMaterialLines")
  expect(broker).toContain('unitAliases')
  expect(broker).toContain("dimensionalMaterial")
  expect(broker).toContain("selected.counterparty_phone")
  expect(broker).toContain("New text reviewed by AI")
  expect(migration).toContain("customer_address")
  expect(migration).toContain("source_communication_ids")
  expect(migration).toContain("awaiting manager review")
})

test("the request is linked back to the SMS conversation without exposing privileged keys", async () => {
  const [actions, broker] = await Promise.all([
    readFile(path.join(root, "app/admin/communications/actions.ts"), "utf8"),
    readFile(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8"),
  ])

  expect(actions).toContain("link_sms_material_request")
  expect(actions).not.toContain("SUPABASE_SERVICE_ROLE_KEY")
  expect(broker).toContain("requireManager")
  expect(broker).toContain("aura_communication_links")
  expect(broker).toContain("entity_type = 'material_request'")
})
