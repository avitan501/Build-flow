import { expect, test } from "@playwright/test"

import {
  classifySmsReplyIntent,
  looksLikeSmsMaterialRequest,
  smsHasExplicitQuantity,
  smsMaterialClarificationQuestions,
} from "@/supabase/functions/_shared/sms-reply-policy"

const COMMON_NEW_HOME_ORDERS = [
  "50 pcs 2x4x8 lumber",
  "4 LVL beams",
  "25 squares roofing shingles",
  "30 siding panels",
  "12 windows",
  "40 insulation batts",
  "100 drywall sheets",
  "500 sq ft tile",
  "10 gallons paint",
  "24 interior doors",
  "300 ft base molding",
  "8 yards concrete",
  "500 concrete blocks",
  "200 ft PEX pipe",
  "1000 ft 12/2 electrical cable",
  "1 HVAC air handler",
  "20 kitchen cabinets",
  "6 appliances",
  "1200 sq ft hardwood flooring",
  "1 dumpster, 20 yard container",
] as const

test("twenty common new-home orders are recognized without another quantity question", () => {
  expect(COMMON_NEW_HOME_ORDERS).toHaveLength(20)

  for (const message of COMMON_NEW_HOME_ORDERS) {
    expect(looksLikeSmsMaterialRequest(message), message).toBe(true)
    expect(smsHasExplicitQuantity(message), message).toBe(true)
    expect(classifySmsReplyIntent({ message, participantRole: "lead" }), message).toBe("material_request")
  }
})

test("new-home coverage does not invent code or assembly clarifications", () => {
  const expectedBlockers = new Map<string, string[]>([
    ["25 squares roofing shingles", ["What shingle type and color do you need?"]],
    ["12 windows", ["What window size and operating type do you need?"]],
    ["40 insulation batts", ["What insulation type and R-value do you need?"]],
    ["100 drywall sheets", ["Can we do 5/8-in. regular Sheetrock, or do you need Type X/fire-rated or moisture-resistant?"]],
    ["10 gallons paint", ["What paint color do you need?"]],
    ["24 interior doors", ["What door size and type do you need: interior, exterior, prehung, or slab?"]],
    ["1 dumpster, 20 yard container", ["What material or debris is going into it?"]],
  ])
  for (const message of COMMON_NEW_HOME_ORDERS) {
    expect(smsMaterialClarificationQuestions(message), message).toEqual(
      expectedBlockers.get(message) || [],
    )
  }

  expect(smsMaterialClarificationQuestions("20 drywall 4x8x1/2")).toEqual([
    "Sheetrock thickness: keep 1/2-in., or change to our standard 5/8-in.?",
  ])
  expect(smsMaterialClarificationQuestions("20 drywall 4x8x1/2", { exactListOnly: true })).toEqual([])
})

test("expanded quantity recognition does not treat timing or a question as material quantity", () => {
  for (const message of ["I need delivery in 2 days", "Call me in 10 minutes", "What size windows?", "One more question"]) {
    expect(smsHasExplicitQuantity(message), message).toBe(false)
  }
})
