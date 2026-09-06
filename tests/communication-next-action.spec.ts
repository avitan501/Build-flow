import { expect, test } from "@playwright/test"

import { communicationTemplates, recommendCommunicationAction } from "../lib/aura/communication-next-action"

test("an inbound material list becomes Carlos's next action", () => {
  const result = recommendCommunicationAction({
    name: "Ronen Builder",
    kind: "lead",
    hasMaterialRequest: false,
    messages: [{ direction: "incoming", body: "Need 40 sheets of drywall and 10 studs", occurredAt: "2026-09-06T10:00:00.000Z" }],
    now: new Date("2026-09-06T10:05:00.000Z"),
  })

  expect(result.health).toBe("Waiting on Avantia")
  expect(result.action).toBe("Review material list")
  expect(result.suggestedMessage).toContain("Received, thank you")
})

test("an opt-out never receives a suggested reply", () => {
  const result = recommendCommunicationAction({
    name: "Ronen Builder",
    kind: "customer",
    hasMaterialRequest: true,
    messages: [{ direction: "incoming", body: "STOP", occurredAt: "2026-09-06T10:00:00.000Z" }],
  })

  expect(result.health).toBe("Do Not Contact")
  expect(result.action).toBe("Do not contact")
  expect(result.suggestedMessage).toBe("")
})

test("an unanswered message becomes at risk after three days", () => {
  const result = recommendCommunicationAction({
    name: "Ronen Builder",
    kind: "customer",
    hasMaterialRequest: true,
    messages: [{ direction: "outgoing", body: "Your estimate is ready", occurredAt: "2026-09-01T10:00:00.000Z" }],
    now: new Date("2026-09-06T10:00:00.000Z"),
  })

  expect(result.health).toBe("At Risk")
  expect(result.action).toBe("Follow up")
  expect(result.suggestedMessage).toContain("A) approve")
})

test("customer and supplier templates stay separated", () => {
  const customer = communicationTemplates("David Avitan", "customer")
  const supplier = communicationTemplates("Frank Supply", "supplier")

  expect(customer.find((template) => template.id === "welcome")?.message).toContain("Carlos from Avantia Build")
  expect(supplier.some((template) => template.id === "welcome")).toBe(false)
  expect(supplier.find((template) => template.id === "supplier_quote")?.message).toContain("best price")
})

test("a completed request never receives a stale follow-up", () => {
  const result = recommendCommunicationAction({
    name: "Ronen Builder",
    kind: "customer",
    hasMaterialRequest: true,
    materialRequestStatus: "approved",
    messages: [{ direction: "outgoing", body: "Your estimate is ready", occurredAt: "2026-09-01T10:00:00.000Z" }],
    now: new Date("2026-09-06T10:00:00.000Z"),
  })

  expect(result.health).toBe("Completed")
  expect(result.action).toBe("Wait")
  expect(result.suggestedMessage).toBe("")
})

test("Spanish material messages and opt-outs are understood", () => {
  const material = recommendCommunicationAction({
    name: "Carlos Cliente",
    kind: "lead",
    hasMaterialRequest: false,
    messages: [{ direction: "incoming", body: "Necesito precio para 20 paneles de yeso", occurredAt: "2026-09-06T10:00:00.000Z" }],
  })
  const stopped = recommendCommunicationAction({
    name: "Carlos Cliente",
    kind: "lead",
    hasMaterialRequest: false,
    messages: [{ direction: "incoming", body: "No me escriba", occurredAt: "2026-09-06T10:00:00.000Z" }],
  })

  expect(material.action).toBe("Review material list")
  expect(stopped.health).toBe("Do Not Contact")
})
