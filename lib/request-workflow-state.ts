export type RequestWorkflowStepStatus = "complete" | "active" | "upcoming"

export type RequestWorkflowAction =
  | "choose-suppliers"
  | "contact-suppliers"
  | "add-supplier-quote"
  | "review-quote"
  | "compare-quotes"
  | "send-estimate"
  | "wait-for-approval"
  | "create-invoice"
  | "send-payment-link"
  | "mark-paid"
  | "create-receipt"
  | "schedule-delivery"
  | "complete"

export type RequestWorkflowStateInput = {
  routeSupplierCount: number
  supplierRequestCount: number
  supplierQuoteCount: number
  winningSupplierSelected: boolean
  estimateSent: boolean
  clientApproved: boolean
  invoiceSent: boolean
  paymentLinkSent: boolean
  paymentReceived: boolean
  receiptSent: boolean
  deliveryScheduled: boolean
  step2CompletedOverride?: boolean | null
  step3CompletedOverride?: boolean | null
}

export type RequestWorkflowState = {
  step2Status: RequestWorkflowStepStatus
  step3Status: RequestWorkflowStepStatus
  step2Action: RequestWorkflowAction
  step3Action: RequestWorkflowAction
  step2Complete: boolean
  step3Complete: boolean
}

export type PersistedReceiptDocument = {
  documentNumber: string
  publicToken?: string | null
  version?: number | null
}

function cleanProofText(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

export function hasPersistedReceiptProof(
  eventMetadata: Array<Record<string, unknown> | null | undefined>,
  receiptDocument: PersistedReceiptDocument | null | undefined,
) {
  if (!receiptDocument?.documentNumber.trim()) return false
  const documentNumber = receiptDocument.documentNumber.trim().toUpperCase()
  const publicToken = cleanProofText(receiptDocument.publicToken)
  const version = Number(receiptDocument.version)

  return eventMetadata.some((metadata) => {
    if (metadata?.client_action !== "receipt_sent") return false
    if (cleanProofText(metadata.document_number).toUpperCase() !== documentNumber) return false

    const eventToken = cleanProofText(metadata.document_public_token)
    if (eventToken && (!publicToken || eventToken !== publicToken)) return false

    const eventVersion = Number(metadata.document_version)
    if (Number.isSafeInteger(eventVersion) && eventVersion > 0 && (!Number.isSafeInteger(version) || eventVersion !== version)) return false
    return true
  })
}

export function requestWorkflowState(input: RequestWorkflowStateInput): RequestWorkflowState {
  const step2Complete = input.step2CompletedOverride ?? input.winningSupplierSelected
  const step3ProofComplete = input.paymentReceived && input.receiptSent && input.deliveryScheduled
  const step3Complete = step3ProofComplete

  let step2Action: RequestWorkflowAction
  if (step2Complete) step2Action = "send-estimate"
  else if (!input.routeSupplierCount) step2Action = "choose-suppliers"
  else if (input.supplierQuoteCount) step2Action = input.supplierQuoteCount === 1 ? "review-quote" : "compare-quotes"
  else if (!input.supplierRequestCount) step2Action = "contact-suppliers"
  else step2Action = "add-supplier-quote"

  let step3Action: RequestWorkflowAction
  if (input.paymentReceived && !input.receiptSent) step3Action = "create-receipt"
  else if (input.paymentReceived && !input.deliveryScheduled) step3Action = "schedule-delivery"
  else if (input.paymentReceived) step3Action = "complete"
  else if (!input.estimateSent) step3Action = "send-estimate"
  else if (!input.clientApproved) step3Action = "wait-for-approval"
  else if (!input.invoiceSent) step3Action = "create-invoice"
  else if (!input.paymentLinkSent) step3Action = "send-payment-link"
  else if (!input.paymentReceived) step3Action = "mark-paid"
  else if (!input.receiptSent) step3Action = "create-receipt"
  else if (!input.deliveryScheduled) step3Action = "schedule-delivery"
  else step3Action = "complete"

  return {
    step2Complete,
    step3Complete,
    step2Action,
    step3Action,
    step2Status: step2Complete ? "complete" : "active",
    step3Status: step3Complete ? "complete" : step2Complete ? "active" : "upcoming",
  }
}
