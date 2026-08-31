import { expect, test } from "@playwright/test"

import {
  classifySmsReplyIntent,
  evaluateSmsReplyGate,
  looksLikeSmsMaterialRequest,
  mergeSmsCorrectionItems,
  resolveSmsDeliveryAddressKnown,
  smsCorrectionPendingQuestionReply,
  smsHasNeededByTiming,
  smsMaterialIntelligenceAssessment,
  smsProductInquiryFallbackReply,
  smsReferencesPriorAttachment,
  smsReplyLanguage,
  smsStartsNewMaterialRequest,
  splitSmsMaterialClauses,
} from "../supabase/functions/_shared/sms-reply-policy"
import {
  additionalItemsQuestion,
  deliveryAddressQuestion,
} from "../supabase/functions/_shared/customer-request-completion"

type RequestItem = {
  name: string
  quantity: number
  unit: string
  quantityExplicit: boolean
}

type Scenario = {
  id: string
  message: string
  transcript?: string
  event?: "message" | "correction"
  currentImage?: boolean
  previousItems?: RequestItem[]
  incomingItems?: RequestItem[]
  expected: {
    intent: string
    language: "en" | "es" | "he"
    reply: RegExp
    forbiddenReply?: RegExp
    startsNew?: boolean
    addressKnown?: boolean
    timingKnown?: boolean
    ready?: boolean
    matchedRules?: string[]
    itemCount?: number
    correctedQuantity?: number
    attachmentRetained?: boolean
    gateAutoSafe?: boolean
  }
}

function controlledSmsRun(scenario: Scenario) {
  const event = scenario.event || "message"
  const startsNew = smsStartsNewMaterialRequest(scenario.message)
  const activeText = startsNew
    ? scenario.message.replace(/^new\s+(?:request|order|job|project|material\s+list)\s*:\s*/i, "")
    : scenario.transcript || scenario.message
  const intent = classifySmsReplyIntent({
    message: scenario.message,
    event,
    participantRole: "lead",
  })
  const language = smsReplyLanguage(scenario.message)
  const addressKnown = resolveSmsDeliveryAddressKnown({
    conversationText: activeText,
    latestMessage: scenario.message,
    startsNewRequest: startsNew,
  })
  const timingKnown = smsHasNeededByTiming(activeText)
  const assessment = smsMaterialIntelligenceAssessment(activeText)
  const attachmentRetained = Boolean(
    scenario.currentImage || smsReferencesPriorAttachment(scenario.message),
  )
  const clauses = splitSmsMaterialClauses(activeText).filter((clause) =>
    looksLikeSmsMaterialRequest(clause),
  )
  const correctedItems = mergeSmsCorrectionItems(
    scenario.previousItems || [],
    scenario.incomingItems || [],
    scenario.message,
    event,
  )

  let reply = ""
  if (event === "correction") {
    reply = smsCorrectionPendingQuestionReply(
      scenario.message,
      scenario.transcript || `Customer: ${scenario.message}`,
    ) || "Got it—the correction is saved for manager review."
  } else if (attachmentRetained) {
    reply = "The attached image is retained for controlled vision review."
  } else {
    reply = smsProductInquiryFallbackReply(scenario.message) ||
      assessment.questions[0] ||
      (!addressKnown && assessment.readyForConfirmation
        ? deliveryAddressQuestion(scenario.message)
        : additionalItemsQuestion(scenario.message))
  }

  const gate = evaluateSmsReplyGate({
    message: scenario.message,
    reply,
    intent,
    event,
    participantRole: "lead",
    modelAutoSafe: event !== "correction",
  })

  return {
    intent,
    language,
    reply,
    startsNew,
    addressKnown,
    timingKnown,
    ready: assessment.readyForConfirmation,
    matchedRules: assessment.matchedRules,
    questions: assessment.questions,
    itemCount: clauses.length,
    correctedQuantity: correctedItems[0]?.quantity,
    attachmentRetained,
    gateAutoSafe: gate.gateAutoSafe,
  }
}

