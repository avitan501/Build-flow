import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { smsHasFullDeliveryAddress } from "../supabase/functions/_shared/sms-reply-policy";

const root = process.cwd();

test("staff SMS draft conversion cannot bypass the customer-confirmed transaction", async () => {
  const actions = await readFile(
    path.join(root, "app/owner/materials/requests/actions.ts"),
    "utf8",
  );
  const conversion = actions.slice(
    actions.indexOf("export async function convertSmsRequestDraftAction"),
    actions.indexOf("export type RequestClientQuoteInput"),
  );

  expect(conversion).toContain('requireStaffProfile("customers")');
  expect(conversion).toContain("wait for their YES");
  expect(conversion).toContain("confirmed SMS flow creates the request safely");
  expect(conversion).not.toContain(
    'supabase.rpc("staff_create_client_request"',
  );
  expect(conversion).not.toContain('from("aura_sms_request_drafts")');
});

test("staff SMS draft conversion requires a complete US delivery address", () => {
  expect(smsHasFullDeliveryAddress("123 Main St")).toBe(false);
  expect(smsHasFullDeliveryAddress("123 Main St, Cedarhurst, NY 11516")).toBe(
    true,
  );
});
