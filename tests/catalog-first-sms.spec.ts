import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { evaluateSmsReplyGate } from "../supabase/functions/_shared/sms-reply-policy"

const root = process.cwd()

test("SMS grounding gives the reviewed Avantia catalog priority over construction knowledge", async () => {
  const broker = await readFile(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8")

  const grounding = broker.slice(
    broker.indexOf("function groundingContextText"),
    broker.indexOf("function hasForbiddenAutoReplyTopic"),
  )

  expect(grounding).toContain("Catalog match")
  expect(grounding).toContain("Fact")
  expect(grounding).toMatch(/\[\.\.\.products,\s+\.\.\.facts\]/)
})

test("SMS catalog evidence includes reviewed products, prefers recent verified supplier evidence, and never claims live price or stock", async () => {
  const broker = await readFile(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8")

  expect(broker).toContain("item.review_status = 'ready'")
  expect(broker).toContain("candidate.verification_status in ('verified_today', 'recently_verified', 'supplier_quote')")
  expect(broker).toContain("current_date - interval '60 days'")
  expect(broker).toContain("left join lateral")
  expect(broker).toContain("item.name ilike any(${patterns}::text[])")
  expect(broker).toMatch(
    /\/\\b\(\?:sheet\\s\*rock\|sheetroc\+k\?\|sheetrok\|sherlock\|drywall\)\\b\/i,\s+\["sheetrock", "drywall"\]/,
  )
  expect(broker).toContain("This match does not confirm current price or live stock")
  expect(broker).toContain("Exact price, availability, and delivery still require manager confirmation")

  for (const [reply, intent] of [
    ["The price is $18.95 per sheet.", "pricing"],
    ["We have it in stock.", "availability"],
    ["Available now.", "availability"],
  ] as const) {
    expect(evaluateSmsReplyGate({
      message: "Do you carry 5/8 Sheetrock?",
      reply,
      intent,
      event: "message",
      participantRole: "lead",
      modelAutoSafe: true,
    }), reply).toMatchObject({ level: "red", gateAutoSafe: false })
  }
})
