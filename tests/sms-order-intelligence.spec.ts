import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { smsMaterialIntelligenceAssessment, smsMessagesAfterConfirmedRequest, smsReferencesPriorAttachment } from "../supabase/functions/_shared/sms-reply-policy"

const root = process.cwd()

test("material intelligence schema is private, reviewable, and blocks incomplete confirmations", async () => {
  const migration = await readFile(path.join(root, "supabase/migrations/20260830201920_material_order_intelligence.sql"), "utf8")

  expect(migration).toContain("create table if not exists public.aura_material_intelligence_rules")
  expect(migration).toContain("create table if not exists public.aura_material_intelligence_evaluations")
  expect(migration).toContain("create table if not exists public.aura_material_knowledge_sources")
  expect(migration).toContain("create table if not exists public.aura_material_order_patterns")
  expect(migration).toContain("create table if not exists public.aura_material_learning_candidates")
  expect(migration).toContain("revoke all on table public.aura_material_intelligence_rules from public, anon, authenticated")
  expect(migration).toContain("using ((select private.is_admin_or_staff()))")
  expect(migration).toContain("intelligence_ready boolean not null default false")
  expect(migration).toContain("Hard gate: a customer confirmation can create a request only when all critical material details passed intelligence review")
  expect(migration).toContain("https://www.usg.com/en-US/p/product/sheetrock-brand-firecode-x-panels-142220")
  expect(migration).toContain("https://www.schluter.com/schluter-us/en_US/thin-set-mortar")
  expect(migration).toContain("https://www.owenscorning.com/en-us/insulation/products")
  expect(migration).toContain("https://www.gaf.com/en-us/roofing-materials/residential-roofing-materials/shingles")
})

