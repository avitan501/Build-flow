import { expect, test } from "@playwright/test"
import { smsContextualQuantityAnswerReply } from "../supabase/functions/_shared/sms-reply-policy"

test("1,000 multi-turn quantity answers advance the order instead of repeating the question", () => {
  const scenarios = [
    { question: "Avantia: How many sheets of Sheetrock do you need?", unit: "sheets" },
    { question: "Avantia: How many bags of thinset do you need?", unit: "bags" },
    { question: "Avantia: How many metal studs do you need?", unit: "pcs" },
    { question: "Avantia: How many square feet of roofing shingles do you need?", unit: "sq ft" },
    { question: "Avantia: How many gallons of paint do you need?", unit: "gallons" },
  ]
  let checked = 0

  for (const scenario of scenarios) {
    for (let quantity = 1; quantity <= 20; quantity += 1) {
      const singularUnit = scenario.unit === "sheets" ? "sheet"
        : scenario.unit === "bags" ? "bag"
          : scenario.unit === "gallons" ? "gallon"
            : scenario.unit
      const answers = [
        `${quantity}`,
        `${quantity}.`,
        `${quantity}!`,
        `about ${quantity}`,
        `around ${quantity}`,
        `approximately ${quantity}`,
        `I need ${quantity}`,
        `I need about ${quantity}`,
        `${quantity} ${scenario.unit}`,
        `${quantity} ${singularUnit}`,
      ]
      for (const answer of answers) {
        const transcript = `Customer: I need ${scenario.question.includes("Sheetrock") ? "Sheetrock" : scenario.question.includes("thinset") ? "thinset" : scenario.question.includes("metal studs") ? "metal studs" : scenario.question.includes("roofing") ? "roofing shingles" : "paint"}.\n${scenario.question}\nCustomer: ${answer}`
        const reply = smsContextualQuantityAnswerReply(answer, transcript)
        expect(reply, `${scenario.question} / ${answer}`).toBeTruthy()
        expect(reply).not.toMatch(/^Sure\s*[—-]\s*how (?:many|much)/i)
        expect(reply).not.toContain(scenario.question.replace(/^Avantia:\s*/, ""))
        checked += 1
      }
    }
  }

  expect(checked).toBe(1000)
})
