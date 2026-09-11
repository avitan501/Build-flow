import { readFile } from "node:fs/promises"
import { expect, test } from "@playwright/test"

test("completion validates current saved evidence before writing an event", async () => {
  const source = await readFile("app/owner/materials/requests/actions.ts", "utf8")
  const action = source.slice(source.indexOf("export async function updateRequestWorkflowStepAction"), source.indexOf("export async function updateRequestWorkflowSubstepAction"))
  const write = action.indexOf('from("project_events").insert')
  expect(write).toBeGreaterThan(0)
  for (const guard of ["requireStaffProfile", "requestStep1CompletionError", "requestStep2CompletionError", '.eq("request_id", requestId)', '.eq("status", "awarded")', '.eq("comparison_id", comparison.id)']) {
    expect(action.indexOf(guard)).toBeGreaterThan(-1)
    expect(action.indexOf(guard)).toBeLessThan(write)
  }
})

test("visible status is separate from tools and failed saves do not mark completion", async () => {
  const source = await readFile("components/buildflow/request-workflow-step-toggle.tsx", "utf8")
  expect(source).toContain("aria-pressed={isComplete}")
  expect(source).toContain('role="alert"')
  expect(source).toContain("if (!result.ok) { setError(result.error); return }")
  expect(source.indexOf("setIsComplete(nextComplete)")).toBeGreaterThan(source.indexOf("if (!result.ok)"))
  expect(source).toContain("catch")
  expect(source).not.toContain("Mark done")
  expect(source).toContain('window.confirm(`Reopen Step ${step}?`)')
  const menu = source.slice(source.indexOf('role="dialog"'))
  expect(menu).not.toContain("toggleComplete")
})

test("both headers expose status and page derives completion from current evidence", async () => {
  const [worktable, header, page] = await Promise.all([
    readFile("components/buildflow/request-material-worktable.tsx", "utf8"),
    readFile("components/buildflow/request-workflow-step-header.tsx", "utf8"),
    readFile("app/owner/materials/requests/[requestId]/page.tsx", "utf8"),
  ])
  expect(worktable).toContain("RequestWorkflowStatusButton")
  expect(header).toContain("RequestWorkflowStepToggle")
  expect(page).toContain("requestStep1CompletionError(items ?? [])")
  expect(page).toContain("selectedPricingReady ? workflowOverrides.get(2) ?? null : false")
})
