import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  isExplicitTrustedPhoneAddCommand,
  shouldJoinTrustedPhoneIntakeFollowUp,
  stripCarlosRoutingPhrase,
  trustedPhoneDashboardTaskKey,
  trustedPhoneIntakeExternalMessageId,
  trustedPhoneIntakeDestination,
} from "../supabase/functions/_shared/trusted-phone-intake-routing";

const root = process.cwd();

test("new trusted phone tasks accept ADD at the start or in natural wording", () => {
  expect(isExplicitTrustedPhoneAddCommand("ADD call the roofer")).toBe(true);
  expect(isExplicitTrustedPhoneAddCommand(" add idea improve quote intake ")).toBe(true);
  expect(isExplicitTrustedPhoneAddCommand("Please ADD a task to call the roofer")).toBe(true);
  expect(isExplicitTrustedPhoneAddCommand("Can you add this to David: call ABC")).toBe(true);
  expect(isExplicitTrustedPhoneAddCommand("Please update the address")).toBe(false);
  expect(isExplicitTrustedPhoneAddCommand("Send additional details")).toBe(false);
  expect(isExplicitTrustedPhoneAddCommand("Please call the roofer")).toBe(false);
  expect(isExplicitTrustedPhoneAddCommand(null)).toBe(false);
});

test("a replayed David ADD message resolves to one canonical David task identity", () => {
  const message = "Add call the roofer about 123 Main Street";
  const activityId = "AC-david-add-001";
  const intakeId = "8e1a86a9-41bb-4d2b-8500-ec6fb5f08c22";

  expect(isExplicitTrustedPhoneAddCommand(message)).toBe(true);
  expect(trustedPhoneIntakeDestination(message)).toBe("david");
  expect(new Set([
    trustedPhoneIntakeExternalMessageId(activityId),
    trustedPhoneIntakeExternalMessageId(activityId),
  ])).toEqual(new Set(["quo:AC-david-add-001"]));
  expect(new Set([
    trustedPhoneDashboardTaskKey(intakeId),
    trustedPhoneDashboardTaskKey(intakeId),
  ])).toEqual(new Set([`phone-intake-${intakeId}`]));
});

test("explicit to Carlos wording chooses Carlos without polluting the title", () => {
  expect(trustedPhoneIntakeDestination("ADD call ABC Supply to Carlos")).toBe("carlos");
  expect(trustedPhoneIntakeDestination("ADD to Carlos call ABC Supply")).toBe("carlos");
  expect(trustedPhoneIntakeDestination("ADD call ABC Supply")).toBe("david");
  expect(trustedPhoneIntakeDestination("Please ADD to Carlos call ABC Supply")).toBe("carlos");
  expect(trustedPhoneIntakeDestination("Send this to Carlos")).toBe("david");
  expect(stripCarlosRoutingPhrase("To Carlos: Call ABC Supply")).toBe("Call ABC Supply");
  expect(stripCarlosRoutingPhrase("Call ABC Supply to Carlos")).toBe("Call ABC Supply");
});

test("a follow-up photo joins only a recent ADD intake and never creates a standalone task", () => {
  expect(shouldJoinTrustedPhoneIntakeFollowUp({
    body: null,
    imageCount: 1,
    priorMessageText: "ADD call ABC Supply",
    priorMissingCount: 0,
    priorAutoRouted: true,
  })).toBe(true);
  expect(shouldJoinTrustedPhoneIntakeFollowUp({
    body: null,
    imageCount: 1,
    priorMessageText: null,
    priorMissingCount: 0,
    priorAutoRouted: false,
  })).toBe(false);
  expect(shouldJoinTrustedPhoneIntakeFollowUp({
    body: null,
    attachmentCount: 1,
    priorMessageText: "Please ADD review the supplier PDF",
    priorMissingCount: 0,
    priorAutoRouted: true,
  })).toBe(true);
  expect(shouldJoinTrustedPhoneIntakeFollowUp({
    body: "ADD create another task",
    imageCount: 1,
    priorMessageText: "ADD call ABC Supply",
    priorMissingCount: 0,
    priorAutoRouted: true,
  })).toBe(false);
});

test("an incomplete ADD intake accepts a clearly related text continuation", () => {
  expect(shouldJoinTrustedPhoneIntakeFollowUp({
    body: "his phone is 516-555-1212",
    imageCount: 0,
    priorMessageText: "ADD supplier North Shore Lumber",
    priorMissingCount: 1,
    priorAutoRouted: false,
  })).toBe(true);
  expect(shouldJoinTrustedPhoneIntakeFollowUp({
    body: "I will arrive late",
    imageCount: 0,
    priorMessageText: "ADD supplier North Shore Lumber",
    priorMissingCount: 1,
    priorAutoRouted: false,
  })).toBe(false);
});

test("edge and manual routing update the same canonical website work row", async () => {
  const [broker, actions] = await Promise.all([
    readFile(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8"),
    readFile(path.join(root, "app/admin/goals-progress/website-work/actions.ts"), "utf8"),
  ]);

  expect(broker).toContain("if (!joinPrior && !isExplicitTrustedPhoneAddCommand(body)) return;");
  expect(broker).toContain("on conflict (task_key) do update set");
  expect(broker).toContain("published_to_carlos = excluded.published_to_carlos");
  expect(broker).toContain("alreadyJoined");
  expect(actions).toContain(".upsert(");
  expect(actions).toContain('{ onConflict: "task_key" }');
  expect(actions).not.toContain('insertError.code !== "23505"');
});

test("trusted phone intake keeps supported photos and documents for AI review", async () => {
  const broker = await readFile(
    path.join(root, "supabase/functions/aura-messaging-broker/index.ts"),
    "utf8",
  );

  expect(broker).toContain("function trustedAttachmentMedia");
  expect(broker).toContain("function trustedDocumentMedia");
  expect(broker).toContain('type: "input_file" as const');
  expect(broker).toContain("...documentInputs");
  expect(broker).toContain('documents.length ? "document"');
  expect(broker).toContain("attachmentCount: attachments.length");
  expect(broker).toContain("media: attachments");
  expect(broker).toContain("on conflict (external_message_id) where external_message_id is not null do update set");
  expect(broker).toContain("on conflict (task_key) do update set");
});

test("signed Quo retries stay idempotent across the production schema keys", async () => {
  const [broker, intakeSchema, communicationSchema, workSchema] = await Promise.all([
    readFile(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260821020843_create_aura_whatsapp_intake.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260821020849_create_aura_communications.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260830044717_create_website_work_items.sql"), "utf8"),
  ]);

  expect(broker).toContain('req.headers.get("openphone-signature")');
  expect(broker).toContain("validQuoSignature(");
  expect(broker).toContain('"+13475675077"');
  expect(broker).toContain("if (prior[0]?.processed_at) return json({ ok: true, duplicate: true })");
  expect(intakeSchema).toContain("create unique index if not exists aura_intakes_external_message_id_uidx");
  expect(communicationSchema).toContain("unique (provider, external_activity_id)");
  expect(communicationSchema).toContain("unique (provider, external_event_id)");
  expect(workSchema).toContain("task_key text not null unique");
});
