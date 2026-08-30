import { expect, test } from "@playwright/test"
import { canRunSmsReplyLab } from "../lib/ai/sms-reply-lab-access"
import { redactSmsTrainingText } from "../lib/ai/sms-training-privacy"
import {
  classifySmsReplyIntent,
  filterSmsExactListItems,
  inspectSmsQuestionStructure,
  resolveSmsDeliveryAddressKnown,
  resolveSmsExactListPreference,
  smsOutputSafetySignals,
} from "../supabase/functions/_shared/sms-reply-policy"

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
    ["A manager will confirm current pricing.", "pricing"],
    ["A manager will confirm availability.", "availability"],
    ["What is the full delivery address?", "delivery"],
  ] as const
  for (const [reply, intent] of unsafe) {
    expect(smsOutputSafetySignals({ reply, intent }), `${intent}: ${reply}`).not.toEqual([])
  }
  expect(smsOutputSafetySignals({ reply: "A manager will check and reply here.", intent: "follow_up" })).toEqual([])
  expect(classifySmsReplyIntent({ message: "Is this available?" })).toBe("availability")
})

test("question structure accepts one requested field and rejects bundled or repeated questions", () => {
  expect(inspectSmsQuestionStructure("What size?").valid).toBe(true)
  expect(inspectSmsQuestionStructure("What is the full delivery address?").valid).toBe(true)
  expect(inspectSmsQuestionStructure("What size and thickness?")).toMatchObject({ valid: false, requestedFields: 2 })
  expect(inspectSmsQuestionStructure("What size? What quantity?")).toMatchObject({ valid: false, questionMarks: 2 })
  expect(inspectSmsQuestionStructure("¿Qué tamaño y cantidad necesita?").valid).toBe(false)
  expect(inspectSmsQuestionStructure("איזה גודל וכמה יחידות?").valid).toBe(false)
})

test("exact-list preference persists beyond the 24-message context window", () => {
  const oldInstruction = "Customer: Exact list only. No extras."
  const newerMessages = Array.from({ length: 30 }, (_, index) => `Customer: follow-up ${index + 1}`).join("\n")
  const truncatedWindow = newerMessages.split("\n").slice(-24).join("\n")
  expect(truncatedWindow).not.toContain(oldInstruction)
  expect(resolveSmsExactListPreference({ storedContact: true, conversationText: truncatedWindow, latestMessage: "Any update?" })).toBe(true)
  expect(resolveSmsExactListPreference({ storedContact: false, storedDraft: true, conversationText: truncatedWindow })).toBe(true)
  expect(resolveSmsExactListPreference({ conversationText: `${oldInstruction}\n${newerMessages}` })).toBe(true)
  expect(resolveSmsDeliveryAddressKnown({ storedContact: true, conversationText: truncatedWindow })).toBe(true)
  expect(resolveSmsDeliveryAddressKnown({ latestMessage: "Calle Sol 55" })).toBe(true)
  expect(resolveSmsDeliveryAddressKnown({ latestMessage: "רחוב הרצל 10" })).toBe(true)
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

test("training redaction removes identity, project, references, and atypical multilingual addresses", () => {
  const raw = "My name is David Avitan; Company: Apex Build LLC; Project: Sunset Tower; Customer ID CUST-7788; PO #PO-9912; deliver to 18-22 Main Street, Brooklyn NY 11201; dirección Calle Sol 55; שם: דוד אביטן; רחוב הרצל 10, תל אביב"
  const safe = redactSmsTrainingText(raw)
  for (const privateValue of ["David Avitan", "Apex Build LLC", "Sunset Tower", "CUST-7788", "PO-9912", "18-22 Main Street", "Calle Sol 55", "דוד אביטן", "הרצל 10"]) {
    expect(safe).not.toContain(privateValue)
  }
  expect(safe).toContain("[PRIVATE_NAME]")
  expect(safe).toContain("[REFERENCE]")
  expect(safe).toContain("[FULL_ADDRESS]")
})

test("Reply Lab authorization matches the manager page capabilities", () => {
  expect(canRunSmsReplyLab({ aiTools: true, customers: true })).toBe(true)
  expect(canRunSmsReplyLab({ aiTools: true, customers: false })).toBe(false)
  expect(canRunSmsReplyLab({ aiTools: false, customers: true })).toBe(false)
})
