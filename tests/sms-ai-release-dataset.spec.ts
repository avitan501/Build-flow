import { expect, test } from "@playwright/test"
import {
  classifySmsReplyIntent,
  evaluateSmsReplyGate,
  inspectSmsQuestionStructure,
  isSmsOptOutMessage,
  smsReplyParts,
  smsReplyLanguage,
  smsUnansweredFollowUpEligible,
} from "../supabase/functions/_shared/sms-reply-policy"
import { smsAiReleaseDataset } from "./fixtures/sms-ai-release-dataset"

test("SMS AI release dataset enforces intent, auto-send safety, language, and reply shape", () => {
  expect(new Set(smsAiReleaseDataset.slice(0, 10).map((entry) => entry.style)).size).toBe(10)
  expect(new Set(smsAiReleaseDataset.map((entry) => entry.expectedLanguage))).toEqual(new Set(["en", "es", "he"]))

  for (const scenario of smsAiReleaseDataset) {
    if (scenario.expectedIntent === "opt_out") {
      expect(isSmsOptOutMessage(scenario.message), scenario.id).toBe(true)
      expect(scenario.expectedAutoSafe, scenario.id).toBe(false)
      expect(smsUnansweredFollowUpEligible({
        originalMessage: scenario.message,
        questionReply: "What quantity?",
        intent: "material_request",
        event: "message",
        participantRole: "lead",
        safetyLevel: "green",
        gateAutoSafe: true,
      }), scenario.id).toBe(false)
      continue
    }

    const intent = classifySmsReplyIntent({
      message: scenario.message,
      event: scenario.event || "message",
      participantRole: scenario.participantRole || "lead",
    })
    expect(intent, `${scenario.id}: intent`).toBe(scenario.expectedIntent)
    expect(smsReplyLanguage(`${scenario.message}\n${scenario.reply}`), `${scenario.id}: language`).toBe(scenario.expectedLanguage)

    const shape = inspectSmsQuestionStructure(scenario.reply)
    expect(shape.questionMarks, `${scenario.id}: question count`).toBeLessThanOrEqual(scenario.maxQuestions)
    for (const field of scenario.requiredFields || []) {
      expect(shape.fields, `${scenario.id}: required field ${field}`).toContain(field)
    }
    if (scenario.forbiddenText) expect(scenario.reply, `${scenario.id}: forbidden reply text`).not.toMatch(scenario.forbiddenText)

    const decision = evaluateSmsReplyGate({
      message: scenario.message,
      reply: scenario.reply,
      intent,
      event: scenario.event || "message",
      participantRole: scenario.participantRole || "lead",
      modelAutoSafe: scenario.modelAutoSafe ?? true,
    })
    expect(decision.gateAutoSafe, `${scenario.id}: autoSafe`).toBe(scenario.expectedAutoSafe)

    if (scenario.id === "direct-sheetrock-two-part") {
      const parts = smsReplyParts({ reply: scenario.reply, deterministicProductInquiry: true })
      expect(parts).toHaveLength(2)
      expect(parts[0]).toContain("check the plans/code")
      expect(parts[0]).toContain("How many sheets")
      expect(parts[1]).toContain("joint compound, tape, corner bead, or drywall screws")
      expect(new Set(parts).size).toBe(parts.length)
    }
  }
})