test("confirmed orders build frequency memory while corrections stay pending for owner review", async () => {
  const broker = await readFile(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8")

  expect(broker).toContain("insert into public.aura_material_order_patterns")
  expect(broker).toContain("confirmation_count = public.aura_material_order_patterns.confirmation_count + 1")
  expect(broker).toContain("insert into public.aura_material_learning_candidates")
  expect(broker).toContain("'customer_correction'")
  expect(broker).toContain("on conflict (communication_id) do nothing")
})

test("three complete request replays cannot skip critical product questions", () => {
  const replays = [
    {
      transcript: "Customer: I need 50 Sheet Rock\nCustomer: tomorrow\nCustomer: 49 Columbia Ave, Cedarhurst, NY 11516",
      expected: /5\/8-in\. regular Sheetrock/,
    },
    {
      transcript: "Customer: Need 20 bags thinset\nCustomer: tomorrow\nCustomer: 49 Columbia Ave, Cedarhurst, NY 11516",
      expected: /tile type and size/,
    },
    {
      transcript: "Customer: Need a dumpster\nCustomer: tomorrow\nCustomer: 49 Columbia Ave, Cedarhurst, NY 11516",
      expected: /dumpster size/,
    },
  ]

  for (const replay of replays) {
    const assessment = smsMaterialIntelligenceAssessment(replay.transcript)
    expect(assessment.readyForConfirmation, replay.transcript).toBe(false)
    expect(assessment.questions.join(" "), replay.transcript).toMatch(replay.expected)
  }
})

test("completed request details cannot satisfy a new request", () => {
  const messages = [
    { occurred_at: "2026-08-30T12:00:00.000Z", body: "50 sheets 5/8 regular Sheetrock" },
    { occurred_at: "2026-08-30T12:01:00.000Z", body: "49 Columbia Ave, Cedarhurst, NY 11516" },
    { occurred_at: "2026-08-30T12:02:00.000Z", body: "Tomorrow" },
    { occurred_at: "2026-08-30T12:10:00.000Z", body: "I need 50 Sheet Rock" },
  ]

  const active = smsMessagesAfterConfirmedRequest(messages, "2026-08-30T12:05:00.000Z")
  expect(active).toEqual([{ occurred_at: "2026-08-30T12:10:00.000Z", body: "I need 50 Sheet Rock" }])
  expect(smsMaterialIntelligenceAssessment(active.map((message) => message.body).join("\n"))).toMatchObject({
    readyForConfirmation: false,
    matchedRules: ["drywall-sheet"],
  })
})

test("common trade shorthand for lumber and drywall screws remains fast", () => {
  expect(smsMaterialIntelligenceAssessment("50 pcs 2x4x8")).toMatchObject({
    matchedRules: ["dimensional-lumber"],
    questions: [],
    readyForConfirmation: true,
  })
  expect(smsMaterialIntelligenceAssessment('1000 pc drywall screws 1-1/4"')).toMatchObject({
    matchedRules: ["drywall-fastener"],
    questions: [],
    readyForConfirmation: true,
  })
})

test("an exact branded thinset skips generic application questions and asks only true material choices", () => {
  const assessment = smsMaterialIntelligenceAssessment(
    "5 yards sand\n45 Portland cement\n50 MAPEI Ultraflex 1 thinset",
  )

  expect(assessment.questions).toEqual([
    "Which sand do you need: mason sand, concrete sand, or fill sand?",
    "Can we use standard 94-lb Type I/II Portland cement bags?",
  ])
  expect(assessment.questions.join(" ")).not.toMatch(/tile type|substrate|installation location/i)
})

test("trade intake never treats one product quantity as every product quantity", () => {
  const assessment = smsMaterialIntelligenceAssessment(
    "50 sheets 5/8 regular Sheetrock and thinset for 12x24 porcelain on a concrete floor",
  )

  expect(assessment.readyForConfirmation).toBe(false)
  expect(assessment.questions).toContain("How many bags of thinset do you need?")
})

test("Sheetrock, paint, and corner bead require their own quantities", () => {
  const incomplete = [
    ["5/8 regular Sheetrock", /How many sheets of Sheetrock/],
    ["Sherwin Williams OC-13 eggshell paint", /How many gallons or cans of paint/],
    ["metal corner bead 10 ft", /How many pieces of corner bead/],
  ] as const

  for (const [message, expectedQuestion] of incomplete) {
    const assessment = smsMaterialIntelligenceAssessment(message)
    expect(assessment.readyForConfirmation, message).toBe(false)
    expect(assessment.questions.join(" "), message).toMatch(expectedQuestion)
  }
})

test("common product codes and word order do not create repeated questions", () => {
  expect(smsMaterialIntelligenceAssessment("2 doors 3068 interior slab")).toMatchObject({
    matchedRules: ["door"],
    questions: [],
    readyForConfirmation: true,
  })
  expect(smsMaterialIntelligenceAssessment("4 windows 3050 double-hung")).toMatchObject({
    matchedRules: ["window"],
    questions: [],
    readyForConfirmation: true,
  })
  expect(smsMaterialIntelligenceAssessment("5 gal Sherwin Williams OC-13 eggshell paint")).toMatchObject({
    matchedRules: ["paint"],
    questions: [],
    readyForConfirmation: true,
  })
})

test("common Sheetrock misspellings still use the Sheetrock rule", () => {
  expect(smsMaterialIntelligenceAssessment("50 sheets 5/8 regular sheetrok")).toMatchObject({
    matchedRules: ["drywall-sheet"],
    questions: [],
    readyForConfirmation: true,
  })
})

test("six complete contractor-style requests pass without unnecessary questions", () => {
  const completeRequests = [
    "50 pc 3-5/8 in x 10 ft 20ga metal studs",
    "20 bags thinset for 12x24 porcelain tile on a concrete floor",
    "500 sq ft architectural shingles charcoal",
    "10 packs R-13 fiberglass batts 15 in",
    "30 sheets 7/16 4x8 OSB",
    "1 20 yard dumpster for mixed construction debris for 7 days",
  ]

  for (const message of completeRequests) {
    expect(smsMaterialIntelligenceAssessment(message), message).toMatchObject({
      questions: [],
      readyForConfirmation: true,
    })
  }
})

test("a question about the previous product image reuses vision instead of asking quantity", async () => {
  const broker = await readFile(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8")
  const references = [
    "What is this do you know can you confirm?",
    "Can you identify it?",
    "Is this the right product?",
    "מה זה, אתה יכול לאשר?",
    "¿Qué es esto?",
  ]

  for (const message of references) expect(smsReferencesPriorAttachment(message), message).toBe(true)
  expect(broker).toContain("recentImageMedia: activeOrdered")
  expect(broker).toContain("smsReferencesPriorAttachment(effectiveBody)")
  expect(broker).toMatch(/settings,\s+analysisMedia,\s+customerEvent/)
})
