import { readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

const root = process.cwd()

test("workflow server actions persist approval and authoritative payment proof", async () => {
  const actions = await readFile(path.join(root, "app/owner/materials/requests/actions.ts"), "utf8")
  const approvalStart = actions.indexOf("export async function recordRequestClientApprovalAction")
  const paymentStart = actions.indexOf("export async function recordRequestPaymentReceivedAction")
  const paymentSource = actions.slice(paymentStart)

  expect(approvalStart).toBeGreaterThan(0)
  expect(actions.slice(approvalStart, paymentStart)).toContain('client_action: "client_approved"')
  expect(actions.slice(approvalStart, paymentStart)).toContain('manager_action: "client_approval"')
  expect(paymentSource.indexOf('client_action: "payment_received"')).toBeLessThan(paymentSource.indexOf('update({ status: "quoted" })'))
  expect(paymentSource).not.toContain("update({ status: request.status })")
  expect(paymentSource).toContain("Payment proof was saved, but the request status could not be synchronized")
})

test("receipt events and completion gates require a matching persisted receipt", async () => {
  const [actions, page] = await Promise.all([
    readFile(path.join(root, "app/owner/materials/requests/actions.ts"), "utf8"),
    readFile(path.join(root, "app/owner/materials/requests/[requestId]/page.tsx"), "utf8"),
  ])
  const recordStart = actions.indexOf("export async function recordRequestClientDocumentSentAction")
  const approvalStart = actions.indexOf("export async function recordRequestClientApprovalAction")
  const recordSource = actions.slice(recordStart, approvalStart)

  expect(recordSource).toContain('.eq("document_type", "receipt")')
  expect(recordSource).toContain("Save this receipt before recording that it was sent.")
  expect(recordSource).toContain("document_public_token")
  expect(recordSource).toContain("document_version")
  expect(actions).toContain("hasPersistedReceiptProof(")
  expect(page).toContain("const receiptSent = hasPersistedReceiptProof(")
  expect(page).toContain('event.metadata.client_action === "client_approved"')
  expect(page).toContain("clientApproved,")
})
