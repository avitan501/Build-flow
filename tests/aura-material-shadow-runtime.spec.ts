import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

test("material intelligence runs only as isolated, feature-flagged shadow work", async () => {
  const broker = await readFile(
    path.join(root, "supabase/functions/aura-messaging-broker/index.ts"),
    "utf8",
  );
  expect(broker).toContain('Deno.env.get("AURA_MATERIAL_SHADOW_ENABLED") === "false"');
  expect(broker).toContain("EdgeRuntime.waitUntil(");
  expect(broker).toContain("runMaterialShadowAssessment(communicationId).catch");
  expect(broker).toContain("draft_only = true");
  expect(broker).toContain("common_map_status in ('draft','reviewed')");
  expect(broker).not.toContain("assessment.reply");
  expect(broker).not.toContain("sendQuoSms(assessment");
});

test("shadow context is cross-channel, bounded, and idempotent", async () => {
  const broker = await readFile(
    path.join(root, "supabase/functions/aura-messaging-broker/index.ts"),
    "utf8",
  );
  expect(broker).toContain("channel in ('sms','whatsapp')");
  expect(broker).toContain("row(occurred_at, created_at, id) <= row(");
  expect(broker).toContain("smsMessagesAfterConfirmedRequest(");
  expect(broker).toContain("on conflict (communication_id) do update");
  expect(broker).toContain("scheduleMaterialShadowAssessment(stored[0].id)");
  expect(broker).toContain("scheduleMaterialShadowAssessment(inserted[0].id)");
});

test("only approved verified evidence is allowed into shadow sources", async () => {
  const broker = await readFile(
    path.join(root, "supabase/functions/aura-messaging-broker/index.ts"),
    "utf8",
  );
  expect(broker).toContain("manager_approved = true and verified_at is not null");
  expect(broker).not.toContain("safe_account_reference");
  expect(broker).not.toContain("private supplier price");
});
