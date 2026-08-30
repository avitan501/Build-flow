import { expect, test } from "@playwright/test"
import { isSmsCorrectionReason, redactSmsTrainingText, smsTrainingIntent, smsTrainingLanguage } from "../lib/ai/sms-training-privacy"
import {
  classifySmsReplyIntent,
  enforceSmsOneQuestion,
  rankSmsReplyExamples,
  smsReplyLanguage,
  smsReplySuggestsOptionalItems,
  smsRequiresExactList,
} from "../supabase/functions/_shared/sms-reply-policy"
import { smsReply10StyleCases } from "./fixtures/sms-reply-10-style-cases"

test("10-style no-send simulation learns only safe manager corrections and improves related replies", () => {
  const distractors = [
    { customer_message: "Hello", approved_reply: "Hi! What materials do you need?", language: "en", intent: "greeting" },
    { customer_message: "Need a delivery", approved_reply: "What is the full delivery address?", language: null, intent: "general" },
  ]

  for (const scenario of smsReply10StyleCases) {
    const initialIntent = classifySmsReplyIntent({ message: scenario.message, event: scenario.event })
    const nextIntent = classifySmsReplyIntent({ message: scenario.nextMessage, event: scenario.event })
    expect(initialIntent, `${scenario.style}: initial intent`).toBe(scenario.expectedIntent)
    expect(nextIntent, `${scenario.style}: related intent`).toBe(scenario.expectedIntent)
    expect(smsReplyLanguage(scenario.nextMessage), `${scenario.style}: language`).toBe(scenario.expectedLanguage)
    if (scenario.event !== "correction") {
      expect(smsTrainingIntent(scenario.nextMessage), `${scenario.style}: manager/runtime intent alignment`).toBe(scenario.expectedIntent)
    }
    expect(smsTrainingLanguage(scenario.nextMessage), `${scenario.style}: manager/runtime language alignment`).toBe(scenario.expectedLanguage)
    expect(isSmsCorrectionReason(scenario.reason), `${scenario.style}: correction reason`).toBe(true)

    const safeCustomerText = redactSmsTrainingText(scenario.message)
    const safeCorrection = redactSmsTrainingText(scenario.correction)
    const learned = scenario.teach
      ? [{ customer_message: safeCustomerText, approved_reply: safeCorrection, language: scenario.expectedLanguage, intent: scenario.expectedIntent }]
      : []
    const ranked = rankSmsReplyExamples([...learned, ...distractors], {
      intent: nextIntent,
      language: scenario.expectedLanguage,
      message: scenario.nextMessage,
    })

    if (scenario.teach) {
      expect(ranked[0]?.approved_reply, `${scenario.style}: trained example retrieval`).toBe(safeCorrection)
    } else {
      expect(ranked.some((example) => example.approved_reply === safeCorrection), `${scenario.style}: unsafe fact not learned`).toBe(false)
      expect(nextIntent, `${scenario.style}: deterministic correction gate remains active`).toBe("correction")
    }

    expect(enforceSmsOneQuestion(scenario.correction).match(/\?/g)?.length || 0, `${scenario.style}: one-question rule`).toBeLessThanOrEqual(1)
  }
})

test("exact-list, address-first, typo, list, and follow-up regressions stay deterministic", () => {
  expect(smsRequiresExactList("Only what I wrote: 20 sheets, nothing else")).toBe(true)
  expect(smsRequiresExactList("רשימה מדויקת בלבד, בלי תוספות")).toBe(true)
  expect(smsReplySuggestsOptionalItems("Would you like to add accessories?")).toBe(true)
  expect(classifySmsReplyIntent({ message: "need 60 shets drywal pric" })).toBe("pricing")
  expect(classifySmsReplyIntent({ message: "50 drywall sheets\n20 studs\n10 tracks\n6 compound buckets" })).toBe("material_request")
  expect(classifySmsReplyIntent({ message: "Any update on the price for my order?" })).toBe("follow_up")
})
