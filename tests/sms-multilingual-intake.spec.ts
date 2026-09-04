import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { isExplicitCustomerRequestConfirmation } from "@/supabase/functions/_shared/customer-request-confirmation";
import {
  evaluateSmsReplyGate,
  looksLikeSmsMaterialRequest,
  normalizeSmsMaterialAnswerTypos,
  smsMaterialIntelligenceAssessment,
  smsReplyLanguage,
} from "@/supabase/functions/_shared/sms-reply-policy";

const root = process.cwd();

test("normalizes English speech-to-text quantities, products, fractions, and dimensions", () => {
  const drywall = normalizeSmsMaterialAnswerTypos(
    "fifty sheets of sheet rack five eighths relugar",
  );
  const lumber = normalizeSmsMaterialAnswerTypos(
    "25 peace two by four by eight lumber",
  );

  expect(drywall).toBe("50 sheets of sheetrock 5/8 regular");
  expect(looksLikeSmsMaterialRequest(drywall)).toBe(true);
  expect(smsMaterialIntelligenceAssessment(drywall)).toMatchObject({
    readyForConfirmation: true,
    questions: [],
  });
  expect(lumber).toBe("25 pieces 2x4x8 lumber");
  expect(looksLikeSmsMaterialRequest(lumber)).toBe(true);
});

test("normalizes Spanish misspellings and units without switching the reply language", () => {
  const raw = "nececito cincuenta paneles de yesso regular de cinco octavos";
  const normalized = normalizeSmsMaterialAnswerTypos(raw);

  expect(smsReplyLanguage(raw)).toBe("es");
  expect(normalized).toContain("necesito 50 paneles de yeso regular de 5/8");
  expect(smsMaterialIntelligenceAssessment(normalized)).toMatchObject({
    readyForConfirmation: true,
    questions: [],
  });
});

test("accepts clear English and Spanish approval but not a cancellation", () => {
  expect(isExplicitCustomerRequestConfirmation("That's correct.")).toBe(true);
  expect(isExplicitCustomerRequestConfirmation("Está correcto")).toBe(true);
  expect(isExplicitCustomerRequestConfirmation("Apruebo")).toBe(true);
  expect(isExplicitCustomerRequestConfirmation("No confirmo")).toBe(false);
});

test("blocks an AI reply that chooses an unrequested product solution", () => {
  const gate = evaluateSmsReplyGate({
    message: "I need drywall",
    reply: "The best option is Type X drywall.",
    intent: "material_request",
    participantRole: "lead",
    modelAutoSafe: true,
  });

  expect(gate.level).toBe("red");
  expect(gate.gateAutoSafe).toBe(false);
  expect(gate.signals).toContain("reply proposes an unrequested product solution");
});

test("broker preserves raw text, binds quantities per line, and sends one ordered opening", async () => {
  const broker = await readFile(
    path.join(root, "supabase/functions/aura-messaging-broker/index.ts"),
    "utf8",
  );

  expect(broker).toContain("SMS_MULTILINGUAL_INTAKE_REQUIREMENTS");
  expect(broker).toContain("Preserve raw customer wording for audit");
  expect(broker).toContain("Bind each quantity and unit only to its own material line");
  expect(broker).toContain("never place an order");
  expect(broker).toContain("normalizeSmsMaterialAnswerTypos(rawLine)");
  expect(broker).toContain("One logical outbound message prevents an example");
  expect(broker).toContain("sendQuoSms(phone, PUBLIC_START_TEXT_OPENING)");
  expect(broker).not.toContain("sendQuoSms(phone, PUBLIC_START_TEXT_EXAMPLE)");
});
