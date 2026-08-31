import { readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

import {
  quoteRequestProgressIndex,
  quoteRequestStatusLabel,
  QUOTE_REQUEST_PROGRESS_STEPS,
} from "@/lib/quote-requests"

test("paid requests wait for supplier delivery before completion", () => {
  expect(QUOTE_REQUEST_PROGRESS_STEPS).toEqual(["Created", "Review", "Approval", "Supplier Delivery", "Completed"])
  expect(quoteRequestStatusLabel("quoted")).toBe("Payment Received · Waiting for Supplier Delivery")
  expect(quoteRequestProgressIndex("quoted")).toBe(3)
  expect(quoteRequestStatusLabel("closed")).toBe("Completed")
  expect(quoteRequestProgressIndex("closed")).toBe(4)
})

test("manager status controls keep paid delivery and completion separate", async () => {
  const [requestStatus, workflowManager, workflowActions] = await Promise.all([
    readFile(path.join(process.cwd(), "components/buildflow/customer-request-status.tsx"), "utf8"),
    readFile(path.join(process.cwd(), "components/buildflow/project-workflow-manager.tsx"), "utf8"),
    readFile(path.join(process.cwd(), "app/preview-admin/workflow-actions.ts"), "utf8"),
  ])

  expect(requestStatus).toContain('{ status: "quoted", label: "Payment & delivery" }')
  expect(requestStatus).toContain('{ status: "closed", label: "Completed" }')
  expect(requestStatus).toContain('quoted: "Coordinate delivery"')
  expect(requestStatus).toContain('window.confirm("Mark this request completed?')
  expect(workflowManager).toContain("Payment Received · Waiting for Supplier Delivery")
  expect(workflowManager).toContain("Request Completed")
  expect(workflowManager).toContain('<option value="closed">Request Completed</option>')
  expect(workflowActions).toContain('quoted: "Payment received; waiting for supplier delivery"')
  expect(workflowActions).toContain('requireStaffProfile("customers")')
})

test("customer directory does not expose the unrelated pending approval label", async () => {
  const page = await readFile(path.join(process.cwd(), "app/admin/users/page.tsx"), "utf8")

  expect(page).not.toContain("pendingCustomers")
  expect(page).not.toContain("{customer.approval_status}</span>")
})
