import { expect, test } from "@playwright/test"
import { requestWorkflowState, type RequestWorkflowStateInput } from "../lib/request-workflow-state"
import { REQUEST_GUIDE_STEPS, requestWorkflowGuidance } from "../lib/request-workflow-guidance"

const base: RequestWorkflowStateInput = { routeSupplierCount: 0, supplierRequestCount: 0, supplierQuoteCount: 0, winningSupplierSelected: false, estimateSent: false, clientApproved: false, invoiceSent: false, paymentLinkSent: false, paymentReceived: false, receiptSent: false, deliveryScheduled: false }
const guide = (changes: Partial<RequestWorkflowStateInput> = {}, blocker: string | null = null, organizationStatus = "organized") => requestWorkflowGuidance({ workflow: requestWorkflowState({ ...base, ...changes }), step1Blocker: blocker, organizationStatus, closed: false })

test("all requests share exactly three reachable stages", () => {
  expect(REQUEST_GUIDE_STEPS.map(step => step.id)).toEqual(["request-items-heading", "request-supplier-quotes", "request-client-delivery"])
})
test("unresolved list takes priority over later pricing evidence", () => {
  expect(guide({ winningSupplierSelected: true }, "Review 2 materials.")).toMatchObject({ step: 1, text: "Review 2 materials." })
  for (const status of ["queued", "processing", "retrying"]) expect(guide({}, "Pending", status)).toMatchObject({ step: 1, waiting: true })
  expect(guide({}, "Pending", "failed").text).toContain("retry")
})
test("supplier handoff distinguishes sending and waiting", () => {
  expect(guide({ routeSupplierCount: 2 }).text).toContain("review and send")
  expect(guide({ routeSupplierCount: 2, supplierRequestCount: 1 })).toMatchObject({ step: 2, waiting: true })
  expect(guide({ supplierQuoteCount: 2 }).text).toContain("per product")
  expect(guide({ supplierQuoteCount: 2 }).text).toContain("final supplier route")
  expect(guide({ supplierQuoteCount: 2 }).text).not.toContain("save your selection")
})
test("client guidance follows saved proof from estimate to arranged delivery", () => {
  const pricing = { winningSupplierSelected: true }
  expect(guide(pricing).text).toContain("estimate")
  expect(guide({ ...pricing, estimateSent: true })).toMatchObject({ step: 3, waiting: true })
  expect(guide({ ...pricing, estimateSent: true, clientApproved: true }).text).toContain("invoice")
  expect(guide({ ...pricing, paymentReceived: true }).text).toContain("receipt")
  expect(guide({ ...pricing, paymentReceived: true, receiptSent: true }).text).toContain("delivery date")
  expect(guide({ ...pricing, paymentReceived: true, receiptSent: true, deliveryScheduled: true }).text).toContain("not confirmed delivered")
})
test("closed request does not invent delivery proof", () => {
  const result = requestWorkflowGuidance({ workflow: requestWorkflowState(base), step1Blocker: null, organizationStatus: "", closed: true })
  expect(result.text).toContain("closed")
  expect(result.text).not.toContain("delivered")
})
