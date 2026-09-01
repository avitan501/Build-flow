import "server-only";

import {
  buildAuraPreview,
  cancelAuraIntakeByCode,
  confirmAuraIntakeByCode,
  createAuraIntake,
} from "@/lib/aura/intake";
import { isTrustedOwnerSmsPhone } from "@/lib/aura/trusted-owner-phones";

export async function processAuraOwnerCommand(input: {
  from: string;
  body: string;
  externalMessageId: string;
  rawPayload: unknown;
}) {
  if (!isTrustedOwnerSmsPhone(input.from) || !input.body || !input.externalMessageId) return null;

  const confirmation = /^(CONFIRM|CANCEL)\s+([A-Z0-9]{4,12})$/i.exec(input.body);
  if (confirmation) {
    const result = confirmation[1].toUpperCase() === "CONFIRM"
      ? await confirmAuraIntakeByCode(confirmation[2])
      : await cancelAuraIntakeByCode(confirmation[2]);
    if (!result.ok) return "Aura could not find an active draft with that code.";
    return confirmation[1].toUpperCase() === "CONFIRM"
      ? "Saved in Aura."
      : "Cancelled. Nothing was saved.";
  }

  if (!/^add(?:\s|:|-)/i.test(input.body)) return null;
  const requestText = input.body.replace(/^add(?:\s|:|-)*/i, "").trim();
  if (!requestText) {
    return "Write ADD followed by the client, lead, task, or material request details.";
  }

  const intake = await createAuraIntake({
    externalMessageId: input.externalMessageId,
    senderPhone: input.from,
    messageType: "text",
    messageText: requestText,
    rawPayload: input.rawPayload,
  });
  return buildAuraPreview(intake.proposal, intake.code);
}
