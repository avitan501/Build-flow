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

  for (const source of [requestStatus, workflowManager]) {
    expect(source).toContain("Payment Received · Waiting for Supplier Delivery")
    expect(source).toContain("Request Completed")
  }
  expect(workflowManager).toContain('<option value="closed">Request Completed</option>')
  expect(workflowActions).toContain('quoted: "Payment received; waiting for supplier delivery"')
})
