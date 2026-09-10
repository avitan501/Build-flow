import { readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

import {
  REQUEST_WORKFLOW_SUBSTEPS,
  requestWorkflowSubstep,
  requestWorkflowSubstepLabel,
  requestWorkflowSubsteps,
} from "@/lib/request-workflow-substeps"

const root = process.cwd()
const requestPagePath = path.join(root, "app/owner/materials/requests/[requestId]/page.tsx")
const requestActionsPath = path.join(root, "app/owner/materials/requests/actions.ts")
const worktablePath = path.join(root, "components/buildflow/request-material-worktable.tsx")
const managementPanelPath = path.join(root, "components/buildflow/request-management-panel.tsx")
const substepFunnelPath = path.join(root, "components/buildflow/request-substep-funnel.tsx")
const stepHeaderPath = path.join(root, "components/buildflow/request-workflow-step-header.tsx")
const stepTogglePath = path.join(root, "components/buildflow/request-workflow-step-toggle.tsx")
const buildMapPath = path.join(root, "app/admin/build-map/page.tsx")

test("the three request steps expose a complete, ordered sub-funnel", () => {
  expect(requestWorkflowSubsteps(1).map((substep) => substep.id)).toEqual([
    "request-received",
    "ai-organized",
    "supplier-route",
  ])
  expect(requestWorkflowSubsteps(2).map((substep) => substep.id)).toEqual([
    "suppliers-chosen",
    "requests-sent",
    "quotes-received",
    "route-selected",
  ])
  expect(requestWorkflowSubsteps(3).map((substep) => substep.id)).toEqual([
    "estimate",
    "client-approval",
    "invoice",
    "payment",
    "delivery",
  ])
  expect(new Set(REQUEST_WORKFLOW_SUBSTEPS.map((substep) => substep.id)).size).toBe(REQUEST_WORKFLOW_SUBSTEPS.length)
  expect(requestWorkflowSubstep("quotes-received")?.pipelineStage).toBe("pricing")
  expect(requestWorkflowSubstepLabel("client-approval")).toBe("Approval")
  expect(requestWorkflowSubstep("not-an-allowed-status")).toBeNull()
})

test("one tap updates or reopens the selected substep and refreshes the request", async () => {
  const funnel = await readFile(substepFunnelPath, "utf8")

  expect(funnel).toContain("requestWorkflowSubsteps(step)")
  expect(funnel).toContain("selectedGlobalIndex")
  expect(funnel).toContain("globalIndex < selectedGlobalIndex")
  expect(funnel).toContain("const reopen = selectedGlobalIndex >= 0 && substepIndex < selectedGlobalIndex")
  expect(funnel).toContain("useOptimistic(currentSubstep)")
  expect(funnel).toContain("updateRequestSubstepAction({ requestId, substep: substep.id, reopen })")
  expect(funnel).toContain("Reopen from ${substep.label}")
  expect(funnel).toContain("Existing work is kept")
  expect(funnel).toContain("router.refresh()")
  expect(funnel).toContain('aria-label={`Step ${step} progress`}')
  expect(funnel).toContain("aria-pressed={active}")
  expect(funnel).toContain("update workflow status only; no message is sent")
  expect(funnel).toContain('role="alert"')
})

test("substep changes are allowlisted, logged, rollback-safe, and cannot send a message", async () => {
  const actions = await readFile(requestActionsPath, "utf8")
  const actionStart = actions.indexOf("export async function updateRequestSubstepAction")
  const actionEnd = actions.indexOf("async function prepareRequestClientQuote", actionStart)
  const action = actions.slice(actionStart, actionEnd)

  expect(actionStart).toBeGreaterThan(-1)
  expect(actionEnd).toBeGreaterThan(actionStart)
  expect(action).toContain("requestWorkflowSubstep(input.substep)")
  expect(action).toContain('requireStaffProfile("customers")')
  expect(action).toContain("Math.max(currentIndex, minimumIndex)")
  expect(action).toContain('.from("project_events").insert')
  expect(action).toContain('manager_action: "request_substep_status"')
  expect(action).toContain("request_substep: substep.id")
  expect(action).toContain("workflow_step: substep.step")
  expect(action).toContain("pipeline_stage: substep.pipelineStage")
  expect(action).toContain("previous_status: request.status")
  expect(action).toContain("request_status: nextStatus")
  expect(action).toContain("actor_user_id: user.id")
  expect(action).toContain("workflow_reopened: reopen")
  expect(action).toContain("reopeningNow || previousWorkflowResult.data?.metadata?.workflow_reopened === true")
  expect(action).toContain('manager_action: "request_substep_status"')
  expect(action).toContain("Existing quotes, documents, and history were kept")
  expect(action).toContain("historyError")
  expect(action).toContain("status: request.status, submitted_at: request.submitted_at")
  expect(action).toContain("Internal workflow status only; no customer or supplier message was sent.")
  expect(action).not.toContain('.from("communications")')
  expect(action).not.toContain("functions.invoke")
  expect(action).not.toMatch(/send(?:Sms|SMS|WhatsApp|Email|Message)\s*\(/)
})

test("the compact header has one internal row and one owner-request row", async () => {
  const page = await readFile(requestPagePath, "utf8")
  const headerStart = page.indexOf('<header className="rounded-lg')
  const headerEnd = page.indexOf("</header>", headerStart)
  const header = page.slice(headerStart, headerEnd)
  const internalRow = header.indexOf('data-testid="request-header-internal-row"')
  const ownerRow = header.indexOf('data-testid="request-header-owner-row"')

  expect(headerStart).toBeGreaterThan(-1)
  expect(headerEnd).toBeGreaterThan(headerStart)
  expect(internalRow).toBeGreaterThan(-1)
  expect(ownerRow).toBeGreaterThan(internalRow)
  expect(header).toContain("profile?.company_name || projectLabel")
  expect(header).toContain("MaterialRequestAssigneeControl")
  expect(header).toContain("CustomerRequestStatus")
  expect(header).toContain('request.status === "closed" ? "Completed"')
  expect(header).toContain("requestWorkflowSubstepLabel(currentSubstep)")
  expect(header).toContain("#{request.public_number}")
  expect(header).toContain('<RequestClientContact />')
  expect(header).toContain('kind="client"')
  expect(header).toContain('kind="request"')
})

test("each workflow step has one compact Tools menu and its own sub-funnel", async () => {
  const [worktable, panel, stepHeader, stepToggle] = await Promise.all([
    readFile(worktablePath, "utf8"),
    readFile(managementPanelPath, "utf8"),
    readFile(stepHeaderPath, "utf8"),
    readFile(stepTogglePath, "utf8"),
  ])

  expect(worktable).toContain('aria-label="Request tools"')
  expect(worktable).toContain("OriginalRequestItemEditor")
  expect(worktable).toContain("OrganizeMaterialListButton")
  expect(worktable).toContain("RequestAttachmentUploader")
  expect(worktable).toContain("<RequestSubstepFunnel requestId={requestId} step={1} currentSubstep={currentSubstep} />")

  const step2Start = panel.indexOf('<RequestWorkflowStepHeader requestId={requestId} step={2}')
  const step3Start = panel.indexOf('<RequestWorkflowStepHeader requestId={requestId} step={3}')
  const step2 = panel.slice(step2Start, step3Start)
  const step3 = panel.slice(step3Start)
  expect(step2Start).toBeGreaterThan(-1)
  expect(step3Start).toBeGreaterThan(step2Start)
  for (const label of ["Manage supplier route", "Upload supplier quote", "Enter pricing manually", "Open supplier comparison", "Create direct estimate"]) {
    expect(step2).toContain(label)
  }
  for (const label of ["Contact client", "Estimate", "Invoice", "Receipt", "Payment link", "Delivery schedule"]) {
    expect(step3).toContain(label)
  }
  expect(step2).toContain("<RequestSubstepFunnel requestId={requestId} step={2} currentSubstep={currentSubstep} />")
  expect(step3).toContain("<RequestSubstepFunnel requestId={requestId} step={3} currentSubstep={currentSubstep} />")

  expect(stepHeader).toContain("tools?: ReactNode")
  expect(stepHeader).toContain("min-w-0 w-full overflow-visible")
  expect(stepHeader).toContain("allowManualCompletion || tools")
  const stepSummary = stepHeader.slice(stepHeader.indexOf("<summary"), stepHeader.indexOf("</summary>"))
  expect(stepSummary).toContain("RequestWorkflowStepToggle")
  expect(stepToggle).toContain('aria-label={`Step ${step} tools`}')
  expect(stepToggle).toContain("event.stopPropagation()")
  expect(stepToggle).toContain("{children}")
  expect(stepToggle).toContain("allowManualCompletion ?")
})

test("saved substeps update the top status while verified workflow evidence can advance it", async () => {
  const [page, buildMap] = await Promise.all([
    readFile(requestPagePath, "utf8"),
    readFile(buildMapPath, "utf8"),
  ])

  expect(page).toContain('["request_pipeline_stage", "request_substep_status"]')
  expect(page).toContain('event.metadata?.manager_action === "request_substep_status"')
  expect(page).toContain("const inferredSubstep: RequestWorkflowSubstepId")
  expect(page).toContain("Math.max(savedSubstepIndex, inferredSubstepIndex)")
  expect(page).toContain("currentSubstep={currentSubstep}")
  expect(page).toContain('request.status === "closed" ? "Completed"')
  expect(page).toContain("requestWorkflowSubstepLabel(currentSubstep)")
  expect(buildMap).toContain('["request_pipeline_stage", "request_substep_status"]')
  expect(page).toContain("reopenedSubstepIsCurrent")
  expect(page).toContain("workflow_reopened === true")
  expect(buildMap).toContain("latestStageAllowsRegression")
})
