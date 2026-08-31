import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import {
  activeRequestUpdateReply,
  additionalItemsQuestion,
  customerFinishedMaterialList,
  customerWantsAnotherItem,
  deliveryAddressQuestion,
} from "../supabase/functions/_shared/customer-request-completion";
import { evaluateSmsReplyGate } from "../supabase/functions/_shared/sms-reply-policy";

const root = process.cwd();

test("material intake asks for more items and address before confirmation", async () => {
  expect(additionalItemsQuestion("10 buckets")).toBe(
    "Do you need anything else on this list?",
  );
  expect(customerWantsAnotherItem("Yes")).toBe(true);
  expect(customerFinishedMaterialList("No")).toBe(true);
  expect(customerFinishedMaterialList("That's all")).toBe(true);
  expect(customerFinishedMaterialList("זה הכל")).toBe(true);
  expect(deliveryAddressQuestion("No")).toBe(
    "What is the full delivery address?",
  );

  const broker = await readFile(
    path.join(root, "supabase/functions/aura-messaging-broker/index.ts"),
    "utf8",
  );
  expect(broker).toContain('lastAskedSlots.includes("additional_items")');
  expect(broker).toContain("listComplete &&");
  expect(broker).toContain("deliveryAddressKnown &&");
  expect(broker).toContain("!input.customerAddress.trim()");
});

test("submitted request updates stay on the same request in every supported language", async () => {
  expect(activeRequestUpdateReply("add 4 boxes of screws", "item")).toBe(
    "The item was added to the same request for review. Do you need anything else?",
  );
  expect(activeRequestUpdateReply("change it to 20", "correction")).toBe(
    "The correction was added to the same request for review. Do you need to change anything else?",
  );
  expect(activeRequestUpdateReply("הכתובת היא 10 Main St", "address")).toBe(
    "הכתובת עודכנה באותה בקשה. צריך להוסיף עוד משהו?",
  );
  expect(activeRequestUpdateReply("agrega 5 cajas", "item")).toBe(
    "El artículo se agregó a la misma solicitud para revisión. ¿Necesita agregar algo más?",
  );
  for (const [message, update] of [
    ["add 4 boxes of screws", "item"],
    ["change it to 20", "correction"],
    ["הכתובת היא 10 Main St", "address"],
    ["agrega 5 cajas", "item"],
  ] as const) {
    expect(
      evaluateSmsReplyGate({
        message,
        reply: activeRequestUpdateReply(message, update),
        intent: "greeting",
        event: "message",
        participantRole: "lead",
        modelAutoSafe: true,
      }),
    ).toMatchObject({ level: "green", gateAutoSafe: true });
  }

  const broker = await readFile(
    path.join(root, "supabase/functions/aura-messaging-broker/index.ts"),
    "utf8",
  );
  expect(broker).toContain("async function loadActiveSubmittedSmsRequest");
  expect(broker).toContain("async function syncActiveSubmittedSmsRequest");
  expect(broker).toContain("request.status <> 'closed'");
  expect(broker).toContain(
    "explicitlyStartsNewRequest && !activeSubmittedRequest",
  );
  expect(broker).toContain("created_from_customer_sms_update: true");
  expect(broker).toContain("sms_customer_updated_open_request");
  expect(broker).toContain("!activeSubmittedRequest &&");
  expect(broker).toContain("resetListComplete:");
  expect(broker).toContain(
    "when ${params.resetListComplete === true} then false",
  );
  expect(broker).not.toContain(
    "update public.projects set address = ${input.customerAddress",
  );
});
