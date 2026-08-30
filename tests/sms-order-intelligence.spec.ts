import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { smsMaterialIntelligenceAssessment, smsMessagesAfterConfirmedRequest } from "../supabase/functions/_shared/sms-reply-policy"

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