const scenarios: Scenario[] = [
  {
    id: "full-en",
    message: "50 sheets 5/8 regular Sheetrock; 20 bags thinset for 12x24 porcelain tile on a concrete floor; 30 sheets 7/16 4x8 OSB; deliver tomorrow to 123 Main Street, Cedarhurst, NY 11516",
    expected: {
      intent: "material_request",
      language: "en",
      reply: /anything else on this list/i,
      addressKnown: true,
      timingKnown: true,
      ready: true,
      itemCount: 3,
      gateAutoSafe: true,
    },
  },
  {
    id: "vague-drywall",
    message: "I need drywall",
    expected: {
      intent: "material_request",
      language: "en",
      reply: /how many sheets|confirm 5\/8 in|5\/8-in\. regular Sheetrock/i,
      addressKnown: false,
      ready: false,
      gateAutoSafe: true,
    },
  },
  {
    id: "correction",
    message: "Correction: make it 30 sheets",
    transcript: "Customer: I need 20 sheets of Sheetrock\nAvantia: How many sheets, and can you confirm 5/8 in.?\nCustomer: Correction: make it 30 sheets",
    event: "correction",
    previousItems: [{ name: "5/8 regular Sheetrock", quantity: 20, unit: "sheets", quantityExplicit: true }],
    incomingItems: [{ name: "5/8 regular Sheetrock", quantity: 30, unit: "sheets", quantityExplicit: true }],
    expected: {
      intent: "correction",
      language: "en",
      reply: /note 30 sheets for review|correction is saved for manager review/i,
      correctedQuantity: 30,
      gateAutoSafe: false,
    },
  },
  {
    id: "photo",
    message: "I need 10 of these from the attached photo",
    currentImage: true,
    expected: {
      intent: "image_or_plan",
      language: "en",
      reply: /retained for controlled vision review/i,
      attachmentRetained: true,
      gateAutoSafe: true,
    },
  },
  {
    id: "url",
    message: "Need 12 of https://materials.example.test/products/board-58 for my project",
    expected: {
      intent: "material_request",
      language: "en",
      reply: /product name or model/i,
      matchedRules: ["external-product-link"],
      addressKnown: false,
      gateAutoSafe: true,
    },
  },
  {
    id: "multiline",
    message: "50 pc 2x4x8 lumber\nI need 10 breakers",
    expected: {
      intent: "material_request",
      language: "en",
      reply: /electrical panel manufacturer/i,
      forbiddenReply: /how many (?:breakers|pieces)/i,
      ready: false,
      itemCount: 2,
      gateAutoSafe: true,
      matchedRules: ["dimensional-lumber", "circuit-breaker"],
    },
  },
  {
    id: "english",
    message: "I need 10 breakers",
    expected: {
      intent: "material_request",
      language: "en",
      reply: /electrical panel manufacturer/i,
      forbiddenReply: /how many breakers/i,
      gateAutoSafe: true,
      matchedRules: ["circuit-breaker"],
    },
  },
  {
    id: "spanish",
    message: "Necesito 10 interruptores",
    expected: {
      intent: "material_request",
      language: "es",
      reply: /¿Qué marca tiene el panel eléctrico\?/i,
      forbiddenReply: /¿Cuántos interruptores/i,
      addressKnown: false,
      gateAutoSafe: true,
      matchedRules: ["circuit-breaker"],
    },
  },
  {
    id: "hebrew",
    message: "צריך 10 מפסקים",
    expected: {
      intent: "material_request",
      language: "he",
      reply: /מה יצרן לוח החשמל\?/,
      forbiddenReply: /כמה מפסקים צריך\?/,
      addressKnown: false,
      gateAutoSafe: true,
      matchedRules: ["circuit-breaker"],
    },
  },
  {
    id: "new-request",
    message: "New request: 20 bags thinset for 12x24 porcelain tile on concrete",
    transcript: "Customer: 50 sheets 5/8 regular Sheetrock\nCustomer: Deliver tomorrow to 987 Old Road, Lawrence, NY 11559\nAvantia: Request submitted for review.\nCustomer: New request: 20 bags thinset for 12x24 porcelain tile on concrete",
    expected: {
      intent: "material_request",
      language: "en",
      reply: /installation location/i,
      startsNew: true,
      addressKnown: false,
      timingKnown: false,
      ready: false,
      gateAutoSafe: true,
    },
  },
]

for (const scenario of scenarios) {
  test(`controlled SMS E2E: ${scenario.id}`, () => {
    const actual = controlledSmsRun(scenario)
    const context = `${scenario.id}\nexpected=${JSON.stringify(scenario.expected)}\nactual=${JSON.stringify(actual)}`

    expect(actual.intent, context).toBe(scenario.expected.intent)
    expect(actual.language, context).toBe(scenario.expected.language)
    expect(actual.reply, context).toMatch(scenario.expected.reply)
    if (scenario.expected.forbiddenReply) {
      expect(actual.reply, context).not.toMatch(scenario.expected.forbiddenReply)
    }
    for (const field of [
      "startsNew",
      "addressKnown",
      "timingKnown",
      "ready",
      "matchedRules",
      "itemCount",
      "correctedQuantity",
      "attachmentRetained",
      "gateAutoSafe",
    ] as const) {
      const expectedValue = scenario.expected[field]
      if (expectedValue !== undefined) {
        if (field === "matchedRules") expect(actual[field], context).toEqual(expectedValue)
        else expect(actual[field], context).toBe(expectedValue)
      }
    }
  })
}
