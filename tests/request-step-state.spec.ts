import { expect, test } from "@playwright/test"
import { deriveRequestSteps, requestStepAttention } from "@/lib/request-step-state"

const base = { requestId: "test", assignee: "carlos", records: [], eligible: [true, true, true] as [boolean, boolean, boolean], legacyCompleted: [true, true, false] as [boolean, boolean, boolean] }
test("existing requests retain default ownership and progress", () => {
  const steps = deriveRequestSteps(base)
  expect(requestStepAttention(steps)).toMatchObject({ step: 3, assignee: "carlos" })
  expect(steps.map(row => row.completed)).toEqual([true, true, false])
})
test("explicit reopen takes priority and identifies that step owner", () => {
  const steps = deriveRequestSteps({ ...base, records: [{ request_id: "test", step: 1, assignee: "david", note: "Internal", completed_override: false, revision: 2 }] })
  expect(requestStepAttention(steps)).toMatchObject({ step: 1, assignee: "david" })
  expect(steps[0].note).toBe("Internal")
})
test("stale done never overrides missing product or payment proof", () => {
  const steps = deriveRequestSteps({ ...base, eligible: [false, false, false], records: [1, 2, 3].map(step => ({ request_id: "test", step: step as 1 | 2 | 3, assignee: "carlos" as const, note: "", completed_override: true, revision: 1 })) })
  expect(steps.every(row => !row.completed)).toBe(true)
  expect(requestStepAttention(steps).step).toBe(1)
})
test("all complete is distinct from waiting on an employee", () => {
  expect(requestStepAttention(deriveRequestSteps({ ...base, legacyCompleted: [true, true, true] }))).toMatchObject({ label: "All steps done", assignee: null })
})
