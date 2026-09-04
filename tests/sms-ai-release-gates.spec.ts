import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { canRunSmsReplyLab } from "../lib/ai/sms-reply-lab-access"
import { redactSmsTrainingText } from "../lib/ai/sms-training-privacy"
import {
  applyAvantiaMaterialDefaults,
  classifySmsReplyIntent,
  evaluateSmsReplyGate,
  filterSmsExactListItems,
  formatSmsRequestSummaryItem,
  isSmsBareGreeting,
  inspectSmsQuestionStructure,
  isSmsOptOutMessage,
  looksLikeSmsMaterialRequest,
  mergeSmsCorrectionItems,
  normalizeSmsMaterialAnswerTypos,
  resolveSmsDeliveryAddressKnown,
  resolveSmsExactListPreference,
  resolveSmsMaterialReplyStep,
  smsDeliveryDetailsQuestionReply,
  smsAnsweredQuantityGuardReply,
  smsContextualQuantityAnswerReply,
  smsCorrectionPendingQuestionReply,
  smsHasExplicitQuantity,
  smsHasNeededByTiming,
  smsMaterialClarificationQuestions,
  smsMaterialIntelligenceAssessment,
  smsMessagesAfterInactivityBoundary,
  smsNeededByTimingValue,
  smsOutputSafetySignals,
  smsProductInquiryFallbackReply,
  smsQuantityClarificationReply,
  smsReplyParts,
  smsReplyLanguage,
  smsSheetrockSpecificationFollowUpReply,
  smsShortMaterialAnswerReply,
  smsStartsNewMaterialRequest,
  splitSmsMaterialClauses,
  smsUnknownContextFallback,
  smsUnansweredFollowUpCancellationReason,
  smsUnansweredFollowUpEligible,
  smsUnansweredFollowUpText,
  smsUnansweredFollowUpStageText,
  smsBareOrderIntentReply,
} from "../supabase/functions/_shared/sms-reply-policy"

const root = process.cwd()

test("request summaries pluralize packages and avoid repeated package wording", () => {
  expect(formatSmsRequestSummaryItem({ name: "1/2 in. regular Sheetrock", quantity: 1, unit: "each", quantityExplicit: false }))
    .toBe("• Quantity not specified — 1/2 in. regular Sheetrock")
  expect(formatSmsRequestSummaryItem({ name: "Benjamin Moore OC-13, eggshell, one-gallon can", quantity: 3, unit: "can" }))
    .toBe("• 3 one-gallon cans — Benjamin Moore OC-13, eggshell")
  expect(formatSmsRequestSummaryItem({ name: "5/8 regular Sheetrock", quantity: 25, unit: "sheet" }))
    .toBe("• 25 sheets — 5/8 regular Sheetrock")
  expect(formatSmsRequestSummaryItem({ name: "all-purpose joint compound", quantity: 1, unit: "bucket" }))
    .toBe("• 1 bucket — all-purpose joint compound")
  expect(formatSmsRequestSummaryItem({ name: "LUS28Z", quantity: 6, unit: "each" }))
    .toBe("• 6 each — LUS28Z")
})

