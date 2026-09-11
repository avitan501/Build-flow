import type { RequestWorkflowState } from "./request-workflow-state"

export const REQUEST_GUIDE_STEPS = [
  { id: "request-items-heading", label: "Items", description: "Review the list, then choose suppliers by group or item." },
  { id: "request-supplier-quotes", label: "Supplier quotes", description: "Request prices, add replies, then compare and select." },
  { id: "request-client-delivery", label: "Client & delivery", description: "Estimate → approval → payment → receipt → schedule delivery." },
] as const

const actionCopy = {
  "choose-suppliers": "Choose suppliers for the items.",
  "contact-suppliers": "Prepare the supplier request, then review and send.",
  "add-supplier-quote": "Waiting for prices · add a supplier reply when it arrives.",
  "review-quote": "Review the supplier prices and product matches.",
  "compare-quotes": "Compare prices per product, then choose the final supplier route.",
  "send-estimate": "Review the client estimate, then send it for approval.",
  "wait-for-approval": "Waiting for the client · record approval only after confirmation.",
  "create-invoice": "Client approved · review and send the invoice.",
  "send-payment-link": "Send the client a payment link.",
  "mark-paid": "Waiting for payment · record it only after funds arrive.",
  "create-receipt": "Payment recorded · create and send the receipt.",
  "schedule-delivery": "Arrange the delivery date with the client.",
  complete: "Payment recorded · delivery scheduled, not confirmed delivered.",
} as const

export function requestWorkflowGuidance(input: {
  step1Blocker: string | null
  organizationStatus: string
  workflow: RequestWorkflowState
  closed: boolean
}) {
  if (input.closed) return { step: 3, text: "Request closed · open a step to review its records.", waiting: false } as const
  if (input.step1Blocker) {
    const status = input.organizationStatus
    const waiting = ["queued", "processing", "retrying"].includes(status)
    const text = waiting ? "Splitting the list automatically · no action needed yet."
      : status === "failed" ? "The list could not be split · retry in Items."
      : input.step1Blocker
    return { step: 1, text, waiting } as const
  }
  const step = input.workflow.step2Complete ? 3 : 2
  const action = step === 2 ? input.workflow.step2Action : input.workflow.step3Action
  return { step, text: actionCopy[action], waiting: ["add-supplier-quote", "wait-for-approval", "mark-paid"].includes(action) } as const
}
