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
  inspectSmsQuestionStructure,
  isSmsOptOutMessage,
  looksLikeSmsMaterialRequest,
  resolveSmsDeliveryAddressKnown,
  resolveSmsExactListPreference,
  resolveSmsMaterialReplyStep,
  smsDeliveryDetailsQuestionReply,
  smsContextualQuantityAnswerReply,
  smsHasExplicitQuantity,
  smsHasNeededByTiming,
  smsMaterialClarificationQuestions,
  smsNeededByTimingValue,
  smsOutputSafetySignals,
  smsProductInquiryFallbackReply,
  smsQuantityClarificationReply,
  smsReplyParts,
  smsSheetrockSpecificationFollowUpReply,
  smsShortMaterialAnswerReply,
  smsStartsNewMaterialRequest,
  smsUnknownContextFallback,
  smsUnansweredFollowUpCancellationReason,
  smsUnansweredFollowUpEligible,
  smsUnansweredFollowUpText,
} from "../supabase/functions/_shared/sms-reply-policy"

const root = process.cwd()

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

test("latest decision allows up to three essential questions and rejects padding, repeats, and bundles", () => {
  expect(inspectSmsQuestionStructure("What size?").valid).toBe(true)
  expect(inspectSmsQuestionStructure("What is the full delivery address?").valid).toBe(true)
  expect(inspectSmsQuestionStructure("I have the material list. What is the full delivery address?")).toMatchObject({ valid: true, requestedFields: 1, fields: ["address"] })
  expect(inspectSmsQuestionStructure("קיבלתי את רשימת החומרים. מה כתובת המשלוח המלאה?")).toMatchObject({ valid: true, requestedFields: 1, fields: ["address"] })
  expect(inspectSmsQuestionStructure("Recibí la lista de materiales. ¿Cuál es la dirección completa de entrega?")).toMatchObject({ valid: true, requestedFields: 1, fields: ["address"] })
  expect(inspectSmsQuestionStructure("What size and thickness?")).toMatchObject({ valid: false, requestedFields: 2 })
  expect(inspectSmsQuestionStructure("What size? What thickness? What quantity?")).toMatchObject({ valid: true, questionMarks: 3 })
  expect(inspectSmsQuestionStructure("What size? What thickness? What quantity? What brand?")).toMatchObject({ valid: false, questionMarks: 4 })
  expect(inspectSmsQuestionStructure("What size? What size?").valid).toBe(false)
  expect(inspectSmsQuestionStructure("What is the full delivery address?", ["address"]).valid).toBe(false)
  expect(inspectSmsQuestionStructure("¿Qué tamaño y cantidad necesita?").valid).toBe(false)
  expect(inspectSmsQuestionStructure("איזה גודל וכמה יחידות?").valid).toBe(false)
  expect(evaluateSmsReplyGate({ message: "20 drywall sheets", reply: "Would you like to add accessories?", intent: "material_request", event: "message", participantRole: "lead", modelAutoSafe: true })).toMatchObject({ level: "red", gateAutoSafe: false })
  expect(evaluateSmsReplyGate({ message: "20 drywall sheets", reply: "What is your favorite movie?", intent: "material_request", event: "message", participantRole: "lead", modelAutoSafe: true })).toMatchObject({ level: "red", gateAutoSafe: false })
})