test("Quo recovery batches duplicate checks before ingesting messages", async () => {
  const broker = await readFile(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8")
  expect(broker).toContain("external_activity_id = any(${candidateIds}::text[])")
  expect(broker).toContain("storedIds.has(activityId)")
  expect(broker).toContain("isTrustedSmsCommandPhone(normalizePhone(message.from))")
})

test("customer SMS uses semantic-first strong models and deterministic rules only as fallback", async () => {
  const broker = await readFile(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8")
  expect(broker).toContain('const fallback = escalated ? "gpt-5.6-sol" : "gpt-5.6-terra"')
  expect(broker).toContain("Interpret customer meaning semantically, not by exact spelling.")
  expect(broker).toContain("Never repeat the exact same question after the customer has answered any part of it.")
  expect(broker).not.toContain('&& !/^gpt-/i.test(model)')
  expect(broker).toContain("Reviewed construction rules are final output guards")
  expect(broker).toContain("semanticNormalizationSafe")
  expect(broker).toContain("customerPortalMagicUrl")
  expect(broker).toContain('url.searchParams.set("token_hash", tokenHash)')
})

test("customer request invitation uses a one-tap verified session instead of broken phone OTP", async () => {
  const confirmRoute = await readFile(path.join(root, "app/auth/confirm/route.ts"), "utf8")
  const requestPage = await readFile(path.join(root, "app/requests/page.tsx"), "utf8")
  const broker = await readFile(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8")
  expect(confirmRoute).toContain("supabase.auth.verifyOtp({ token_hash: tokenHash, type })")
  expect(confirmRoute).toContain('destination.searchParams.set("account", "switched")')
  expect(requestPage).not.toContain("CustomerRequestOtp")
  expect(requestPage).toContain("Open from your text")
  expect(requestPage).not.toContain("CustomerRequestAutoDownload")
  expect(requestPage).toContain("Download PDF")
  expect(broker).not.toContain("download=1")
})

test("public text start uses a dedicated signing secret instead of a database credential", async () => {
  const broker = await readFile(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8")
  const route = await readFile(path.join(root, "app/api/public/start-by-text/route.ts"), "utf8")
  expect(broker).toContain('publicStartTextSigningSecret: "public_start_text_signing_secret"')
  expect(broker).toContain("await secret(secretNames.publicStartTextSigningSecret)")
  expect(broker).not.toContain('hmacSha256Base64RawKey(serviceKey, `${timestamp}.${payload}`)')
  expect(route).toContain('https://nprfhspwdflpqlopydmp.supabase.co')
  expect(route).toContain('https://build-flow-wfl3.vercel.app/api/public/start-by-text')
  expect(route).toContain('request.headers.get("x-avantia-start-proxy") === "1"')
  expect(route).toContain('"x-avantia-start-proxy": "1"')
  expect(route).not.toContain("NEXT_PUBLIC_SUPABASE_URL")
  expect(route).not.toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY")
})

test("fail-closed output gate blocks multilingual prices, stock assertions, promises, and protected intents", () => {
  const unsafe = [
    ["The price is $1,250.", "general"],
    ["המחיר הוא 450 ₪.", "general"],
    ["El precio es 900 USD.", "general"],
    ["It's 25 each.", "general"],
    ["We have it in stock.", "general"],
    ["יש לנו במלאי.", "general"],
    ["Está disponible en stock.", "general"],
    ["Available now.", "general"],
    ["We will deliver tomorrow.", "general"],
    ["נספק מחר.", "general"],
    ["Vamos a entregar mañana.", "general"],
    ["Delivery is tomorrow.", "general"],
  ] as const
  for (const [reply, intent] of unsafe) {
    expect(smsOutputSafetySignals({ reply, intent }), `${intent}: ${reply}`).not.toEqual([])
  }
  expect(smsOutputSafetySignals({ reply: "A manager will check and reply here.", intent: "follow_up" })).toEqual([])
  expect(classifySmsReplyIntent({ message: "Is this available?" })).toBe("availability")
})

test("broker gate auto-sends safe pricing and delivery clarification but blocks transactional claims", () => {
  const decide = (reply: string, intent: "pricing" | "availability" | "delivery" | "follow_up", overrides: Partial<Parameters<typeof evaluateSmsReplyGate>[0]> = {}) => evaluateSmsReplyGate({
    message: "Customer request",
    reply,
    intent,
    event: "message",
    participantRole: "lead",
    modelAutoSafe: true,
    ...overrides,
  })

  expect(decide("What quantity?", "pricing")).toMatchObject({ level: "green", gateAutoSafe: true })
  expect(decide("What is the full delivery address?", "delivery")).toMatchObject({ level: "green", gateAutoSafe: true })
  expect(decide("The price is $1,250.", "pricing")).toMatchObject({ level: "red", gateAutoSafe: false })
  expect(decide("We have it in stock.", "availability")).toMatchObject({ level: "red", gateAutoSafe: false })
  expect(decide("We will deliver tomorrow.", "delivery")).toMatchObject({ level: "red", gateAutoSafe: false })
  expect(decide("Your quote is ready.", "follow_up")).toMatchObject({ level: "red", gateAutoSafe: false })
  expect(decide("What quantity?", "pricing", { participantRole: "supplier" })).toMatchObject({ level: "red", gateAutoSafe: false })
  expect(decide("Got it.", "follow_up", { event: "correction" })).toMatchObject({ level: "red", gateAutoSafe: false })
  expect(decide("Got it.", "follow_up", { event: "cancellation" })).toMatchObject({ level: "red", gateAutoSafe: false })
})

test("latest decision allows one essential blocker and rejects padding, repeats, and bundles", () => {
  expect(inspectSmsQuestionStructure("What size?").valid).toBe(true)
  expect(inspectSmsQuestionStructure("What is the full delivery address?").valid).toBe(true)
  expect(inspectSmsQuestionStructure("I have the material list. What is the full delivery address?")).toMatchObject({ valid: true, requestedFields: 1, fields: ["address"] })
  expect(inspectSmsQuestionStructure("קיבלתי את רשימת החומרים. מה כתובת המשלוח המלאה?")).toMatchObject({ valid: true, requestedFields: 1, fields: ["address"] })
  expect(inspectSmsQuestionStructure("Recibí la lista de materiales. ¿Cuál es la dirección completa de entrega?")).toMatchObject({ valid: true, requestedFields: 1, fields: ["address"] })
  expect(inspectSmsQuestionStructure("What size and thickness?")).toMatchObject({ valid: false, requestedFields: 2 })
  expect(inspectSmsQuestionStructure("What size? What thickness? What quantity?")).toMatchObject({ valid: false, questionMarks: 3 })
  expect(inspectSmsQuestionStructure("What size? What thickness? What quantity? What brand?")).toMatchObject({ valid: false, questionMarks: 4 })
  expect(inspectSmsQuestionStructure("What size? What size?").valid).toBe(false)
  expect(inspectSmsQuestionStructure("What is the full delivery address?", ["address"]).valid).toBe(false)
  expect(inspectSmsQuestionStructure("¿Qué tamaño y cantidad necesita?").valid).toBe(false)
  expect(inspectSmsQuestionStructure("איזה גודל וכמה יחידות?").valid).toBe(false)
  expect(evaluateSmsReplyGate({ message: "20 drywall sheets", reply: "Would you like to add accessories?", intent: "material_request", event: "message", participantRole: "lead", modelAutoSafe: true })).toMatchObject({ level: "red", gateAutoSafe: false })
  expect(evaluateSmsReplyGate({ message: "20 drywall sheets", reply: "What is your favorite movie?", intent: "material_request", event: "message", participantRole: "lead", modelAutoSafe: true })).toMatchObject({ level: "red", gateAutoSafe: false })
})

test("paint intake asks color first and finish on the next turn", () => {
  const reply = "Got it—4 gallons of Sherwin-Williams paint. What paint color do you need?"
  expect(inspectSmsQuestionStructure(reply)).toMatchObject({
    valid: true,
    fields: ["color"],
    reason: null,
  })
  expect(evaluateSmsReplyGate({ message: "I need 4 gallons of Sherman William paint.", reply, intent: "material_request", event: "message", participantRole: "lead", modelAutoSafe: true })).toMatchObject({ level: "green", gateAutoSafe: true })
})

test("required questions stay green while optional recommendation statements cannot hide beside them", () => {
  const required = [
    "What size do you need?",
    "How many pieces do you need?",
    "What is the full delivery address?",
    "When do you need it?",
    "What paint color do you need?",
    "What metal-stud size do you need?",
    "What screw length do you need?",
    "Can you confirm the compound type: 5-gallon all-purpose?",
  ]
  const optional = [
    "Do you also need tape? How many sheets?",
    "Would you like to add screws? How many sheets?",
    "Also consider tape. How many sheets?",
    "You may also need tape. How many sheets?",
    "You will also need tape. How many sheets?",
    "You also need tape. How many sheets?",
    "We recommend adding tape. How many sheets?",
    "Don't forget tape. How many sheets?",
    "Tape is useful. How many sheets?",
    "Need any accessories? How many sheets?",
    "What size? Would you like any optional items?",
    "Screws are also recommended. What size?",
  ]
  expect(required.length + optional.length).toBe(20)
  for (const reply of required) {
    expect(evaluateSmsReplyGate({ message: "I need materials", reply, intent: "material_request", participantRole: "lead", modelAutoSafe: true }), reply).toMatchObject({ level: "green", gateAutoSafe: true })
  }
  for (const reply of optional) {
    expect(evaluateSmsReplyGate({ message: "I need materials", reply, intent: "material_request", participantRole: "lead", modelAutoSafe: true }), reply).toMatchObject({ level: "red", gateAutoSafe: false })
  }
})

test("material request advances across turns after address until complete", () => {
  expect(smsHasExplicitQuantity("Need thinset")).toBe(false)
  expect(smsQuantityClarificationReply("Need thinset")).toBe("Sure — how much thinset do you need?")
  expect(smsQuantityClarificationReply("New request: I need Sheetrock")).toBe("How many sheets do you need?")
  expect(inspectSmsQuestionStructure(smsQuantityClarificationReply("New request: I need Sheetrock")).valid).toBe(true)
  expect(resolveSmsMaterialReplyStep({ isMaterialRequest: true, hasGroundedItems: true, quantityKnown: false, addressKnown: false, neededByKnown: false, proposedReply: "A manager will review." })).toBe("quantity")
  expect(smsHasExplicitQuantity("Need 4 bags of thinset")).toBe(true)
  expect(resolveSmsMaterialReplyStep({ isMaterialRequest: true, hasGroundedItems: true, quantityKnown: true, addressKnown: false, neededByKnown: false, proposedReply: "A manager will review." })).toBe("address_and_needed_by")
  expect(resolveSmsMaterialReplyStep({ isMaterialRequest: true, hasGroundedItems: true, quantityKnown: true, addressKnown: false, neededByKnown: false, proposedReply: "Got it—white. Which paint finish: flat, eggshell, satin, or semi-gloss?" })).toBe("proposed")
  expect(smsDeliveryDetailsQuestionReply("Need 4 bags of thinset")).toBe("What’s the full delivery address?")
  expect(inspectSmsQuestionStructure(smsDeliveryDetailsQuestionReply("Need 4 bags of thinset")).valid).toBe(true)
  expect(resolveSmsMaterialReplyStep({ isMaterialRequest: true, hasGroundedItems: true, addressKnown: false, neededByKnown: false, proposedReply: "A manager will review." })).toBe("address_and_needed_by")
  expect(resolveSmsMaterialReplyStep({ isMaterialRequest: true, hasGroundedItems: true, addressKnown: true, neededByKnown: false, proposedReply: "A manager will review." })).toBe("needed_by")
  expect(smsHasNeededByTiming("Tomorrow")).toBe(true)
  expect(smsNeededByTimingValue("Need it Monday\nActually tomorrow")).toBe("tomorrow")
  expect(smsHasNeededByTiming("5/8 regular, 23 sheets")).toBe(false)
  expect(smsNeededByTimingValue("5/8 regular, 23 sheets")).toBeNull()
  expect(smsNeededByTimingValue("Need by 8/31")).toBe("8/31")
  expect(smsNeededByTimingValue("8/31/2026")).toBe("8/31/2026")
  expect(smsNeededByTimingValue("screws for 5/8 Sheetrock")).toBeNull()
  expect(smsNeededByTimingValue("use on 5/8 drywall")).toBeNull()
  expect(resolveSmsMaterialReplyStep({ isMaterialRequest: true, hasGroundedItems: true, addressKnown: true, neededByKnown: true, proposedReply: "What thickness? What brand?" })).toBe("proposed")
  expect(inspectSmsQuestionStructure("What thickness? What brand?").valid).toBe(false)
  expect(resolveSmsMaterialReplyStep({ isMaterialRequest: true, hasGroundedItems: true, addressKnown: true, neededByKnown: true, proposedReply: "I have the details. A manager will review." })).toBe("proposed")
  expect(resolveSmsMaterialReplyStep({ isMaterialRequest: true, hasGroundedItems: true, addressKnown: true, neededByKnown: true, proposedReply: "Would you like to add accessories?" })).toBe("complete")
})

test("construction intake understands strong English and Spanish spelling mistakes without guessing names", () => {
  expect(normalizeSmsMaterialAnswerTypos("Need 20 shetrock, delivry tomorow to this adress"))
    .toBe("Need 20 sheetrock, delivery tomorrow to this address")
  expect(normalizeSmsMaterialAnswerTypos("Nesesito 20 paneles de yeso, entreja manana, direcsion despues"))
    .toBe("necesito 20 paneles de yeso, entrega mañana, dirección despues")
  expect(looksLikeSmsMaterialRequest(normalizeSmsMaterialAnswerTypos("Nesesito 20 paneles de yeso"))).toBe(true)
  expect(smsReplyLanguage(normalizeSmsMaterialAnswerTypos("Nesesito precio y entreja manana"))).toBe("es")
  expect(normalizeSmsMaterialAnswerTypos("Call Frank at Dundy Glass")).toBe("Call Frank at Dundy Glass")
})

test("ambiguous material lists must be clarified before confirmation", () => {
  expect(smsMaterialClarificationQuestions("I need 50 Sheet Rock")).toEqual([
    "Can we do 5/8-in. regular Sheetrock, or do you need Type X/fire-rated or moisture-resistant?",
  ])
  expect(smsMaterialClarificationQuestions("50 sheets of regular Sheetrock")).toEqual([
    "Can we do 5/8-in. Sheetrock?",
  ])
  expect(smsMaterialClarificationQuestions("50 sheets of 5/8 Sheetrock")).toEqual([
    "For the 5/8-in. Sheetrock: regular, Type X/fire-rated, or moisture-resistant?",
  ])
  expect(smsMaterialClarificationQuestions("50 sheets of 5/8 regular Sheetrock")).toEqual([])
  const list = `50 pc 2x4x8
1000 pc box drywall screws 1 1/4
20 drywall 4x8x1/2
10 pc Corner bit
Matching tape
1 bucket 5gl compound
1 bucket 5gl primer
1 bucket 5gl paint`
  expect(smsMaterialClarificationQuestions(list)).toEqual([
    "Sheetrock thickness: keep 1/2-in., or change to our standard 5/8-in.?",
  ])
  expect(inspectSmsQuestionStructure(smsMaterialClarificationQuestions(list).join(" "))).toMatchObject({
    valid: true,
    questionMarks: 1,
  })
  const answered = `${list}\nUse 5/8. Yes, 8-ft metal corner bead. White eggshell paint.`
  expect(smsMaterialClarificationQuestions(answered)).toEqual([])
  expect(smsMaterialClarificationQuestions(`${list}\n10 Paint Sherwin Williams OC`)).toEqual([
    "For “corner bit,” which corner bead type: metal or vinyl?",
  ])
  expect(smsMaterialClarificationQuestions(`${list}\nUse 5/8. Yes, 10-ft metal corner bead. Sherwin-Williams OC-13.`)).toEqual([
    "Which paint finish: flat, eggshell, satin, or semi-gloss?",
  ])
  expect(smsMaterialClarificationQuestions(`${list}\nUse 5/8. Yes, 10-ft metal corner bead. Sherwin-Williams OC-13 eggshell.`)).toEqual([])
  expect(smsMaterialClarificationQuestions("1 box drywall screws 1/2 in.")).toEqual([])
  expect(smsMaterialClarificationQuestions(`${list}\nUse 5/8. Yes, 8-ft metal corner bead. Eggshell paint.`)).toEqual(["Got it. What paint color do you need?"])
  expect(smsMaterialClarificationQuestions(list, { exactListOnly: true })).not.toContain("Sheetrock thickness: keep 1/2-in., or change to our standard 5/8-in.?")

  const normalized = applyAvantiaMaterialDefaults([
    { name: "2x4x8 studs", quantity: 50, unit: "pieces" },
    { name: "1-1/4 in. drywall screws", quantity: 1000, unit: "boxes" },
    { name: "Matching tape", quantity: 1, unit: "each" },
    { name: "5-gallon compound", quantity: 1, unit: "bucket" },
    { name: "5-gallon primer", quantity: 1, unit: "bucket" },
  ], list)
  expect(normalized).toEqual([
    { name: "Wood 2x4x8 studs", quantity: 50, unit: "pieces" },
    { name: "1-1/4 in. drywall screws (one 1,000-count box)", quantity: 1000, unit: "pieces" },
    { name: "Matching tape", quantity: 1, unit: "roll" },
    { name: "All-purpose 5-gallon compound", quantity: 1, unit: "bucket" },
    { name: "Drywall 5-gallon primer", quantity: 1, unit: "bucket" },
  ])
  expect(applyAvantiaMaterialDefaults([{ name: "Metal 2x4x8 studs", quantity: 50, unit: "pieces" }], `${list}\nUse metal studs.`)[0].name).toBe("Metal 2x4x8 studs")
})

test("mixed contractor lists preserve every item and do not confuse screw length with drywall thickness", () => {
  const clauses = splitSmsMaterialClauses(
    "1,000 pc drywall screws 1-1/4, 1 roll matching tape and 1 bucket all-purpose compound, 1 bucket primer",
  )
  expect(clauses).toEqual([
    "1,000 pc drywall screws 1-1/4",
    "1 roll matching tape",
    "1 bucket all-purpose compound",
    "1 bucket primer",
  ])
  expect(
    smsMaterialClarificationQuestions(
      "1,000 pc drywall screws 1-1/4, 1 roll matching tape and 1 bucket all-purpose compound",
    ),
  ).toEqual([])
  expect(
    smsMaterialClarificationQuestions(
      "1,000 pc drywall screws 1-1/4\n25 sheets 5/8 regular Sheetrock 4x8",
    ),
  ).toEqual([])
})

test("breaker compatibility asks the one panel blocker in the customer language", () => {
  expect(
    smsMaterialClarificationQuestions(
      "Necesito 10 interruptores Square D de 20A de un polo",
    ),
  ).toEqual(["¿Qué línea de Square D necesita: Homeline o QO?"])
  expect(
    smsMaterialClarificationQuestions("10 Square D Homeline 20A single-pole breakers"),
  ).toEqual([])
  expect(smsMaterialClarificationQuestions("I need 4 circuit breakers")).toEqual([
    "What is the electrical panel manufacturer?",
  ])
})

test("quantity corrections merge into canonical items without deleting known specifications", () => {
  const previous = [
    {
      name: "5/8-in. regular 4x8 Sheetrock",
      quantity: 25,
      unit: "sheets",
      quantityExplicit: true,
    },
  ]
  expect(
    mergeSmsCorrectionItems(
      previous,
      [{ name: "Sheetrock", quantity: 30, unit: "sheets", quantityExplicit: true }],
      "I wrote 25, make it 30",
      "correction",
    ),
  ).toEqual([
    {
      name: "5/8-in. regular 4x8 Sheetrock",
      quantity: 30,
      unit: "sheets",
      quantityExplicit: true,
    },
  ])
  expect(
    mergeSmsCorrectionItems(previous, [], "Please cancel", "cancellation"),
  ).toEqual([])
  expect(
    mergeSmsCorrectionItems(
      previous,
      [{ name: "4x12 Sheetrock", quantity: 1, unit: "sheets", quantityExplicit: false }],
      "Change it to 4x12 sheets",
      "correction",
    ),
  ).toEqual([
    {
      name: "5/8-in. regular 4x12 Sheetrock",
      quantity: 25,
      unit: "sheets",
      quantityExplicit: true,
    },
  ])
})

test("paint replies understand brand, color, code, and finish without repeating the same question", () => {
  const base = "Customer: I need 5 gallons of paint"
  const cases = [
    [base, "What paint color do you need?"],
    [`${base}\nAvantia: What paint color and finish do you need?\nCustomer: Sherman William`, "Got it—Sherwin Williams. What paint color do you need?"],
    [`${base}\nAvantia: What paint color and finish do you need?\nCustomer: Sherwin Williams`, "Got it—Sherwin Williams. What paint color do you need?"],
    [`${base}\nAvantia: What paint color and finish do you need?\nCustomer: White`, "Got it—white. Which finish: flat, eggshell, satin, or semi-gloss?"],
    [`${base}\nAvantia: What paint color and finish do you need?\nCustomer: OC-13`, "Which paint finish: flat, eggshell, satin, or semi-gloss?"],
    [`${base}\nAvantia: What paint color and finish do you need?\nCustomer: Eggshell`, "Got it. What paint color do you need?"],
    [`${base}\nCustomer: White eggshell`, null],
    [`${base}\nCustomer: Sherwin-Williams OC-13 eggshell`, null],
    [`${base}\nCustomer: Satin white`, null],
    [`${base}\nCustomer: PPG`, "Got it—PPG. What paint color do you need?"],
  ] as const

  expect(cases).toHaveLength(10)
  for (const [conversation, expected] of cases) {
    expect(smsMaterialClarificationQuestions(conversation)[0] ?? null).toBe(expected)
  }
})

test("broker-created request progression replies are gated independently from model review flags", async () => {
  const brokerSource = await readFile(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8")
  expect(brokerSource).toMatch(/const deterministicProgression\s*=\s*params\.result\.isMaterialRequest/)
  expect(brokerSource).toContain("const gateModelAutoSafe = result.autoSafe || deterministicProgression")
  expect(brokerSource).toContain('customerNeededBy: smsNeededByTimingValue(reviewText) || ""')
  expect(brokerSource).toMatch(/const activeOrdered\s*=\s*newRequestBoundary >= 0\s*\? ordered\.slice\(newRequestBoundary\)\s*:\s*ordered/)
  expect(brokerSource).toMatch(/message\.direction === "incoming"\s*&&\s*smsStartsNewMaterialRequest/)
  expect(brokerSource).toMatch(/\(customerEvent !== "correction" \|\| preConfirmationCorrection\)\s*&&\s*!linkedCorrectionRequestId/)
  expect(brokerSource).toContain("occurred_at >= now() - interval '20 seconds'")
  expect(brokerSource).toContain("const customerEvent = exactRecentDuplicate")
  expect(brokerSource).toContain('smsStartsNewMaterialRequest(body)\n      ? "message"')
  expect(brokerSource).not.toContain("occurred_at >= now() - interval '10 minutes'")
  expect(brokerSource).toContain("if (draftCandidate && startsNewRequest) {")
  expect(brokerSource).toContain("if (!explicitConfirmation)")
  expect(brokerSource).toContain("A customer response replaced this confirmation summary.")
  expect(brokerSource).toContain("supersedeSmsConfirmationForCustomerChange(")
  expect(brokerSource).toContain("clarificationQuestions.length === 0")
  expect(brokerSource).toMatch(/if \(\s*\(openDraft \|\| activeSubmittedRequest\)\s*&&\s*customerEvent === "message"\s*&&\s*!analyzed\.result\.isMaterialRequest\s*\)/)
  expect(brokerSource).toContain("the structured draft advances instead of falling back")
  expect(brokerSource).toContain('if (customerEvent === "correction") {')
  expect(brokerSource).toMatch(/const preConfirmationCorrection\s*=\s*customerEvent === "correction"\s*&&\s*Boolean\(openDraft\)/)
  expect(brokerSource).toContain('event: preConfirmationCorrection ? "message" : customerEvent')
  expect(brokerSource).toContain('const mayAskMaterialQuestion =')
  expect(brokerSource).toContain('customerEvent === "message" || preConfirmationCorrection')
  expect(brokerSource).toContain('mergeSmsCorrectionItems(')
  expect(brokerSource).toContain('select id, original_message, customer_name, customer_address, source_communication_ids, exact_list_only, delivery_address_known, items')
  expect(brokerSource).toContain('if (preConfirmationCorrection) {')
  expect(brokerSource).toContain('only a concise, non-committal next question can pass automatically')
  expect(brokerSource).toMatch(/\(customerEvent !== "correction" \|\| preConfirmationCorrection\)/)
  expect(brokerSource).toContain("and activity_id = ${activityId} and event_type = 'message.received'")
  expect(brokerSource).toContain("canonicalEvents[0]?.external_event_id === eventId")
  expect(brokerSource).toContain("sms_ai_provider_replay_suppressed")
  expect(brokerSource).toContain("needed_by_text, summary_text, summary_hash")
  expect(brokerSource).toMatch(/const neededBy\s*=\s*pending\.needed_by_text\?\.trim\(\)\s*\|\|\s*smsNeededByTimingValue\(pending\.summary_text\)/)
  expect(brokerSource).toContain('manager_notes) values')
  expect(brokerSource).toContain('Needed by: ${neededBy}')
  expect(brokerSource).toMatch(/!input\.request\.items\.length\s*\|\|\s*!input\.listComplete\s*\|\|\s*!smsHasFullDeliveryAddress\(input\.customerAddress\)/)
  expect(brokerSource).toMatch(/!SIMPLE_REQUEST_INTAKE[\s\S]*?!input\.intelligenceReady/)
  expect(brokerSource).toContain("`Needed by: ${neededBy}`")
  expect(brokerSource).toContain("async function activeSmsRequestSourceIds")
  expect(brokerSource).not.toContain(".slice(-12)")
  expect(brokerSource).toContain("if (smsStartsNewMaterialRequest(message)) boundary = index")
  expect(brokerSource).not.toContain("smsProductInquiryFallbackReply(message)) || likelyMaterialList(message)")
  expect(brokerSource).not.toContain("staleDraft")
  expect(brokerSource).toContain("set status = 'dismissed'")
  expect(evaluateSmsReplyGate({
    message: "Yes, 5/8 regular, 21 sheets",
    reply: "I have the material list. What is the full delivery address?",
    intent: "material_request",
    event: "message",
    participantRole: "lead",
    modelAutoSafe: true,
  })).toMatchObject({ level: "green", gateAutoSafe: true })
})

test("new-request boundaries require an affirmative instruction", () => {
  expect(smsStartsNewMaterialRequest("New request: I need Sheetrock")).toBe(true)
  expect(smsStartsNewMaterialRequest("This is not a new order—add it to the same request")).toBe(false)
  expect(smsStartsNewMaterialRequest("Don't make a new order")).toBe(false)
  expect(smsStartsNewMaterialRequest("Is this a new order?")).toBe(false)
})

test("an idle SMS thread starts with fresh context and a safe order prompt", async () => {
  const messages = [
    { occurred_at: "2026-08-30T18:00:00Z", body: "45 sheets and 20 bricks" },
    { occurred_at: "2026-08-30T18:05:00Z", body: "How much do you need?" },
    { occurred_at: "2026-09-02T23:43:00Z", body: "Can I order" },
  ]
  expect(smsMessagesAfterInactivityBoundary(messages)).toEqual([messages[2]])
  expect(smsBareOrderIntentReply("Can I order")).toBe(
    "Absolutely. Send your material list, one item per line, with the quantity and size if known. Example: 50 sheets of 5/8-in. regular Sheetrock. We’ll organize the request and send it back for your approval before anything is ordered.",
  )
  expect(smsBareOrderIntentReply("Can I order 45 sheets of 5/8 Sheetrock")).toBeNull()

  const broker = await readFile(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8")
  expect(broker).toContain("smsMessagesAfterInactivityBoundary(afterConfirmation)")
  expect(broker).toContain("updated_at < now() - interval '24 hours'")
  expect(broker).toContain("Repeated automatic reply suppressed")
  expect(broker).toContain("Tell us what you need for your project")
  expect(broker).toContain("send it back for your approval before anything is ordered")
})

test("product inquiry fallback answers the product and asks only useful next questions", () => {
  const sheetrock = smsProductInquiryFallbackReply("Do you sell sheetricj?")
  expect(sheetrock).toBe("We can help source Sheetrock. Can you confirm 5/8 in.?")
  expect(smsProductInquiryFallbackReply("Do you carry Sheetrook drywall?")).toBe(sheetrock)
  expect(smsProductInquiryFallbackReply("Can I get Sheetrcok?")).toBe(sheetrock)
  expect(smsProductInquiryFallbackReply("Could we order shetrock?")).toBe(sheetrock)
  expect(smsProductInquiryFallbackReply("Do you have sheetrpck?")).toBe(sheetrock)
  expect(inspectSmsQuestionStructure(sheetrock || "")).toMatchObject({ valid: true, questionMarks: 1, requestedFields: 1 })
  expect(evaluateSmsReplyGate({ message: "Do you sell sheetricj?", reply: sheetrock || "", intent: "availability", event: "message", participantRole: "lead", modelAutoSafe: true })).toMatchObject({ level: "green", gateAutoSafe: true })
  const replyParts = smsReplyParts({ reply: sheetrock || "", deterministicProductInquiry: true })
  expect(replyParts).toHaveLength(1)
  expect(replyParts[0]).toBe("We can help source Sheetrock. Can you confirm 5/8 in.?")
  expect(new Set(replyParts).size).toBe(replyParts.length)

  const exactListReply = smsProductInquiryFallbackReply("Do you sell Sheetrock?", { allowRelatedSuggestion: false }) || ""
  expect(smsReplyParts({ reply: exactListReply, deterministicProductInquiry: true, exactListOnly: true })).toHaveLength(1)
  expect(exactListReply).not.toMatch(/joint compound|corner bead|drywall screws/i)
  expect(evaluateSmsReplyGate({ message: "Do you sell Sheetrock?", reply: sheetrock || "", intent: "availability", event: "message", participantRole: "lead", modelAutoSafe: true, exactListOnly: true })).toMatchObject({ level: "green", gateAutoSafe: true })
  const unrelated = smsProductInquiryFallbackReply("Do you carry sheet metal?")
  expect(unrelated).toContain("sheet metal")
  expect(unrelated).not.toContain("Sheetrock")
  expect(smsProductInquiryFallbackReply("Can I get Sherlock?")).toBeNull()
  expect(smsProductInquiryFallbackReply("Need an update on my order")).toBeNull()
  const roofing = smsProductInquiryFallbackReply("I need roofing shingles") || ""
  expect(smsReplyParts({ reply: roofing, deterministicProductInquiry: true })).toEqual([
    "Sure—we can help source roofing shingles. What shingle type do you need?",
  ])
  expect(inspectSmsQuestionStructure(roofing)).toMatchObject({ valid: true, questionMarks: 1 })
  expect(smsProductInquiryFallbackReply("I need thinset")).toContain("What type do you need?")
  expect(smsProductInquiryFallbackReply("I need metal studs")).toContain("What stud size do you need?")
  const prefixedMetalStuds = smsProductInquiryFallbackReply("New request: I need metal studs") || ""
  expect(prefixedMetalStuds).toBe("Sure—we can help source metal studs. What stud size do you need?")
  expect(inspectSmsQuestionStructure(prefixedMetalStuds)).toMatchObject({ valid: true, questionMarks: 1 })

  // A fully quantified request must continue through material extraction. It
  // must never be reduced to a generic availability reply that re-asks fields
  // the customer already supplied.
  expect(smsProductInquiryFallbackReply("New request: I need 18 sheets of 1/2 regular Sheetrock.")).toBeNull()
  expect(smsProductInquiryFallbackReply("I need 50 2x4x8 metal studs.")).toBeNull()
})

test("a new request isolates clarification from unrelated conversation history", async () => {
  const brokerSource = await readFile(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8")
  expect(brokerSource).toMatch(/const activeCustomerText = startsNewRequest\s*\? body\s*:\s*context\.customerText \|\| body/)
  expect(brokerSource).toContain("const aggregateIntelligenceText = [")
  expect(brokerSource).toContain("const durableCrossChannelText = startsNewRequest")
  expect(brokerSource).toMatch(/const aggregateMaterialIntelligence = smsMaterialIntelligenceAssessment\(\s*normalizedAggregateIntelligenceText/)
  expect(brokerSource).toContain("const questionIntelligence =")
  expect(brokerSource).toContain("const materialIntelligence = aggregateMaterialIntelligence")
  expect(brokerSource).toContain('.replace(/\\bbreakers\\b/g, "breaker")')
  expect(brokerSource).toContain("const effectiveListComplete =")
  expect(brokerSource).toMatch(/listComplete:\s*effectiveListComplete/)
  expect(brokerSource).toMatch(/effectiveListComplete\s*&&\s*deliveryAddressKnown/)
  expect(brokerSource).toMatch(/const replyContext = startsNewRequest\s*\? `Customer: \$\{effectiveBody\}`/)
  expect(brokerSource).toContain("A confirmed request is a hard context boundary")
  expect(brokerSource).toContain("status = 'converted'")
  expect(brokerSource).toContain("status = 'confirmed', created_request_id")

  const dirtyPreviousRequest = `10 Paint Sherwin-Williams OC-13 eggshell.\nNew request: I need 18 sheets of 1/2 regular Sheetrock.`
  expect(smsMaterialClarificationQuestions(dirtyPreviousRequest)).toEqual([
    "Sheetrock thickness: keep 1/2-in., or change to our standard 5/8-in.?",
  ])
  expect(smsMaterialClarificationQuestions("New request: I need 18 sheets of 1/2 regular Sheetrock.")).toEqual([
    "Sheetrock thickness: keep 1/2-in., or change to our standard 5/8-in.?",
  ])
  expect(evaluateSmsReplyGate({
    message: "New request: I need 18 sheets of 1/2 regular Sheetrock.",
    reply: "Sheetrock thickness: keep 1/2-in., or change to our standard 5/8-in.?",
    intent: "material_request",
    event: "message",
    participantRole: "lead",
    modelAutoSafe: true,
  })).toMatchObject({ level: "green", gateAutoSafe: true })
})

test("order intelligence blocks incomplete trade shorthand across core categories", () => {
  const cases = [
    ["I need 50 Sheet Rock", /5\/8-in\. regular Sheetrock/],
    ["I need 50 metal studs", /width and length/],
    ["I need 10 bags of thinset", /tile type and size/],
    ["I need roofing shingles for 500 sq ft", /shingle type and color/],
    ["I need 20 sheets plywood", /thickness and sheet size/],
    ["I need 10 windows", /window size and operating type/],
    ["I need a dumpster", /dumpster size/],
  ] as const

  for (const [message, expectedQuestion] of cases) {
    const assessment = smsMaterialIntelligenceAssessment(message)
    expect(assessment.readyForConfirmation, message).toBe(false)
    expect(assessment.missingCriticalDetails, message).toBe(true)
    expect(assessment.questions.join(" "), message).toMatch(expectedQuestion)
    expect(assessment.sourcePriority).toEqual([
      "avantia_catalog",
      "owner_approved_rule",
      "manufacturer_document",
      "general_construction_knowledge",
    ])
  }
})

test("order intelligence permits a fully specified Sheetrock request", () => {
  expect(smsMaterialIntelligenceAssessment("50 sheets of 5/8 regular Sheetrock")).toMatchObject({
    matchedRules: ["drywall-sheet"],
    questions: [],
    missingCriticalDetails: false,
    readyForConfirmation: true,
    confidence: 0.98,
  })
})

test("simple intake preserves intelligence status for manager review", async () => {
  const brokerSource = await readFile(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8")
  expect(brokerSource).toContain("!input.intelligenceReady")
  expect(brokerSource).toContain("const SIMPLE_REQUEST_INTAKE")
  expect(brokerSource).toContain("!SIMPLE_REQUEST_INTAKE")
  expect(brokerSource).toContain("aura_material_intelligence_evaluations")
  expect(brokerSource).toContain("intelligence_assessment")
})

test("Sheetrock follow-ups answer thickness corrections instead of repeating quantity", () => {
  const conversation = "Customer: Do you sell sheetrocc?\nAvantia: What type and how many sheets?"
  expect(smsSheetrockSpecificationFollowUpReply("What thinnest do you have?", conversation)).toBe("5/8 in. is the standard Sheetrock option. Can you confirm 5/8 in.?")
  expect(smsSheetrockSpecificationFollowUpReply("I asked what do you have not how many?", conversation)).toBe("5/8 in. is the standard Sheetrock option. Can you confirm 5/8 in.?")
  expect(smsSheetrockSpecificationFollowUpReply("How many screws do you have?", conversation)).toBeNull()
  expect(smsSheetrockSpecificationFollowUpReply("What thickness do you have?", "Customer: plywood")).toBeNull()
})

test("misspelled Sheetrock type answers advance to the next missing detail", async () => {
  const transcript = "Customer: I need 20 sheets of Sheetrock\nCustomer: Relugar"
  expect(normalizeSmsMaterialAnswerTypos("Relugar")).toBe("regular")
  expect(normalizeSmsMaterialAnswerTypos("regualr, tyep x, moisture resistent, fire ratted"))
    .toBe("regular, Type X, moisture-resistant, fire-rated")

  const assessment = smsMaterialIntelligenceAssessment(
    normalizeSmsMaterialAnswerTypos(transcript),
  )
  expect(assessment.questions).toEqual(["Can we do 5/8-in. Sheetrock?"])
  expect(assessment.questions.join(" ")).not.toMatch(/regular|Type X|moisture-resistant/i)

  const brokerSource = await readFile(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8")
  expect(brokerSource).toContain("normalizeSmsMaterialAnswerTypos(aggregateIntelligenceText)")
  expect(brokerSource).toContain("normalizeSmsMaterialAnswerTypos(effectiveBody)")
})

test("short metal-stud answers keep conversation context and ask only missing specifications", () => {
  const conversation = "Customer: Do you sell metal studs?\nAvantia: What type and how many metal studs do you need?"
  const partial = smsShortMaterialAnswerReply("2x4 50", conversation) || ""
  expect(partial).toBe("Got it—50 2x4 metal studs. What length do you need?")
  expect(inspectSmsQuestionStructure(partial)).toMatchObject({ valid: true, questionMarks: 1 })
  expect(evaluateSmsReplyGate({ message: "2x4 50", reply: partial, intent: "material_request", event: "message", participantRole: "lead", modelAutoSafe: true })).toMatchObject({ level: "green", gateAutoSafe: true })
  expect(smsShortMaterialAnswerReply("2 x 4, 50 pcs", conversation)).toBe("Got it—50 2x4 metal studs. What length do you need?")
  expect(smsShortMaterialAnswerReply("2x4x10 50", conversation)).toBe("Got it—50 2x4x10 metal studs. What gauge?")
  expect(smsShortMaterialAnswerReply("2x4 50", "Customer: Do you sell Sheetrock?")).toBeNull()
})

test("quantity corrections preserve the next unanswered essential question", () => {
  const gaugeOnly = "Customer: I need 40 3-5/8 x 10 ft metal studs\nAvantia: What gauge do you need?\nCustomer: Correction, make it 44";
  expect(smsCorrectionPendingQuestionReply("Correction, make it 44", gaugeOnly)).toBe("Got it—I’ll note 44 for review. What gauge do you need?");

  const multiplePending = "Customer: I need metal studs\nAvantia: What size and length? What gauge? How many do you need?\nCustomer: Correction: 44";
  expect(smsCorrectionPendingQuestionReply("Correction: 44", multiplePending)).toBe("Got it—I’ll note 44 for review. What size and length?");
  expect(inspectSmsQuestionStructure(smsCorrectionPendingQuestionReply("Correction: 44", multiplePending) || "")).toMatchObject({ valid: true, questionMarks: 1 });
  expect(smsCorrectionPendingQuestionReply("Correction, make it 44", "Customer: I need Sheetrock\nAvantia: How many sheets do you need?\nCustomer: Correction, make it 44")).toBeNull();
})

test("short quantities fill the field just asked instead of repeating the same question", () => {
  const roofing = "Customer: I need roofing shingles\nAvantia: What shingle type and color? How many square feet do you need?\nCustomer: 500 sq ft"
  expect(smsContextualQuantityAnswerReply("500 sq ft", roofing)).toBe("Got it—500 sq ft of roofing shingles. What shingle type do you need?")
  expect(smsContextualQuantityAnswerReply("500 sf", roofing)).toBe("Got it—500 sq ft of roofing shingles. What shingle type do you need?")
  const thinset = "Customer: I need thinset\nAvantia: How many bags do you need?\nCustomer: 20 bags"
  expect(smsContextualQuantityAnswerReply("20 bags", thinset)).toBe("Got it—20 bags of thinset. Which thinset do you need?")
  const sheetrock = "Customer: I need Sheetrock\nAvantia: How many sheets do you need?\nCustomer: 25"
  expect(smsContextualQuantityAnswerReply("25", sheetrock)).toBe("Got it—25 sheets of Sheetrock. Can you confirm 5/8 in.?")
  expect(smsContextualQuantityAnswerReply("1,000", sheetrock)).toBe("Got it—1000 sheets of Sheetrock. Can you confirm 5/8 in.?")
  const metalStuds = "Customer: New request: I need metal studs.\nAvantia: Sure — how much do you need?\nCustomer: 40"
  const metalStudReply = smsContextualQuantityAnswerReply("40", metalStuds) || ""
  expect(metalStudReply).toBe("Got it—40 metal studs. What stud size do you need?")
  expect(inspectSmsQuestionStructure(metalStudReply)).toMatchObject({ valid: true, questionMarks: 1 })
  expect(evaluateSmsReplyGate({ message: "40", reply: metalStudReply, intent: "material_request", event: "message", participantRole: "lead", modelAutoSafe: true })).toMatchObject({ level: "green", gateAutoSafe: true })
  expect(smsContextualQuantityAnswerReply("40 peices", metalStuds)).toBe("Got it—40 metal studs. What stud size do you need?")
  expect(smsContextualQuantityAnswerReply("500 sq ft", "Customer: I need roofing shingles\nAvantia: What color?\nCustomer: 500 sq ft")).toBeNull()
})

test("a supplied quantity can never trigger the same generic quantity question again", () => {
  expect(smsHasExplicitQuantity("I need 45 sheetrocks and 20 bricks")).toBe(true)
  expect(smsAnsweredQuantityGuardReply("I need 45 sheetrocks and 20 bricks", "Sure — how much do you need?")).toBe(
    "Got it—45 Sheetrock sheets and 20 bricks. Can you confirm 5/8 in. Sheetrock?",
  )
  expect(smsAnsweredQuantityGuardReply("I need like 40", "Sure — how much do you need?")).toBe("Got it—40. Which item is that quantity for?")
  expect(smsAnsweredQuantityGuardReply("I need like 40", "What gauge do you need?")).toBeNull()
})

test("trade unit abbreviations count as supplied quantities", () => {
  for (const message of [
    "Need 2 gal Sherwin Williams OC-13 eggshell paint",
    "Need 3 qt primer",
    "Need 500 sf shingles",
    "Need 120 lf track",
    "Need 20 lb compound",
    "Need 6 oz adhesive",
    "I need 24 white vinyl windows",
    "Nueva solicitud: necesito 400 bloques CMU de 8 pulgadas",
    "אני צריך 3 דליים של פריימר לגבס",
    "need fifty two be fours eight foot",
  ]) expect(smsHasExplicitQuantity(message), message).toBe(true)
})

test("essential product-type follow-ups pass the safety gate", () => {
  for (const reply of ["Which thinset do you need?", "Which item is that quantity for?", "Which brick do you need?"]) {
    expect(inspectSmsQuestionStructure(reply), reply).toMatchObject({ valid: true, fields: ["specification"] })
    expect(smsOutputSafetySignals({ message: "Need material", reply, intent: "material_request", exactListOnly: true }), reply).toEqual([])
  }
})

test("a product name such as Type S does not look like a repeated specification question", () => {
  const reply = "What is the full delivery address for the 8 bags of Type S mortar?"
  expect(inspectSmsQuestionStructure(reply)).toMatchObject({ valid: true, fields: ["address"] })
  expect(smsOutputSafetySignals({ message: "Need 8 bags Type S mortar", reply, intent: "material_request" })).toEqual([])
})

test("deterministic progression keeps Spanish even without accent marks", () => {
  const message = "Nueva solicitud: necesito 400 bloques CMU de 8 pulgadas"
  expect(smsReplyLanguage(message)).toBe("es")
  expect(smsDeliveryDetailsQuestionReply(message)).toBe("¿Cuál es la dirección completa de entrega?")
  expect(smsQuantityClarificationReply(message)).toBe("Claro—¿qué cantidad necesita?")
})

test("bare quantities keep the requested product in wood, finishing, and mixed-list continuations", () => {
  const cases = [
    ["40", "Customer: I need wood studs\nAvantia: How many pieces do you need?", "Got it—40 wood studs. What stud size do you need?"],
    ["40 pcs", "Customer: I need wood studs\nAvantia: How many pieces do you need?", "Got it—40 wood studs. What stud size do you need?"],
    ["4", "Customer: I need drywall screws\nAvantia: How many boxes do you need?", "Got it—4 boxes. What screw length do you need?"],
    ["4 boxes", "Customer: I need drywall screws\nAvantia: How many boxes do you need?", "Got it—4 boxes. What screw length do you need?"],
    ["6", "Customer: I need joint compound\nAvantia: How many buckets do you need?", "Got it—6 buckets of joint compound. Can you confirm the compound type: 5-gallon all-purpose?"],
    ["6 buckets", "Customer: I need joint compound\nAvantia: How many buckets do you need?", "Got it—6 buckets of joint compound. Can you confirm the compound type: 5-gallon all-purpose?"],
    ["10", "Customer: I need paint\nAvantia: How many gallons do you need?", "Got it—10 gallons of paint. What paint color do you need?"],
    ["10 gallons", "Customer: I need paint\nAvantia: How many gallons do you need?", "Got it—10 gallons of paint. What paint color do you need?"],
    ["24", "Customer: I need corner bead\nAvantia: How many pieces do you need?", "Got it—24 pieces of corner bead. What corner bead type do you need?"],
    ["24 pcs", "Customer: I need corner bead\nAvantia: How many pieces do you need?", "Got it—24 pieces of corner bead. What corner bead type do you need?"],
    ["40", "Customer: I need 20 Sheetrock sheets and metal studs\nAvantia: How many metal studs do you need?", "Got it—40 metal studs. What stud size do you need?"],
    ["20", "Customer: I need Sheetrock and metal studs\nAvantia: How many Sheetrock sheets do you need?", "Got it—20 sheets of Sheetrock. Can you confirm 5/8 in.?"],
    ["5", "Customer: I need paint and joint compound\nAvantia: How many buckets of joint compound do you need?", "Got it—5 buckets of joint compound. Can you confirm the compound type: 5-gallon all-purpose?"],
    ["8", "Customer: I need paint and joint compound\nAvantia: How many gallons of paint do you need?", "Got it—8 gallons of paint. What paint color do you need?"],
    ["30", "Customer: I need wood studs and screws\nAvantia: How many wood studs do you need?", "Got it—30 wood studs. What stud size do you need?"],
    ["3", "Customer: I need wood studs and screws\nAvantia: How many boxes of screws do you need?", "Got it—3 boxes. What screw length do you need?"],
    ["12", "Customer: I need corner bead and compound\nAvantia: How many pieces of corner bead do you need?", "Got it—12 pieces of corner bead. What corner bead type do you need?"],
    ["2", "Customer: I need corner bead and compound\nAvantia: How many buckets of compound do you need?", "Got it—2 buckets of joint compound. Can you confirm the compound type: 5-gallon all-purpose?"],
    ["50", "Customer: I need Sheetrock and metal studs\nAvantia: How many do you need?", null],
    ["5", "Customer: I need paint and compound\nAvantia: How much do you need?", null],
  ] as const
  expect(cases).toHaveLength(20)
  for (const [answer, context, expected] of cases) {
    const reply = smsContextualQuantityAnswerReply(answer, `${context}\nCustomer: ${answer}`)
    expect(reply, `${answer} in ${context}`).toBe(expected)
    if (reply) expect(inspectSmsQuestionStructure(reply), reply).toMatchObject({ valid: true })
  }
})

test("staged unanswered follow-up is question-aware and cancels on every later response", () => {
  const eligible = {
    originalMessage: "Need thinset",
    questionReply: "Sure — how much thinset do you need?",
    intent: "material_request" as const,
    event: "message" as const,
    participantRole: "lead" as const,
    safetyLevel: "green" as const,
    gateAutoSafe: true,
  }
  expect(smsUnansweredFollowUpEligible(eligible)).toBe(true)
  expect(smsUnansweredFollowUpText(eligible)).toBe("Still need help with the quantity?")
  expect(smsUnansweredFollowUpStageText({ originalMessage: eligible.originalMessage, questionReply: "Still need help with the quantity?", stage: 1 })).toBe("Still need help with the quantity?")
  expect(smsUnansweredFollowUpStageText({ ...eligible, stage: 2 })).toBe("Do you still want help completing this material request?")
  expect(smsUnansweredFollowUpStageText({ ...eligible, stage: 3 })).toBe("Should we keep this material request open for you?")
  expect(smsUnansweredFollowUpText({ originalMessage: "Do you sell Sheetrock?", questionReply: "Regular, Type X/fire-rated, or moisture-resistant? How many sheets do you need?" })).toBe("Can you confirm 5/8 in., type, and quantity?")
  expect(smsUnansweredFollowUpText({ originalMessage: "I need roofing shingles", questionReply: "What shingle type and color? How many square feet do you need?" })).toBe("Still need help with the shingle type, color, or quantity?")
  expect(smsUnansweredFollowUpText({ originalMessage: "I need roofing shingles", questionReply: "What shingle type and color?" })).toBe("Still need help with the shingle type or color?")
  expect(smsUnansweredFollowUpText({ originalMessage: "New request: I need metal studs", questionReply: "What size and length? What gauge? How many do you need?" })).toBe("Still need help with the stud size, length, gauge, or quantity?")
  expect(smsUnansweredFollowUpText({ originalMessage: "New request: I need metal studs", questionReply: "What size and length? What gauge?" })).toBe("Still need help with the stud size, length, or gauge?")
  expect(smsUnansweredFollowUpText({ originalMessage: "Do you sell metal studs?", questionReply: "What length? What gauge?" })).toBe("Still need help with the stud length or gauge?")
  expect(smsUnansweredFollowUpText({ originalMessage: "Do you sell Sheetrock?", questionReply: "Can you confirm 5/8 in.?" })).toBe("Can you confirm 5/8 in.?")
  expect(smsUnansweredFollowUpText({ originalMessage: "New request: I need wood studs", questionReply: "What size and length?" })).toBe("Still need help with the stud size or length?")
  expect(smsUnansweredFollowUpText({ originalMessage: "Need wood studs", questionReply: "What size? How many do you need?" })).toBe("Still need help with the stud size or quantity?")
  expect(smsUnansweredFollowUpText({ originalMessage: "Need roofing shingles and Sheetrock", questionReply: "Can you confirm 5/8 in.? How many sheets do you need?" })).toBe("Can you confirm 5/8 in., type, and quantity?")
  expect(smsUnansweredFollowUpText({ originalMessage: "Need Sheetrock and wood studs", questionReply: "What stud size? How many do you need?" })).toBe("Still need help with the stud size or quantity?")
  expect(smsUnansweredFollowUpText({ originalMessage: "Need product", questionReply: "What type? How many do you need?" })).toBe("Still need help with the product details or quantity?")
  expect(smsUnansweredFollowUpText({ originalMessage: "Necesito yeso", questionReply: "¿Cuál es la dirección completa de entrega?" })).toBe("¿Aún necesita ayuda con la dirección de entrega?")
  expect(smsUnansweredFollowUpText({ originalMessage: "צריך גבס", questionReply: "מתי החומרים נדרשים, ומה כתובת המשלוח המלאה?" })).toBe("עדיין צריך עזרה עם פרטי המשלוח?")
  expect(smsUnansweredFollowUpEligible({ ...eligible, questionReply: "?" })).toBe(false)
  expect(smsUnansweredFollowUpEligible({ ...eligible, safetyLevel: "red" })).toBe(false)
  expect(smsUnansweredFollowUpEligible({ ...eligible, gateAutoSafe: false })).toBe(false)
  expect(smsUnansweredFollowUpEligible({ ...eligible, participantRole: "supplier" })).toBe(false)
  expect(smsUnansweredFollowUpEligible({ ...eligible, intent: "follow_up" })).toBe(false)
  expect(smsUnansweredFollowUpEligible({ ...eligible, requestComplete: true })).toBe(false)
  expect(smsUnansweredFollowUpEligible({ ...eligible, originalMessage: "STOP" })).toBe(false)
  expect(isSmsBareGreeting("Hi")).toBe(true)
  expect(isSmsBareGreeting("hola! ")).toBe(true)
  expect(isSmsBareGreeting("Hi, I need drywall")).toBe(false)
  expect(smsUnansweredFollowUpEligible({ ...eligible, originalMessage: "Hi", intent: "greeting", questionReply: "How can we help?" })).toBe(false)

  const active = { sourceExists: true, autoSafeActive: true, hasLaterInbound: false, hasLaterOutbound: false, requestClosed: false }
  expect(smsUnansweredFollowUpCancellationReason(active)).toBeNull()
  expect(smsUnansweredFollowUpCancellationReason({ ...active, hasLaterInbound: true })).toBe("customer replied after the AI question")
  expect(smsUnansweredFollowUpCancellationReason({ ...active, hasLaterOutbound: true })).toBe("a human or later outbound reply was sent")
  expect(smsUnansweredFollowUpCancellationReason({ ...active, requestClosed: true })).toBe("the material request is already complete or closed")
  expect(smsUnansweredFollowUpCancellationReason({ ...active, autoSafeActive: false })).toBe("contact auto-safe mode is no longer active")
})

test("multilingual opt-out disables every automatic reply and unanswered follow-up", () => {
  const optOuts = ["STOP", "unsubscribe.", "END!", "quit?", "BAJA", "PARAR.", "CANCELAR!", "הסר", "הפסק!"]
  const eligible = {
    questionReply: "What quantity?",
    intent: "material_request" as const,
    event: "message" as const,
    participantRole: "lead" as const,
    safetyLevel: "green" as const,
    gateAutoSafe: true,
  }

  for (const originalMessage of optOuts) {
    expect(isSmsOptOutMessage(originalMessage), originalMessage).toBe(true)
    expect(smsUnansweredFollowUpEligible({ ...eligible, originalMessage }), originalMessage).toBe(false)
  }

  expect(isSmsOptOutMessage("Please cancel my order")).toBe(false)
  expect(isSmsOptOutMessage("Do not cancel the delivery")).toBe(false)
})

test("unknown AI fallback stays review-only and never emits the rejected generic sentence", () => {
  expect(looksLikeSmsMaterialRequest("Need thinset")).toBe(true)
  expect(smsHasExplicitQuantity("Need thinset")).toBe(false)
  expect(smsQuantityClarificationReply("Need thinset")).toBe("Sure — how much thinset do you need?")
  const fallback = smsUnknownContextFallback()
  expect(fallback.autoSafe).toBe(false)
  expect(fallback.reply).not.toBe("Thanks for your message. I am checking the conversation, and a manager will reply here if confirmation is needed.")
  expect(fallback.reply).toContain("manager review required")
})

test("unanswered follow-up persistence is staged, unique, and cron dispatched", async () => {
  const [migration, broker] = await Promise.all([
    readFile(path.join(root, "supabase/migrations/20260830223000_add_sms_unanswered_followups.sql"), "utf8"),
    readFile(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8"),
  ])
  expect(migration).toContain("unique (source_communication_id)")
  expect(migration).toContain("status in ('pending', 'processing', 'sent', 'cancelled', 'failed')")
  expect(migration).toContain("dispatch-sms-unanswered-followups")
  expect(migration).toContain("* * * * *")
  expect(broker).toContain("now() + interval '10 minutes'")
  expect(broker).toContain('followUp.follow_up_stage === 1 ? "2 hours" : "24 hours"')
  expect(broker).toContain("follow_up_stage = follow_up_stage + 1")
  expect(broker).toContain('model: "deterministic-product-inquiry"')
  expect(broker).toContain("before older lists in the same phone thread")
  expect(broker).toContain("for update skip locked")
  expect(broker).toContain("later.direction = 'incoming'")
  expect(broker).toContain("later.direction = 'outgoing'")
  expect(broker).toContain("newer customer message received")
  expect(broker).toContain("status in ('pending', 'processing')")
  const automationStart = broker.indexOf("async function processCustomerSmsAutomation")
  const immediateCancel = broker.indexOf("newer customer message received", automationStart)
  const confirmationCheck = broker.indexOf("confirmPendingSmsRequest(communicationId", automationStart)
  expect(immediateCancel).toBeGreaterThan(automationStart)
  expect(immediateCancel).toBeLessThan(confirmationCheck)
  expect(broker).toContain("where id = ${followUp.id}::uuid and status = 'processing'")
  expect(broker).not.toContain("Thanks for your message. I am checking the conversation, and a manager will reply here if confirmation is needed.")
})

test("exact-list preference persists beyond the 24-message context window", () => {
  const oldInstruction = "Customer: Exact list only. No extras."
  const newerMessages = Array.from({ length: 30 }, (_, index) => `Customer: follow-up ${index + 1}`).join("\n")
  const truncatedWindow = newerMessages.split("\n").slice(-24).join("\n")
  expect(truncatedWindow).not.toContain(oldInstruction)
  expect(resolveSmsExactListPreference({ storedContact: true, conversationText: truncatedWindow, latestMessage: "Any update?" })).toBe(true)
  expect(resolveSmsExactListPreference({ storedContact: false, storedDraft: true, conversationText: truncatedWindow })).toBe(true)
  expect(resolveSmsExactListPreference({ conversationText: `${oldInstruction}\n${newerMessages}` })).toBe(true)
  expect(resolveSmsDeliveryAddressKnown({ latestMessage: "Calle Sol 55" })).toBe(false)
  expect(resolveSmsDeliveryAddressKnown({ latestMessage: "רחוב הרצל 10" })).toBe(false)
  expect(resolveSmsDeliveryAddressKnown({ latestMessage: "Calle Sol 55, Miami, FL 33101" })).toBe(true)
  expect(resolveSmsDeliveryAddressKnown({ latestMessage: "רחוב הרצל 10, Brooklyn, NY 11201" })).toBe(true)
})

test("delivery-address state belongs to one active request and resets for a second job", () => {
  expect(resolveSmsDeliveryAddressKnown({ storedDraft: true, latestMessage: "Add 10 studs" })).toBe(true)
  expect(smsStartsNewMaterialRequest("New job: 10 doors")).toBe(true)
  expect(resolveSmsDeliveryAddressKnown({ storedDraft: true, latestMessage: "New job: 10 doors", startsNewRequest: true })).toBe(false)
  expect(resolveSmsDeliveryAddressKnown({ storedDraft: false, latestMessage: "10 doors" })).toBe(false)
  expect(resolveSmsDeliveryAddressKnown({ storedDraft: true, latestMessage: "New job at 18 Main St", startsNewRequest: true })).toBe(false)
  expect(resolveSmsDeliveryAddressKnown({ storedDraft: true, latestMessage: "New job at 18 Main Street, Cedarhurst, NY 11516", startsNewRequest: true })).toBe(true)
})

test("exact-list item provenance removes model-added accessories before persistence", () => {
  const customer = "Exact list only: 20 drywall sheets and 6 compound buckets. No extras."
  const modelItems = [
    { name: "drywall sheets", quantity: 20, unit: "sheets" },
    { name: "compound buckets", quantity: 6, unit: "buckets" },
    { name: "drywall screws", quantity: 20, unit: "boxes" },
    { name: "corner bead", quantity: 10, unit: "pieces" },
  ]
  expect(filterSmsExactListItems(modelItems, customer)).toEqual(modelItems.slice(0, 2))
})

test("exact-list grounding preserves explicit singular items without guessing package quantities", () => {
  const door = { name: "door", quantity: 1, unit: "each" }
  const drywallSheet = { name: "drywall sheets", quantity: 1, unit: "sheets" }
  const canonicalSheetrock = { name: "sheetrock sheet", quantity: 1, unit: "sheets" }
  const accessory = { name: "door screws", quantity: 1, unit: "box" }
  const ambiguousBox = { name: "drywall screws", quantity: 1, unit: "box" }

  expect(filterSmsExactListItems([door, accessory], "exact list only: one door")).toEqual([door])
  expect(filterSmsExactListItems([drywallSheet], "exact list only: drywall sheet")).toEqual([drywallSheet])
  expect(filterSmsExactListItems([canonicalSheetrock], "exact list only: drywall sheet")).toEqual([canonicalSheetrock])
  expect(filterSmsExactListItems([ambiguousBox], "exact list only: drywall screws")).toEqual([])
  expect(filterSmsExactListItems([{ ...drywallSheet, quantity: 2 }], "exact list only: drywall sheet")).toEqual([])
})

test("training redaction removes identity, project, references, and atypical multilingual addresses", () => {
  const raw = "My name is David Avitan; Company: Apex Build LLC; Project: Sunset Tower; Customer ID CUST-7788; PO #PO-9912; deliver to 18-22 Main Street, Brooklyn NY 11201; dirección Calle Sol 55; שם: דוד אביטן; רחוב הרצל 10, תל אביב"
  const safe = redactSmsTrainingText(raw)
  for (const privateValue of ["David Avitan", "Apex Build LLC", "Sunset Tower", "CUST-7788", "PO-9912", "18-22 Main Street", "Calle Sol 55", "דוד אביטן", "הרצל 10"]) {
    expect(safe).not.toContain(privateValue)
  }
  expect(safe).toContain("[PRIVATE_NAME]")
  expect(safe).toContain("[REFERENCE]")
  expect(safe).toContain("[FULL_ADDRESS]")
  expect(redactSmsTrainingText("Thanks, David — Apex Construction will follow up.", ["David Avitan", "David", "Apex Construction"])).toBe("Thanks, [PRIVATE_NAME] — [PRIVATE_NAME] will follow up.")
})

test("Reply Lab authorization matches the manager page capabilities", () => {
  expect(canRunSmsReplyLab({ aiTools: true, customers: true })).toBe(true)
  expect(canRunSmsReplyLab({ aiTools: true, customers: false })).toBe(false)
  expect(canRunSmsReplyLab({ aiTools: false, customers: true })).toBe(false)
})
