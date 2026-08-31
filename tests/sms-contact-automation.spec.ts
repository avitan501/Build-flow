import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { isSmsOptOutMessage } from "../supabase/functions/_shared/sms-reply-policy"

const root = process.cwd()

test("communications offers guarded per-contact AI modes and fast contact tags", async () => {
  const [workspace, actions] = await Promise.all([
    readFile(path.join(root, "components/buildflow/unified-communication-inbox.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/communications/actions.ts"), "utf8"),
  ])
  for (const label of ["AI off", "AI drafts", "Auto when safe", "AI answer", "Save this number", "Link to an existing person instead"]) expect(workspace).toContain(label)
  expect(workspace).toContain("messageCanStartMaterialRequest")
  expect(workspace).toContain("Review material request")
  expect(workspace).not.toContain('!outgoing && item.channel === "sms" ? <button')
  expect(workspace).toContain("h-full min-h-0")
  expect(workspace).toContain("initialCommunicationForQuery")
  expect(workspace).toContain("initialConversationKey(initialCommunication, contacts)")
  expect(workspace).toContain("smsReplyDrafts = []")
  expect(workspace).toContain("Teach AI from my approved reply")
  expect(workspace).toContain('href="/admin/ai-tools/sms-replies"')
  for (const kind of ["customer", "lead", "supplier"]) expect(actions).toContain(`"${kind}"`)
  expect(actions).not.toContain("phoneLoginEmailForPhone")
  expect(actions).toContain("findPhoneAuthUser")
  expect(actions).toMatch(/createUser\(\{\s+phone,\s+phone_confirm: true/)
  expect(actions).toContain("staff_upsert_supplier_directory_entry")
})

test("incoming client SMS automation keeps conversational context and blocks sensitive auto replies", async () => {
  const broker = await readFile(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8")
  expect(broker).toContain("processCustomerSmsAutomation")
  expect(broker).toContain("smsConversationContext")
  expect(broker).toContain("Conversation (oldest to newest)")
  expect(broker).toContain("Never say information is missing when it is clearly present earlier")
  expect(broker).toContain("a transparent non-committal reply to an order-status follow-up")
  expect(broker).toContain("stateCreated && !params.startsNewRequest")
  expect(broker).toContain("communication.occurred_at >= current.occurred_at - interval '6 hours'")
  expect(broker).toContain('result.autoSafe;')
  expect(broker).toContain("EdgeRuntime.waitUntil(")
  expect(broker).toContain("if (shouldAuto && replyDrafts[0]?.id)")
  for (const phrase of ["STOP", "UNSUBSCRIBE", "END", "QUIT", "BAJA", "PARAR", "CANCELAR", "הסר", "הפסק"]) {
    expect(isSmsOptOutMessage(phrase), phrase).toBe(true)
  }
  expect(broker).toContain("forbiddenAuto")
  expect(broker).toContain("phone === TRUSTED_SMS_COMMAND_PHONE")
  expect(broker).toContain("likelyMaterialList")
  expect(broker).toContain("store: false")
  expect(broker).toContain("quality_check_sms_ai")
  expect(broker).toContain("max_output_tokens: 650")
  expect(broker).toContain("[Attachment included")
  expect(broker).toContain("accurateAttachmentReply")
  expect(broker).toContain("asksAboutAttachment")
  expect(broker).toContain("customerOnlyTranscript")
  expect(broker).toContain("I have your material details")
  expect(broker).toContain("A manager will confirm availability and timing")
  expect(broker).toContain('model: "local-context-fallback"')
  expect(broker).toContain("loadSmsAiSettings")
  expect(broker).toContain("autoAcknowledgeFollowUps")
  expect(broker).toContain("autoAskDeliveryDetails")
  expect(broker).toContain("send_failed")
  expect(broker).toContain("latestRows[0].id !== communicationId")
  expect(broker).toContain("I do not have a confirmed update in this chat yet")
  expect(broker).toContain("What is the delivery address?")
  expect(broker).toContain("What delivery date or time window do you need?")
  expect(broker).toContain("latestIsMaterialRequest")
  expect(broker).toContain("requestDetected: latestIsMaterialRequest && result.isMaterialRequest")
  expect(broker).toContain("loadApprovedReplyExamples")
  expect(broker).toContain("hasForbiddenAutoReplyTopic")
  expect(broker).toContain("never repeat a question already answered")
})

test("manager tools contains one global AI reply preferences page", async () => {
  const [tools, page, actions, migration] = await Promise.all([
    readFile(path.join(root, "app/admin/ai-tools/page.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/ai-tools/sms-replies/page.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/ai-tools/sms-replies/actions.ts"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260828141158_create_sms_ai_reply_preferences.sql"), "utf8"),
  ])
  expect(tools).toContain("AI Reply Settings")
  expect(tools).toContain("/admin/ai-tools/sms-replies")
  expect(page).toContain("What AI may handle automatically")
  expect(page).toContain("Always requires human confirmation")
  expect(actions).toContain("requireManagerPortalProfile")
  expect(actions).toContain("updated_by: user.id")
  expect(migration).toContain("enable row level security")
  expect(migration).toContain("private.is_admin_or_staff")
})

test("material lists from texts enter a review queue before becoming requests", async () => {
  const [migration, page, actions, communicationActions, createCustomer] = await Promise.all([
    readFile(path.join(root, "supabase/migrations/20260827233210_add_sms_contact_automation.sql"), "utf8"),
    readFile(path.join(root, "app/owner/materials/requests/page.tsx"), "utf8"),
    readFile(path.join(root, "app/owner/materials/requests/actions.ts"), "utf8"),
    readFile(path.join(root, "app/admin/communications/actions.ts"), "utf8"),
    readFile(path.join(root, "supabase/functions/create-manager-client/index.ts"), "utf8"),
  ])
  expect(migration).toContain("create table if not exists public.aura_sms_request_drafts")
  expect(migration).toContain("enable row level security")
  expect(page).toContain("Requests found in text messages")
  expect(page).toContain("customer_name")
  expect(actions).toContain("wait for their YES")
  expect(actions).not.toContain('supabase.rpc("staff_create_client_request"')
  expect(communicationActions).toMatch(/quickTagPhoneContactAction\(\{\s+phone,\s+kind: "customer"/)
  expect(communicationActions).toMatch(/\.rpc\(\s+"staff_create_client_request"/)
  expect(createCustomer).toContain('approval_status: "pending"')
})