test("required questions stay green while optional recommendation statements cannot hide beside them", () => {
  const required = [
    "What size do you need?",
    "How many pieces do you need?",
    "What is the full delivery address?",
    "When do you need it?",
    "What color and finish do you need?",
    "What size and length? What gauge?",
    "What screw length? What thread type?",
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
  expect(smsQuantityClarificationReply("New request: I need Sheetrock")).toBe("How many sheets do you need? Is 5/8 in. okay?")
  expect(inspectSmsQuestionStructure(smsQuantityClarificationReply("New request: I need Sheetrock")).valid).toBe(true)
  expect(resolveSmsMaterialReplyStep({ isMaterialRequest: true, hasGroundedItems: true, quantityKnown: false, addressKnown: false, neededByKnown: false, proposedReply: "A manager will review." })).toBe("quantity")
  expect(smsHasExplicitQuantity("Need 4 bags of thinset")).toBe(true)
  expect(resolveSmsMaterialReplyStep({ isMaterialRequest: true, hasGroundedItems: true, quantityKnown: true, addressKnown: false, neededByKnown: false, proposedReply: "A manager will review." })).toBe("address_and_needed_by")
  expect(smsDeliveryDetailsQuestionReply("Need 4 bags of thinset")).toBe("When do you need it, and what’s the full delivery address?")
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
  expect(inspectSmsQuestionStructure("What thickness? What brand?").valid).toBe(true)
  expect(resolveSmsMaterialReplyStep({ isMaterialRequest: true, hasGroundedItems: true, addressKnown: true, neededByKnown: true, proposedReply: "I have the details. A manager will review." })).toBe("proposed")
  expect(resolveSmsMaterialReplyStep({ isMaterialRequest: true, hasGroundedItems: true, addressKnown: true, neededByKnown: true, proposedReply: "Would you like to add accessories?" })).toBe("complete")
})

test("ambiguous material lists must be clarified before confirmation", () => {
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
    "For “corner bit,” which corner bead type and length: metal or vinyl, 8 ft or 10 ft?",
    "What paint color and finish do you need?",
  ])
  expect(inspectSmsQuestionStructure(smsMaterialClarificationQuestions(list).join(" "))).toMatchObject({
    valid: true,
    questionMarks: 3,
  })
  const answered = `${list}\nUse 5/8. Yes, 8-ft metal corner bead. White eggshell paint.`
  expect(smsMaterialClarificationQuestions(answered)).toEqual([])
  expect(smsMaterialClarificationQuestions(`${list}\n10 Paint Sherwin Williams OC`)).toEqual([
    "For “corner bit,” which corner bead type: metal or vinyl?",
    "What paint finish do you need?",
  ])
  expect(smsMaterialClarificationQuestions(`${list}\nUse 5/8. Yes, 10-ft metal corner bead. Sherwin-Williams OC-13.`)).toEqual([
    "What paint finish do you need?",
  ])
  expect(smsMaterialClarificationQuestions(`${list}\nUse 5/8. Yes, 10-ft metal corner bead. Sherwin-Williams OC-13 eggshell.`)).toEqual([])
  expect(smsMaterialClarificationQuestions("1 box drywall screws 1/2 in.")).toEqual([])
  expect(smsMaterialClarificationQuestions(`${list}\nUse 5/8. Yes, 8-ft metal corner bead. Eggshell paint.`)).toEqual(["What paint color do you need?"])
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

test("broker-created request progression replies are gated independently from model review flags", async () => {
  const brokerSource = await readFile(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8")
  expect(brokerSource).toContain('const deterministicProgression = params.result.isMaterialRequest')
  expect(brokerSource).toContain("const gateModelAutoSafe = result.autoSafe || deterministicProgression")
  expect(brokerSource).toContain("customerNeededBy: smsNeededByTimingValue(context.customerText || reviewText) || \"\"")
  expect(brokerSource).toContain("const activeOrdered = newRequestBoundary >= 0 ? ordered.slice(newRequestBoundary) : ordered")
  expect(brokerSource).toContain('message.direction === "incoming" && smsStartsNewMaterialRequest')
  expect(brokerSource).toContain('customerEvent !== "correction" && !linkedCorrectionRequestId && deliveryAddressKnown')
  expect(brokerSource).toContain("occurred_at >= now() - interval '20 seconds'")
  expect(brokerSource).toContain('const customerEvent = smsStartsNewMaterialRequest(body)')
  expect(brokerSource).not.toContain("occurred_at >= now() - interval '10 minutes'")
  expect(brokerSource).toContain("if (draftCandidate && startsNewRequest) {")
  expect(brokerSource).toContain("if (!explicitConfirmation) {")
  expect(brokerSource).toContain("clarificationQuestions.length === 0")
  expect(brokerSource).toContain('if (openDraft && customerEvent === "message" && !analyzed.result.isMaterialRequest)')
  expect(brokerSource).toContain("the structured draft advances instead of falling back")
  expect(brokerSource).toContain('if (customerEvent === "correction") {')
  expect(brokerSource).toContain("and activity_id = ${activityId} and event_type = 'message.received'")
  expect(brokerSource).toContain("canonicalEvents[0]?.external_event_id === eventId")
  expect(brokerSource).toContain("sms_ai_provider_replay_suppressed")
  expect(brokerSource).toContain("needed_by_text, summary_text, summary_hash")
  expect(brokerSource).toContain("const neededBy = pending.needed_by_text?.trim() || smsNeededByTimingValue(pending.summary_text)")
  expect(brokerSource).toContain('manager_notes) values')
  expect(brokerSource).toContain('Needed by: ${neededBy}')
  expect(brokerSource).toContain("if (!input.customerAddress.trim() || !input.customerNeededBy.trim() || !input.request.items.length) return false")
  expect(brokerSource).toContain("if (!neededBy)")
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

test("product inquiry fallback answers the product and asks only useful next questions", () => {
  const sheetrock = smsProductInquiryFallbackReply("Do you sell sheetricj?")
  expect(sheetrock).toContain("Can you confirm 5/8 in.?")
  expect(sheetrock).toContain("Regular, Type X/fire-rated, or moisture-resistant? How many sheets do you need?")
  expect(smsProductInquiryFallbackReply("Do you carry Sheetrook drywall?")).toBe(sheetrock)
  expect(smsProductInquiryFallbackReply("Can I get Sheetrcok?")).toBe(sheetrock)
  expect(smsProductInquiryFallbackReply("Could we order shetrock?")).toBe(sheetrock)
  expect(smsProductInquiryFallbackReply("Do you have sheetrpck?")).toBe(sheetrock)
  expect(inspectSmsQuestionStructure(sheetrock || "")).toMatchObject({ valid: true, questionMarks: 3, requestedFields: 2 })
  expect(evaluateSmsReplyGate({ message: "Do you sell sheetricj?", reply: sheetrock || "", intent: "availability", event: "message", participantRole: "lead", modelAutoSafe: true })).toMatchObject({ level: "green", gateAutoSafe: true })
  const replyParts = smsReplyParts({ reply: sheetrock || "", deterministicProductInquiry: true })
  expect(replyParts).toHaveLength(2)
  expect(replyParts[0]).toBe("Yes. Can you confirm 5/8 in.?")
  expect(replyParts[1]).toBe("Regular, Type X/fire-rated, or moisture-resistant? How many sheets do you need?")
  expect(new Set(replyParts).size).toBe(replyParts.length)

  const exactListReply = smsProductInquiryFallbackReply("Do you sell Sheetrock?", { allowRelatedSuggestion: false }) || ""
  expect(smsReplyParts({ reply: exactListReply, deterministicProductInquiry: true, exactListOnly: true })).toHaveLength(2)
  expect(exactListReply).not.toMatch(/joint compound|corner bead|drywall screws/i)
  expect(evaluateSmsReplyGate({ message: "Do you sell Sheetrock?", reply: sheetrock || "", intent: "availability", event: "message", participantRole: "lead", modelAutoSafe: true, exactListOnly: true })).toMatchObject({ level: "green", gateAutoSafe: true })
  const unrelated = smsProductInquiryFallbackReply("Do you carry sheet metal?")
  expect(unrelated).toContain("sheet metal")
  expect(unrelated).not.toContain("Sheetrock")
  expect(smsProductInquiryFallbackReply("Can I get Sherlock?")).toBeNull()
  expect(smsProductInquiryFallbackReply("Need an update on my order")).toBeNull()
  const roofing = smsProductInquiryFallbackReply("I need roofing shingles") || ""
  expect(smsReplyParts({ reply: roofing, deterministicProductInquiry: true })).toEqual([
    "Sure—we can help source roofing shingles.",
    "What shingle type and color? How many square feet do you need?",
  ])
  expect(inspectSmsQuestionStructure(roofing)).toMatchObject({ valid: true, questionMarks: 2 })
  expect(smsProductInquiryFallbackReply("I need thinset")).toContain("How many bags do you need?")
  expect(smsProductInquiryFallbackReply("I need metal studs")).toContain("What size and length? What gauge? How many do you need?")
  const prefixedMetalStuds = smsProductInquiryFallbackReply("New request: I need metal studs") || ""
  expect(prefixedMetalStuds).toBe("Sure—we can help source metal studs.\n\nWhat size and length? What gauge? How many do you need?")
  expect(inspectSmsQuestionStructure(prefixedMetalStuds)).toMatchObject({ valid: true, questionMarks: 3 })
})

test("Sheetrock follow-ups answer thickness corrections instead of repeating quantity", () => {
  const conversation = "Customer: Do you sell sheetrocc?\nAvantia: What type and how many sheets?"
  expect(smsSheetrockSpecificationFollowUpReply("What thinnest do you have?", conversation)).toBe("5/8 in. is the standard Sheetrock option. Can you confirm 5/8 in.? Regular, Type X/fire-rated, or moisture-resistant?")
  expect(smsSheetrockSpecificationFollowUpReply("I asked what do you have not how many?", conversation)).toBe("5/8 in. is the standard Sheetrock option. Can you confirm 5/8 in.? Regular, Type X/fire-rated, or moisture-resistant?")
  expect(smsSheetrockSpecificationFollowUpReply("How many screws do you have?", conversation)).toBeNull()
  expect(smsSheetrockSpecificationFollowUpReply("What thickness do you have?", "Customer: plywood")).toBeNull()
})

test("short metal-stud answers keep conversation context and ask only missing specifications", () => {
  const conversation = "Customer: Do you sell metal studs?\nAvantia: What type and how many metal studs do you need?"
  const partial = smsShortMaterialAnswerReply("2x4 50", conversation) || ""
  expect(partial).toBe("Got it—50 2x4 metal studs. What length? What gauge?")
  expect(inspectSmsQuestionStructure(partial)).toMatchObject({ valid: true, questionMarks: 2 })
  expect(evaluateSmsReplyGate({ message: "2x4 50", reply: partial, intent: "material_request", event: "message", participantRole: "lead", modelAutoSafe: true })).toMatchObject({ level: "green", gateAutoSafe: true })
  expect(smsShortMaterialAnswerReply("2 x 4, 50 pcs", conversation)).toBe("Got it—50 2x4 metal studs. What length? What gauge?")
  expect(smsShortMaterialAnswerReply("2x4x10 50", conversation)).toBe("Got it—50 2x4x10 metal studs. What gauge?")
  expect(smsShortMaterialAnswerReply("2x4 50", "Customer: Do you sell Sheetrock?")).toBeNull()
})

test("short quantities fill the field just asked instead of repeating the same question", () => {
  const roofing = "Customer: I need roofing shingles\nAvantia: What shingle type and color? How many square feet do you need?\nCustomer: 500 sq ft"
  expect(smsContextualQuantityAnswerReply("500 sq ft", roofing)).toBe("Got it—500 sq ft of roofing shingles. What shingle type and color?")
  expect(smsContextualQuantityAnswerReply("500 sf", roofing)).toBe("Got it—500 sq ft of roofing shingles. What shingle type and color?")
  const thinset = "Customer: I need thinset\nAvantia: How many bags do you need?\nCustomer: 20 bags"
  expect(smsContextualQuantityAnswerReply("20 bags", thinset)).toBe("Got it—20 bags of thinset. Which thinset do you need?")
  const sheetrock = "Customer: I need Sheetrock\nAvantia: How many sheets do you need?\nCustomer: 25"
  expect(smsContextualQuantityAnswerReply("25", sheetrock)).toBe("Got it—25 sheets of Sheetrock. Can you confirm 5/8 in.?")
  expect(smsContextualQuantityAnswerReply("1,000", sheetrock)).toBe("Got it—1000 sheets of Sheetrock. Can you confirm 5/8 in.?")
  const metalStuds = "Customer: New request: I need metal studs.\nAvantia: Sure — how much do you need?\nCustomer: 40"
  const metalStudReply = smsContextualQuantityAnswerReply("40", metalStuds) || ""
  expect(metalStudReply).toBe("Got it—40 metal studs. What size and length? What gauge?")
  expect(inspectSmsQuestionStructure(metalStudReply)).toMatchObject({ valid: true, questionMarks: 2 })
  expect(evaluateSmsReplyGate({ message: "40", reply: metalStudReply, intent: "material_request", event: "message", participantRole: "lead", modelAutoSafe: true })).toMatchObject({ level: "green", gateAutoSafe: true })
  expect(smsContextualQuantityAnswerReply("40 peices", metalStuds)).toBe("Got it—40 metal studs. What size and length? What gauge?")
  expect(smsContextualQuantityAnswerReply("500 sq ft", "Customer: I need roofing shingles\nAvantia: What color?\nCustomer: 500 sq ft")).toBeNull()
})

test("bare quantities keep the requested product in wood, finishing, and mixed-list continuations", () => {
  const cases = [
    ["40", "Customer: I need wood studs\nAvantia: How many pieces do you need?", "Got it—40 wood studs. What size and length?"],
    ["40 pcs", "Customer: I need wood studs\nAvantia: How many pieces do you need?", "Got it—40 wood studs. What size and length?"],
    ["4", "Customer: I need drywall screws\nAvantia: How many boxes do you need?", "Got it—4 boxes. What screw length? What thread type?"],
    ["4 boxes", "Customer: I need drywall screws\nAvantia: How many boxes do you need?", "Got it—4 boxes. What screw length? What thread type?"],
    ["6", "Customer: I need joint compound\nAvantia: How many buckets do you need?", "Got it—6 buckets of joint compound. Can you confirm the compound type: 5-gallon all-purpose?"],
    ["6 buckets", "Customer: I need joint compound\nAvantia: How many buckets do you need?", "Got it—6 buckets of joint compound. Can you confirm the compound type: 5-gallon all-purpose?"],
    ["10", "Customer: I need paint\nAvantia: How many gallons do you need?", "Got it—10 gallons of paint. What paint color and finish do you need?"],
    ["10 gallons", "Customer: I need paint\nAvantia: How many gallons do you need?", "Got it—10 gallons of paint. What paint color and finish do you need?"],
    ["24", "Customer: I need corner bead\nAvantia: How many pieces do you need?", "Got it—24 pieces of corner bead. What corner bead type? What length?"],
    ["24 pcs", "Customer: I need corner bead\nAvantia: How many pieces do you need?", "Got it—24 pieces of corner bead. What corner bead type? What length?"],
    ["40", "Customer: I need 20 Sheetrock sheets and metal studs\nAvantia: How many metal studs do you need?", "Got it—40 metal studs. What size and length? What gauge?"],
    ["20", "Customer: I need Sheetrock and metal studs\nAvantia: How many Sheetrock sheets do you need?", "Got it—20 sheets of Sheetrock. Can you confirm 5/8 in.?"],
    ["5", "Customer: I need paint and joint compound\nAvantia: How many buckets of joint compound do you need?", "Got it—5 buckets of joint compound. Can you confirm the compound type: 5-gallon all-purpose?"],
    ["8", "Customer: I need paint and joint compound\nAvantia: How many gallons of paint do you need?", "Got it—8 gallons of paint. What paint color and finish do you need?"],
    ["30", "Customer: I need wood studs and screws\nAvantia: How many wood studs do you need?", "Got it—30 wood studs. What size and length?"],
    ["3", "Customer: I need wood studs and screws\nAvantia: How many boxes of screws do you need?", "Got it—3 boxes. What screw length? What thread type?"],
    ["12", "Customer: I need corner bead and compound\nAvantia: How many pieces of corner bead do you need?", "Got it—12 pieces of corner bead. What corner bead type? What length?"],
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

test("one-shot unanswered follow-up is question-aware and cancels on every later response", () => {
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

test("unanswered follow-up persistence is ten-minute, unique, one-shot, and cron dispatched", async () => {
  const [migration, broker] = await Promise.all([
    readFile(path.join(root, "supabase/migrations/20260830223000_add_sms_unanswered_followups.sql"), "utf8"),
    readFile(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8"),
  ])
  expect(migration).toContain("unique (source_communication_id)")
  expect(migration).toContain("status in ('pending', 'processing', 'sent', 'cancelled', 'failed')")
  expect(migration).toContain("dispatch-sms-unanswered-followups")
  expect(migration).toContain("* * * * *")
  expect(broker).toContain("now() + interval '10 minutes'")
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
  expect(resolveSmsDeliveryAddressKnown({ latestMessage: "Calle Sol 55" })).toBe(true)
  expect(resolveSmsDeliveryAddressKnown({ latestMessage: "רחוב הרצל 10" })).toBe(true)
})

test("delivery-address state belongs to one active request and resets for a second job", () => {
  expect(resolveSmsDeliveryAddressKnown({ storedDraft: true, latestMessage: "Add 10 studs" })).toBe(true)
  expect(smsStartsNewMaterialRequest("New job: 10 doors")).toBe(true)
  expect(resolveSmsDeliveryAddressKnown({ storedDraft: true, latestMessage: "New job: 10 doors", startsNewRequest: true })).toBe(false)
  expect(resolveSmsDeliveryAddressKnown({ storedDraft: false, latestMessage: "10 doors" })).toBe(false)
  expect(resolveSmsDeliveryAddressKnown({ storedDraft: true, latestMessage: "New job at 18 Main St", startsNewRequest: true })).toBe(true)
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
