import { readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

import {
  managerNextPipelineStage,
  managerPipelineStageWithOverride,
  normalizeManagerRequestQueueState,
} from "@/lib/manager-dashboard"

const root = process.cwd()
const pagePath = path.join(root, "app/admin/build-map/page.tsx")
const actionPath = path.join(root, "app/admin/build-map/actions.ts")
const listPath = path.join(root, "components/buildflow/request-quick-actions-list.tsx")

test("request rows use one compact accessible quick-action square on phone and desktop", async () => {
  const [page, list] = await Promise.all([
    readFile(pagePath, "utf8"),
    readFile(listPath, "utf8"),
  ])

  expect(page).toContain("RequestQuickActionsList")
  expect(list).toContain('aria-haspopup="menu"')
  expect(list).toContain('role="menu"')
  expect(list).toContain('role="menuitem"')
  expect(list).toContain("Quick actions for ${row.title}")
  expect(list).toContain("MoreHorizontal")
  expect(list).toContain("h-9 w-9")
  expect(list).toContain("min-h-16")
  expect(list).not.toMatch(/grid-cols-[45][^\n]*quick/i)
  expect(list).not.toContain("Rush Queue Next Archive")
})

test("each request menu assigns David or Carlos and keeps the workflow status read-only", async () => {
  const [page, list, requestActions] = await Promise.all([
    readFile(pagePath, "utf8"),
    readFile(listPath, "utf8"),
    readFile(path.join(root, "app/owner/materials/requests/actions.ts"), "utf8"),
  ])

  expect(page).toContain("manager_assignee")
  expect(page).toContain("metadata->>manager_action.eq.request_substep_status")
  expect(page).toContain("requestWorkflowSubstepLabel")
  expect(list).toContain("Assign to {name}")
  expect(list).toContain('(["david", "carlos"] as const)')
  expect(list).toContain("updateMaterialRequestAssigneeAction")
  expect(list).toContain('role="menuitemradio"')
  expect(list).toContain("aria-checked={selectedAssignee}")
  expect(list).toContain('aria-label={`Status: ${row.stageLabel}`}')
  expect(list).toContain("Request status: ${row.stageLabel}")
  expect(list).toContain("{row.clientLabel}</span>")
  expect(list).not.toContain("{row.clientLabel} · {row.stageLabel}")

  const assignmentStart = requestActions.indexOf("export async function updateMaterialRequestAssigneeAction")
  const assignmentEnd = requestActions.indexOf("export async function updateMaterialRequestTitleAction", assignmentStart)
  const assignmentAction = requestActions.slice(assignmentStart, assignmentEnd)
  expect(assignmentAction).toContain('manager_action: "request_assignee"')
  expect(assignmentAction).toContain("previous_assignee")
  expect(assignmentAction).toContain("request_assignee: assignee")
  expect(assignmentAction).not.toMatch(/send(?:Sms|SMS|WhatsApp|Email|Message)\s*\(/)
})

test("phone swipe reveals the same menu without making request rows taller", async () => {
  const list = await readFile(listPath, "utf8")

  expect(list).toContain("onTouchStart")
  expect(list).toContain("onTouchEnd")
  expect(list).toMatch(/touchStartX\.current\s*-\s*endX\s*>\s*\d+/)
  expect(list).toContain("setOpenMenuId(row.id)")
  expect(list).not.toMatch(/onTouchEnd[\s\S]*?style=\{\{\s*height:/)
})

test("multi-select keeps one compact bulk bar and every action is labelled", async () => {
  const list = await readFile(listPath, "utf8")

  expect(list).toContain('aria-label={multi ? "Exit multi-select" : "Select multiple requests"}')
  expect(list).toContain("toggleSelected")
  expect(list).toContain('aria-label="Bulk request actions"')
  expect(list).toContain("selected.size")
  expect(list).toContain("${action.label} selected requests")
  expect(list).toContain("bottom-[calc(1rem+env(safe-area-inset-bottom))]")
  expect(list).toContain("h-9 w-9")
})

test("quick actions have guarded, auditable state changes and never send communications", async () => {
  const actions = await readFile(actionPath, "utf8")
  const quickActionSource = actions.slice(
    actions.indexOf("export async function applyManagerRequestQuickAction"),
    actions.indexOf("function liveSearchFallback"),
  )

  expect(quickActionSource).toContain("requireManagerPortalProfile")
  expect(quickActionSource).toContain("validRequestIds")
  expect(actions).toContain("REQUEST_QUICK_ACTIONS")
  expect(actions).toContain('REQUEST_QUICK_ACTION_FEATURE = "manager_request_quick_actions"')
  expect(quickActionSource).toContain('.from("project_events").insert')
  expect(quickActionSource).toContain("quote_request_id")
  expect(quickActionSource).toContain("previous_status")
  expect(quickActionSource).toContain("previous_pipeline_stage")
  expect(quickActionSource).toContain("revalidatePath(\"/admin/build-map\")")

  // These controls manage internal request state only. They must never contact a client.
  expect(quickActionSource).not.toMatch(/send(?:Sms|SMS|WhatsApp|Email|Message)/)
  expect(quickActionSource).not.toContain("aura-messaging-broker")
  expect(quickActionSource).not.toContain("communication_outbox")
  expect(quickActionSource).not.toContain("fetch(")
})

test("queue and funnel helpers reject unknown states and only move one step", () => {
  expect(normalizeManagerRequestQueueState("rush")).toBe("rush")
  expect(normalizeManagerRequestQueueState("queued")).toBe("queued")
  expect(normalizeManagerRequestQueueState("anything-else")).toBe("normal")

  expect(managerPipelineStageWithOverride("pricing", "received")).toBe("pricing")
  expect(managerPipelineStageWithOverride("received", "approval")).toBe("approval")
  expect(managerPipelineStageWithOverride("approval", "not-a-stage")).toBe("approval")
  expect(managerNextPipelineStage("received")).toBe("pricing")
  expect(managerNextPipelineStage("pricing")).toBe("approval")
  expect(managerNextPipelineStage("approval")).toBe("delivery")
  expect(managerNextPipelineStage("delivery")).toBeNull()
})
