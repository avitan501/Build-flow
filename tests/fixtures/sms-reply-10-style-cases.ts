import type { SmsCorrectionReason } from "../../lib/ai/sms-training-privacy"
import type { SmsReplyIntent } from "../../supabase/functions/_shared/sms-reply-policy"

export type SmsReplySimulationCase = {
  style: string
  message: string
  event?: "message" | "correction"
  initialReply: string
  correction: string
  reason: SmsCorrectionReason
  teach: boolean
  nextMessage: string
  expectedIntent: SmsReplyIntent
  expectedLanguage: "en" | "es" | "he"
  expectedBehavior: string
}

export const smsReply10StyleCases: SmsReplySimulationCase[] = [
  {
    style: "terse",
    message: "20 drywall sheets",
    initialReply: "I have the material request. What size do you need?",
    correction: "Got it—20 drywall sheets. What size?",
    reason: "too_long",
    teach: true,
    nextMessage: "30 drywall sheets",
    expectedIntent: "material_request",
    expectedLanguage: "en",
    expectedBehavior: "retrieves the concise material clarification",
  },
  {
    style: "conversational multi-turn",
    message: "Yeah, make that 20 drywall sheets for the job",
    initialReply: "Thank you for confirming. Please tell me the required dimensions and thickness.",
    correction: "Got it—20 sheets. What size?",
    reason: "tone",
    teach: true,
    nextMessage: "Actually make that 25 drywall sheets for the job",
    expectedIntent: "material_request",
    expectedLanguage: "en",
    expectedBehavior: "retrieves the manager's natural follow-on wording",
  },
  {
    style: "typo-heavy",
    message: "need 40 shets drywal whats pric",
    initialReply: "Please send the exact material or model.",
    correction: "Got it—40 drywall sheets. What size?",
    reason: "wrong_or_missing_fact",
    teach: true,
    nextMessage: "need 60 shets drywal pric",
    expectedIntent: "pricing",
    expectedLanguage: "en",
    expectedBehavior: "keeps typo-heavy price requests in the pricing playbook",
  },
  {
    style: "long material list",
    message: "50 drywall sheets\n20 metal studs\n10 tracks\n6 compound buckets\n8 screw boxes",
    initialReply: "I received the list. Would you also like corner bead? What ZIP code?",
    correction: "I have the full list. What is the full delivery address?",
    reason: "repeated_question",
    teach: true,
    nextMessage: "60 drywall sheets\n24 metal studs\n12 tracks\n8 compound buckets\n10 screw boxes",
    expectedIntent: "material_request",
    expectedLanguage: "en",
    expectedBehavior: "asks address first and keeps questions concise",
  },
  {
    style: "image request",
    message: "Can I send a photo of the material?",
    initialReply: "Please upload the image and describe every item.",
    correction: "Yes—send the photo here and I'll review what is visible.",
    reason: "tone",
    teach: true,
    nextMessage: "Can I send a plan image instead?",
    expectedIntent: "image_or_plan",
    expectedLanguage: "en",
    expectedBehavior: "retrieves the concise image invitation without claiming an attachment",
  },
  {
    style: "correction",
    message: "Correction: not 50 sheets, make it 30",
    event: "correction",
    initialReply: "Done, I changed the order to 30 sheets.",
    correction: "Got it—a manager will review the change to 30 sheets.",
    reason: "safety_or_commitment",
    teach: false,
    nextMessage: "Correction: make that 35 sheets",
    expectedIntent: "correction",
    expectedLanguage: "en",
    expectedBehavior: "blocks auto-send and does not learn transaction-specific facts",
  },
  {
    style: "exact-list-only",
    message: "Exact list only: 20 drywall sheets. No extras.",
    initialReply: "Got it—I'll keep the request exactly to your list. What is the full delivery address?",
    correction: "Exact list noted. What is the full delivery address?",
    reason: "too_long",
    teach: true,
    nextMessage: "Only what I wrote: 30 drywall sheets, nothing else",
    expectedIntent: "material_request",
    expectedLanguage: "en",
    expectedBehavior: "suppresses accessories and requests the full address first",
  },
  {
    style: "Hebrew",
    message: "צריך 20 לוחות גבס",
    initialReply: "קיבלתי. נא לשלוח פרטים נוספים על המוצר והכמות.",
    correction: "קיבלתי—20 לוחות גבס. איזה גודל?",
    reason: "tone",
    teach: true,
    nextMessage: "צריך 30 לוחות גבס",
    expectedIntent: "material_request",
    expectedLanguage: "he",
    expectedBehavior: "retrieves a Hebrew material clarification",
  },
  {
    style: "Spanish",
    message: "Necesito entrega de 20 paneles",
    initialReply: "Gracias. ¿Cuál es su código postal y cuándo lo necesita?",
    correction: "Recibí los 20 paneles. ¿Cuál es la dirección completa de entrega?",
    reason: "repeated_question",
    teach: true,
    nextMessage: "Necesito entrega de 30 paneles",
    expectedIntent: "delivery",
    expectedLanguage: "es",
    expectedBehavior: "retrieves concise Spanish address-first wording",
  },
  {
    style: "price/order follow-up",
    message: "Any update on the price for my order?",
    initialReply: "What quantity do you need?",
    correction: "Thanks for following up. A manager will check the order and reply here.",
    reason: "wrong_or_missing_fact",
    teach: true,
    nextMessage: "Any news on the quote for my order?",
    expectedIntent: "follow_up",
    expectedLanguage: "en",
    expectedBehavior: "treats price/order status as a follow-up without inventing status",
  },
]
