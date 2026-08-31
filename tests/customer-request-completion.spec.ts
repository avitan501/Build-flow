import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import {
  additionalItemsQuestion,
  customerFinishedMaterialList,
  customerWantsAnotherItem,
  deliveryAddressQuestion,
} from "../supabase/functions/_shared/customer-request-completion";

const root = process.cwd();

test("material intake asks for more items and address before confirmation", async () => {
  expect(additionalItemsQuestion("10 buckets")).toBe("Do you need anything else on this list?");
  expect(customerWantsAnotherItem("Yes")).toBe(true);
  expect(customerFinishedMaterialList("No")).toBe(true);
  expect(customerFinishedMaterialList("That's all")).toBe(true);
  expect(customerFinishedMaterialList("זה הכל")).toBe(true);
  expect(deliveryAddressQuestion("No")).toBe("What is the full delivery address?");

  const broker = await readFile(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8");
  expect(broker).toContain('lastAskedSlots.includes("additional_items")');
  expect(broker).toContain("listComplete &&");
  expect(broker).toContain("deliveryAddressKnown &&");
  expect(broker).toContain("!input.customerAddress.trim()");
});
