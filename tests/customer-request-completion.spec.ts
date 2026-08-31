import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import {
  activeRequestUpdateReply,
  activeRequestUpdateKind,
  additionalItemsQuestion,
  customerFinishedMaterialList,
  customerWantsAnotherItem,
  deliveryAddressQuestion,
  managerRequestAcceptsCustomerUpdates,
} from "../supabase/functions/_shared/customer-request-completion";
import {
  evaluateSmsReplyGate,
  resolveSmsDeliveryAddressKnown,
  smsHasFullDeliveryAddress,
} from "../supabase/functions/_shared/sms-reply-policy";

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

test("15 anonymized multilingual continuation variants keep one open request", () => {
  const updateCases = [
    [
      "EN address",
      { event: "message", hasAddress: true, looksLikeMaterialList: false },
      "address",
    ],
    [
      "ES address",
      { event: "message", hasAddress: true, looksLikeMaterialList: false },
      "address",
    ],
    [
      "HE address",
      { event: "message", hasAddress: true, looksLikeMaterialList: false },
      "address",
    ],
    [
      "EN correction",
      { event: "correction", hasAddress: false, looksLikeMaterialList: true },
      "correction",
    ],
    [
      "ES correction",
      { event: "correction", hasAddress: false, looksLikeMaterialList: true },
      "correction",
    ],
    [
      "HE correction",
      { event: "correction", hasAddress: false, looksLikeMaterialList: true },
      "correction",
    ],
    [
      "EN addition",
      { event: "message", hasAddress: false, looksLikeMaterialList: true },
      "item",
    ],
    [
      "ES addition",
      { event: "message", hasAddress: false, looksLikeMaterialList: true },
      "item",
    ],
    [
      "HE addition",
      { event: "message", hasAddress: false, looksLikeMaterialList: true },
      "item",
    ],
  ] as const;
  expect(updateCases).toHaveLength(9);
  for (const [, input, expected] of updateCases)
    expect(activeRequestUpdateKind(input)).toBe(expected);

  expect(customerFinishedMaterialList("No")).toBe(true);
  expect(customerFinishedMaterialList("That's all")).toBe(true);
  expect(customerFinishedMaterialList("No más")).toBe(true);
  expect(customerFinishedMaterialList("זה הכל")).toBe(true);

  expect(managerRequestAcceptsCustomerUpdates("submitted")).toBe(true);
  expect(managerRequestAcceptsCustomerUpdates("in_review")).toBe(true);
  expect(managerRequestAcceptsCustomerUpdates("quoted")).toBe(true);
  expect(managerRequestAcceptsCustomerUpdates("closed")).toBe(false);

  const blockerQuestions = [
    deliveryAddressQuestion("No"),
    deliveryAddressQuestion("No más"),
    deliveryAddressQuestion("לא תודה"),
  ];
  expect(blockerQuestions).toEqual([
    "What is the full delivery address?",
    "¿Cuál es la dirección de entrega completa?",
    "מה כתובת המשלוח המלאה?",
  ]);
  for (const question of blockerQuestions)
    expect(question.match(/\?/g)).toHaveLength(1);
});

test("natural English, Spanish, and Hebrew replies explicitly finish the list", () => {
  const terminalReplies = [
    "No",
    "No thanks",
    "No, thank you",
    "No, that's all",
    "No, deliver to 123 Main Street, Cedarhurst, NY 11516",
    "No más",
    "Nada más",
    "No, gracias",
    "No, eso es todo",
    "No, entregar a Calle Mayor 10, Madrid",
    "לא",
    "לא תודה",
    "לא, זה הכל",
    "זה הכל",
    "לא, לשלוח לרחוב הרצל 10 תל אביב",
  ];
  for (const reply of terminalReplies)
    expect.soft(customerFinishedMaterialList(reply), reply).toBe(true);

  const nonTerminalReplies = [
    "Yes",
    "Sí",
    "כן",
    "No idea which size",
    "No address yet",
    "I need no more than 10",
    "No sé cuál",
    "לא יודע איזה סוג",
  ];
  for (const reply of nonTerminalReplies)
    expect.soft(customerFinishedMaterialList(reply), reply).toBe(false);
});

test("full delivery address detection is strict and resets at a new request", () => {
  const completeAddresses = [
    "Deliver to 123 Main Street, Cedarhurst, NY 11516",
    "Enviar a Calle Mayor 10, Miami, FL 33101",
    "לשלוח לרחוב הרצל 10, Brooklyn, NY 11201",
  ];
  for (const address of completeAddresses)
    expect(smsHasFullDeliveryAddress(address), address).toBe(true);

  const incompleteAddresses = [
    "Cedarhurst, NY 11516",
    "Main Street",
    "Madrid 28001",
    "רחוב הרצל",
    "same address",
  ];
  for (const address of incompleteAddresses)
    expect(smsHasFullDeliveryAddress(address), address).toBe(false);

  expect(
    resolveSmsDeliveryAddressKnown({
      storedDraft: true,
      latestMessage: "New request: 10 sheets",
      startsNewRequest: true,
    }),
  ).toBe(false);
  expect(
    resolveSmsDeliveryAddressKnown({
      storedDraft: false,
      latestMessage: "No, deliver to 123 Main Street, Cedarhurst, NY 11516",
    }),
  ).toBe(true);
});

test("short yes replies request an item while short no replies request an address", () => {
  for (const reply of ["Yes", "Sí", "כן"])
    expect(customerWantsAnotherItem(reply), reply).toBe(true);
  for (const reply of ["No", "No más", "לא תודה"])
    expect(customerWantsAnotherItem(reply), reply).toBe(false);

  expect(deliveryAddressQuestion("No thanks")).toBe(
    "What is the full delivery address?",
  );
  expect(deliveryAddressQuestion("No, gracias")).toBe(
    "¿Cuál es la dirección de entrega completa?",
  );
  expect(deliveryAddressQuestion("לא תודה")).toBe("מה כתובת המשלוח המלאה?");
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
  expect(
    activeRequestUpdateReply("corrige la cantidad a 20", "correction"),
  ).toBe(
    "La corrección se agregó a la misma solicitud para revisión. ¿Necesita cambiar algo más?",
  );
  for (const [message, update] of [
    ["add 4 boxes of screws", "item"],
    ["change it to 20", "correction"],
    ["הכתובת היא 10 Main St", "address"],
    ["agrega 5 cajas", "item"],
    ["corrige la cantidad a 20", "correction"],
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
    expect(activeRequestUpdateReply(message, update).match(/\?/g)).toHaveLength(
      1,
    );
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
  expect(broker).toContain("syncItems: !addressOnlyUpdate");
  expect(broker).toContain("if (input.syncItems) {");
  expect(broker).toContain(
    "activeRequestSynced && clarificationQuestions.length > 0",
  );
  expect(broker).toContain(
    "when ${params.resetListComplete === true} then false",
  );
  expect(broker).not.toContain(
    "update public.projects set address = ${input.customerAddress",
  );
});
