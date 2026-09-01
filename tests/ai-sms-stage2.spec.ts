import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

test("trusted phone intake reads screenshots and safely joins follow-up messages", () => {
  const broker = readFileSync(
    path.join(root, "supabase/functions/aura-messaging-broker/index.ts"),
    "utf8",
  );

  expect(broker).toContain('type: "input_image"');
  expect(broker).toContain("visionImageInputs(media)");
  expect(broker).toContain("interval '5 minutes'");
  expect(broker).toContain("sms_message_joined");
  expect(broker).toContain("prior.missing_count > 0");
  expect(broker).toContain("continuation");
  expect(broker).toContain("trustedImageMedia(media).length > 0");
  expect(broker).toContain('"+15169398484"');
  expect(broker).toContain("isTrustedSmsCommandPhone(counterpartyPhone)");
  expect(broker).toContain('"idea" | "material_request"');
  expect(broker).toContain("ADD IDEA must use recordType idea");
  expect(broker).toContain('commandType === "idea"');
  expect(broker).toContain("quoPolledMedia(message)");
  expect(broker).toContain("createTrustedSmsIntake(");
  expect(broker).toContain("autoRouteTrustedSmsToDavid");
  expect(broker).toContain("intake_auto_routed_to_david");
  expect(broker).toContain("'David Dashboard'");
});

test("supplier screenshots remain drafts until the owner approves them", () => {
  const broker = readFileSync(
    path.join(root, "supabase/functions/aura-messaging-broker/index.ts"),
    "utf8",
  );
  const actions = readFileSync(
    path.join(root, "app/owner/aura/actions.ts"),
    "utf8",
  );

  expect(broker).toContain('"supplier"');
  expect(broker).toContain("finalize_trusted_sms_supplier");
  expect(actions).toContain("staff_upsert_supplier_directory_entry");
  expect(actions).toContain('trustLevel: "not-reviewed"');
  expect(actions).toContain("finalize_trusted_sms_supplier");
});

test("material request details do not require a Vercel service-role key to open", () => {
  const page = readFileSync(
    path.join(root, "app/owner/materials/requests/[requestId]/page.tsx"),
    "utf8",
  );

  expect(page).not.toContain("createAdminClient");
  expect(page).toContain('.from("aura_communication_links")');
});

test("phone AI stays concise and never fills optional details with guesses", () => {
  const broker = readFileSync(
    path.join(root, "supabase/functions/aura-messaging-broker/index.ts"),
    "utf8",
  );

  expect(broker).toContain("Keep the summary to one short factual sentence");
  expect(broker).toContain("do not repeat the original message");
  expect(broker).toContain("do not ask for optional details");
  expect(broker).toContain("A supplier name or company name alone is enough");
  expect(broker).toContain("Carlos always means Avantia's employee Carlos");
  expect(broker).toContain('recordType === "supplier" && supplier?.name');
  expect(broker).toContain("max_output_tokens: 900");
  expect(broker).toContain("candidate.summary.trim().slice(0, 180)");
});

test("Phone intake is flat inside David Dashboard and absent from Carlos", () => {
  const goals = readFileSync(
    path.join(root, "app/admin/goals-progress/page.tsx"),
    "utf8",
  );
  const dashboard = readFileSync(
    path.join(root, "app/admin/build-map/page.tsx"),
    "utf8",
  );
  const inbox = readFileSync(
    path.join(root, "app/owner/ai-inbox/page.tsx"),
    "utf8",
  );
  const david = readFileSync(
    path.join(root, "app/admin/goals-progress/website-work/page.tsx"),
    "utf8",
  );

  expect(goals).toContain("Carlos Dashboard");
  expect(goals).not.toContain("Phone Intake Tasks");
  expect(goals).not.toContain("Work areas");
  expect(david).toContain("Phone Intake");
  expect(david).toContain("To David");
  expect(david).toContain("To Carlos");
  expect(david).toContain("deletePhoneIntakeAction");
  expect(david).toContain("TRUSTED_OWNER_SMS_PHONES");
  expect(david).toContain("ADD IDEA");
  expect(david).toContain("347-567-5077");
  expect(david).toContain("go straight to David Tasks");
  expect(david).toContain('value="david"');
  expect(david).not.toContain("ManagerNotificationCenter");
  expect(dashboard).not.toContain('label: "AI Phone Inbox"');
  expect(inbox).toContain('href="/admin/goals-progress"');
  expect(inbox).not.toContain("Supplier details were not included");
});

test("ADD IDEA routes to David's Ideas list while Carlos receives a task", async () => {
  const actions = readFileSync(
    path.join(root, "app/admin/goals-progress/website-work/actions.ts"),
    "utf8",
  );

  expect(actions).toContain('destination === "david" && recordType === "idea"');
  expect(actions).toContain('item_kind: itemKind');
  expect(actions).toContain('published_to_carlos: destination === "carlos"');
  expect(actions).toContain('source_chat_title: "David Dashboard"');
});

test("phone intake is an allowed canonical dashboard category", () => {
  const migration = readFileSync(
    path.join(
      root,
      "supabase/migrations/20260901234403_allow_phone_intake_dashboard_items.sql",
    ),
    "utf8",
  );

  expect(migration).toContain("'phone_intake'");
  expect(migration).toContain("website_work_items_category_check");
});
