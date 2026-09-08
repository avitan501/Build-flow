import { readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

const root = process.cwd()
const requestPagePath = path.join(root, "app/owner/materials/requests/[requestId]/page.tsx")
const worktablePath = path.join(root, "components/buildflow/request-material-worktable.tsx")
const assigneePath = path.join(root, "components/buildflow/material-request-assignee-control.tsx")
const statusPath = path.join(root, "components/buildflow/customer-request-status.tsx")
const activityPath = path.join(root, "components/buildflow/request-activity-log.tsx")
const workflowActionsPath = path.join(root, "app/preview-admin/workflow-actions.ts")

test("request identity, client contact, assignee, and status use two compact header rows", async () => {
  const [page, assignee, status] = await Promise.all([
    readFile(requestPagePath, "utf8"),
    readFile(assigneePath, "utf8"),
    readFile(statusPath, "utf8"),
  ])

  expect(page).toContain('data-testid="request-header-internal-row"')
  expect(page).toContain('data-testid="request-header-owner-row"')
  expect(page).toContain("#{request.public_number}")
  expect(page).toContain('kind="client"')
  expect(page).toContain("<RequestClientContact />")
  expect(page).toContain("compact hideLabel")
  expect(page).toMatch(/<CustomerRequestStatus[^>]*hideLabel/)
  expect(page).not.toContain(">Client</p>")
  expect(assignee).toContain('aria-label="Assigned to"')
  expect(assignee).toContain('hideLabel ? "sr-only"')
  expect(status).toContain('aria-label="Change request status"')
  expect(status).toContain('hideLabel ? "sr-only"')
  expect(status).toContain("h-8 w-full")
})

test("request funnel makes the current and next stages clear in one minimal row", async () => {
  const page = await readFile(requestPagePath, "utf8")

  expect(page).toContain("const requestProgress")
  expect(page).toContain('{ stage: "received", label: "Received" }')
  expect(page).toContain('{ stage: "pricing", label: "Pricing" }')
  expect(page).toContain('{ stage: "approval", label: "Client" }')
  expect(page).toContain('{ stage: "delivery", label: "Delivery" }')
  expect(page).toContain('aria-label="Request progress"')
  expect(page).toContain("grid grid-cols-4")
  expect(page).toContain('aria-current={active ? "step" : undefined}')
  expect(page).toContain("index < currentIndex")
  expect(page).toContain("text-[9px]")
})

test("step one keeps add, documents, and AI organization in one small tools menu", async () => {
  const worktable = await readFile(worktablePath, "utf8")
  const menuStart = worktable.indexOf('<details className="group relative shrink-0">')
  const menuEnd = worktable.indexOf("</details>", menuStart)
  const toolsMenu = worktable.slice(menuStart, menuEnd)

  expect(menuStart).toBeGreaterThan(-1)
  expect(menuEnd).toBeGreaterThan(menuStart)
  expect(worktable).toContain("Step 1 · Request workspace")
  expect(worktable).toContain('aria-label="Request tools"')
  expect(worktable).toContain("h-9 cursor-pointer")
  expect(toolsMenu).toContain("OriginalRequestItemEditor")
  expect(toolsMenu).toContain('mode="add"')
  expect(toolsMenu).toContain("Client request files")
  expect(toolsMenu).toContain("RequestAttachmentUploader")
  expect(toolsMenu).toContain("OrganizeMaterialListButton")
  expect(worktable).not.toContain("Quantity, item details, and only the information still missing.")
})

test("material details stay compact and expand only for the selected item", async () => {
  const worktable = await readFile(worktablePath, "utf8")

  expect(worktable).toContain("expandedItemIds")
  expect(worktable).toContain("toggleExpandedItem")
  expect(worktable).toContain('aria-label={`${expanded ? "Collapse" : "Open"} ${item.name}`}')
  expect(worktable).toContain("requestItemFieldSummary(item.metadata).slice(0, 4)")
  expect(worktable).toContain("Add size, brand, color, shipping, or another field.")
  expect(worktable).toContain("OriginalRequestItemEditor")
})

test("activity history is one collapsed line and opens the complete accessible log dialog", async () => {
  const [page, activity] = await Promise.all([
    readFile(requestPagePath, "utf8"),
    readFile(activityPath, "utf8"),
  ])

  expect(page).toContain("RequestActivityLog")
  expect(page).toContain("events={activityEvents.map")
  expect(page).not.toMatch(/<section className="mt-4[\s\S]*Activity log/)
  expect(activity).toContain('aria-label="Request activity"')
  expect(activity).toContain('aria-haspopup="dialog"')
  expect(activity).toContain("h-11 w-full")
  expect(activity).toContain("truncate")
  expect(activity).toContain("latestEvent?.title")
  expect(activity).toContain("<dialog")
  expect(activity).toContain("aria-labelledby={titleId}")
  expect(activity).toContain("dialogRef.current?.showModal()")
  expect(activity).toContain("events.map((event)")
  expect(activity).toContain("event.description")
  expect(activity).toContain("onClose={() => triggerRef.current?.focus()}")
  expect(activity).toContain('aria-label="Close activity log"')
})

test("every status change is logged or rolled back", async () => {
  const actions = await readFile(workflowActionsPath, "utf8")
  const source = actions.slice(
    actions.indexOf("export async function updateRequestStatusAction"),
    actions.indexOf("export async function saveWorkflowManagerSettingsAction"),
  )

  expect(source).toContain('.from("project_events").insert')
  expect(source).toContain("previous_status: current.status")
  expect(source).toContain("request_status: input.status")
  expect(source).toContain("historyError")
  expect(source).toContain("status: current.status")
  expect(source).toContain("activity log could not be saved")
})
