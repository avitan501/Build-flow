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
