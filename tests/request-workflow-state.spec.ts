import { expect, test } from "@playwright/test"

import { hasPersistedReceiptProof, requestWorkflowState, type RequestWorkflowStateInput } from "@/lib/request-workflow-state"

const base: RequestWorkflowStateInput = {
  routeSupplierCount: 0,
  supplierRequestCount: 0,
  supplierQuoteCount: 0,
  winningSupplierSelected: false,
  estimateSent: false,
  clientApproved: false,
  invoiceSent: false,
  paymentLinkSent: false,
  paymentReceived: false,
  receiptSent: false,
  deliveryScheduled: false,
}

test("Step 2 follows suppliers, outreach, quotes, and winner selection", () => {
  expect(requestWorkflowState(base).step2Action).toBe("choose-suppliers")
  expect(requestWorkflowState({ ...base, routeSupplierCount: 2 }).step2Action).toBe("contact-suppliers")
  expect(requestWorkflowState({ ...base, routeSupplierCount: 2, supplierRequestCount: 2 }).step2Action).toBe("add-supplier-quote")
  expect(requestWorkflowState({ ...base, routeSupplierCount: 2, supplierRequestCount: 2, supplierQuoteCount: 1 }).step2Action).toBe("review-quote")
  expect(requestWorkflowState({ ...base, routeSupplierCount: 2, supplierRequestCount: 2, supplierQuoteCount: 2 }).step2Action).toBe("compare-quotes")
  const awarded = requestWorkflowState({ ...base, routeSupplierCount: 2, supplierRequestCount: 2, supplierQuoteCount: 1, winningSupplierSelected: true })
  expect(awarded.step2Complete).toBe(true)
  expect(awarded.step2Action).toBe("send-estimate")
})

test("a returned quote does not complete Step 2 without a winner", () => {
  const state = requestWorkflowState({ ...base, routeSupplierCount: 1, supplierRequestCount: 1, supplierQuoteCount: 1 })
  expect(state.step2Complete).toBe(false)
  expect(state.step2Status).toBe("active")
})

test("an explicit Step 2 completion advances Step 3 even without inferred winner proof", () => {
  const state = requestWorkflowState({ ...base, step2CompletedOverride: true })
  expect(state.step2Complete).toBe(true)
  expect(state.step2Action).toBe("send-estimate")
  expect(state.step3Status).toBe("active")
})

test("Step 3 follows document, payment, receipt, and delivery order", () => {
  expect(requestWorkflowState({ ...base, winningSupplierSelected: true }).step3Action).toBe("send-estimate")
  expect(requestWorkflowState({ ...base, winningSupplierSelected: true, estimateSent: true }).step3Action).toBe("wait-for-approval")
  expect(requestWorkflowState({ ...base, winningSupplierSelected: true, estimateSent: true, clientApproved: true }).step3Action).toBe("create-invoice")
  expect(requestWorkflowState({ ...base, winningSupplierSelected: true, estimateSent: true, clientApproved: true, invoiceSent: true }).step3Action).toBe("send-payment-link")
  expect(requestWorkflowState({ ...base, winningSupplierSelected: true, estimateSent: true, clientApproved: true, invoiceSent: true, paymentLinkSent: true }).step3Action).toBe("mark-paid")
  expect(requestWorkflowState({ ...base, winningSupplierSelected: true, estimateSent: true, clientApproved: true, invoiceSent: true, paymentLinkSent: true, paymentReceived: true }).step3Action).toBe("create-receipt")
  expect(requestWorkflowState({ ...base, winningSupplierSelected: true, estimateSent: true, clientApproved: true, invoiceSent: true, paymentLinkSent: true, paymentReceived: true, receiptSent: true }).step3Action).toBe("schedule-delivery")
})

test("Step 3 cannot be completed without payment, receipt, and delivery proof", () => {
  for (const paymentReceived of [false, true]) {
    for (const receiptSent of [false, true]) {
      for (const deliveryScheduled of [false, true]) {
        const state = requestWorkflowState({ ...base, winningSupplierSelected: true, paymentReceived, receiptSent, deliveryScheduled, step3CompletedOverride: true })
        expect(state.step3Complete).toBe(paymentReceived && receiptSent && deliveryScheduled)
      }
    }
  }
})

test("reopening Step 3 cannot permanently hide later complete proof", () => {
  const state = requestWorkflowState({ ...base, paymentReceived: true, receiptSent: true, deliveryScheduled: true, step3CompletedOverride: false })
  expect(state.step3Complete).toBe(true)
  expect(state.step3Status).toBe("complete")
  expect(state.step3Action).toBe("complete")
})

test("received payment skips backward invoice and payment-link demands", () => {
  const paid = requestWorkflowState({ ...base, paymentReceived: true })
  expect(paid.step3Action).toBe("create-receipt")
  expect(requestWorkflowState({ ...base, paymentReceived: true, receiptSent: true }).step3Action).toBe("schedule-delivery")
})

test("receipt completion requires a matching persisted document and sent event", () => {
  const receipt = { documentNumber: "REC-104", publicToken: "stable-token", version: 3 }
  const currentEvent = { client_action: "receipt_sent", document_number: "REC-104", document_public_token: "stable-token", document_version: 3 }

  expect(hasPersistedReceiptProof([currentEvent], receipt)).toBe(true)
  expect(hasPersistedReceiptProof([currentEvent], null)).toBe(false)
  expect(hasPersistedReceiptProof([{ ...currentEvent, document_number: "REC-OLD" }], receipt)).toBe(false)
  expect(hasPersistedReceiptProof([{ ...currentEvent, document_public_token: "other-token" }], receipt)).toBe(false)
  expect(hasPersistedReceiptProof([{ ...currentEvent, document_version: 2 }], receipt)).toBe(false)
  expect(hasPersistedReceiptProof([{ client_action: "receipt_sent", document_number: "REC-104" }], receipt)).toBe(true)
})
