import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { canRunSmsReplyLab } from "../lib/ai/sms-reply-lab-access"
import { redactSmsTrainingText } from "../lib/ai/sms-training-privacy"
import {
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
  smsHasExplicitQuantity,
  smsHasNeededByTiming,
  smsOutputSafetySignals,
  smsProductInquiryFallbackReply,
  smsQuantityClarificationReply,
  smsReplyParts,
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

test("material request advances across turns after address until complete", () => {
  expect(smsHasExplicitQuantity("Need thinset")).toBe(false)
  expect(smsQuantityClarificationReply("Need thinset")).toBe("Sure — how much thinset do you need?")
  expect(resolveSmsMaterialReplyStep({ isMaterialRequest: true, hasGroundedItems: true, quantityKnown: false, addressKnown: false, neededByKnown: false, proposedReply: "A manager will review." })).toBe("quantity")
  expect(smsHasExplicitQuantity("Need 4 bags of thinset")).toBe(true)
  expect(resolveSmsMaterialReplyStep({ isMaterialRequest: true, hasGroundedItems: true, quantityKnown: true, addressKnown: false, neededByKnown: false, proposedReply: "A manager will review." })).toBe("address_and_needed_by")
  expect(smsDeliveryDetailsQuestionReply("Need 4 bags of thinset")).toBe("When do you need it, and what’s the full delivery address?")
  expect(inspectSmsQuestionStructure(smsDeliveryDetailsQuestionReply("Need 4 bags of thinset")).valid).toBe(true)
  expect(resolveSmsMaterialReplyStep({ isMaterialRequest: true, hasGroundedItems: true, addressKnown: false, neededByKnown: false, proposedReply: "A manager will review." })).toBe("address_and_needed_by")
  expect(resolveSmsMaterialReplyStep({ isMaterialRequest: true, hasGroundedItems: true, addressKnown: true, neededByKnown: false, proposedReply: "A manager will review." })).toBe("needed_by")
  expect(smsHasNeededByTiming("Tomorrow")).toBe(true)
  expect(resolveSmsMaterialReplyStep({ isMaterialRequest: true, hasGroundedItems: true, addressKnown: true, neededByKnown: true, proposedReply: "What thickness? What brand?" })).toBe("proposed")
  expect(inspectSmsQuestionStructure("What thickness? What brand?").valid).toBe(true)
  expect(resolveSmsMaterialReplyStep({ isMaterialRequest: true, hasGroundedItems: true, addressKnown: true, neededByKnown: true, proposedReply: "I have the details. A manager will review." })).toBe("proposed")
  expect(resolveSmsMaterialReplyStep({ isMaterialRequest: true, hasGroundedItems: true, addressKnown: true, neededByKnown: true, proposedReply: "Would you like to add accessories?" })).toBe("complete")
})

test("product inquiry fallback answers the product and asks only useful next questions", () => {
  const sheetrock = smsProductInquiryFallbackReply("Do you sell sheetricj?")
  expect(sheetrock).toContain("For most interior walls, 1/2 in. is standard")
  expect(sheetrock).toContain("5/8 in. is commonly used for ceilings or fire-rated assemblies")
  expect(sheetrock).toContain("subject to the plans and code")
  expect(sheetrock).toContain("Is it for walls or ceilings? How many sheets do you need?")
  expect(sheetrock).toContain("Do you also need joint compound, tape, corner bead, or drywall screws?")
  expect(smsProductInquiryFallbackReply("Do you carry Sheetrook drywall?")).toBe(sheetrock)
  expect(smsProductInquiryFallbackReply("Can I get Sheetrcok?")).toBe(sheetrock)
  expect(smsProductInquiryFallbackReply("Could we order shetrock?")).toBe(sheetrock)
  expect(smsProductInquiryFallbackReply("Do you have sheetrpck?")).toBe(sheetrock)
  expect(inspectSmsQuestionStructure(sheetrock || "")).toMatchObject({ valid: true, questionMarks: 3, requestedFields: 1 })
  expect(evaluateSmsReplyGate({ message: "Do you sell sheetricj?", reply: sheetrock || "", intent: "availability", event: "message", participantRole: "lead", modelAutoSafe: true })).toMatchObject({ level: "green", gateAutoSafe: true })
  const replyParts = smsReplyParts({ reply: sheetrock || "", deterministicProductInquiry: true })
  expect(replyParts).toHaveLength(2)
  expect(replyParts[0]).toContain("subject to the plans and code")
  expect(replyParts[0]).toContain("How many sheets")
  expect(replyParts[1]).toBe("Do you also need joint compound, tape, corner bead, or drywall screws?")
  expect(new Set(replyParts).size).toBe(replyParts.length)

  const exactListReply = smsProductInquiryFallbackReply("Do you sell Sheetrock?", { allowRelatedSuggestion: false }) || ""
  expect(smsReplyParts({ reply: exactListReply, deterministicProductInquiry: true, exactListOnly: true })).toEqual([exactListReply])
  expect(exactListReply).not.toMatch(/joint compound|corner bead|drywall screws/i)
  expect(evaluateSmsReplyGate({ message: "Do you sell Sheetrock?", reply: sheetrock || "", intent: "availability", event: "message", participantRole: "lead", modelAutoSafe: true, exactListOnly: true })).toMatchObject({ level: "red", gateAutoSafe: false })
  const unrelated = smsProductInquiryFallbackReply("Do you carry sheet metal?")
  expect(unrelated).toContain("sheet metal")
  expect(unrelated).not.toContain("Sheetrock")
  expect(smsProductInquiryFallbackReply("Can I get Sherlock?")).toBeNull()
  expect(smsProductInquiryFallbackReply("Need an update on my order")).toBeNull()
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
