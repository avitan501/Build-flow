import type { RequestWorkflowAction } from "./request-workflow-state"

/** Current action is authoritative; missing historical flags are not completion evidence. */
export function fulfillmentPhaseForAction(action: RequestWorkflowAction) {
  if (action === "wait-for-approval") return 1
  if (["create-invoice", "send-payment-link", "mark-paid"].includes(action)) return 2
  if (action === "create-receipt") return 3
  if (action === "schedule-delivery" || action === "complete") return 4
  return 0
}

export function savedClientDocumentAmounts(data: {
  lines?: Array<{ quantity: number; unitPrice: number }>
  deliveryCharge?: number; salesTaxRate?: number; taxableDelivery?: boolean
}) {
  const subtotal = (data.lines ?? []).reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unitPrice || 0), 0)
  const delivery = Number(data.deliveryCharge || 0)
  const taxRate = Number(data.salesTaxRate || 0)
  const tax = (subtotal + (data.taxableDelivery === false ? 0 : delivery)) * taxRate / 100
  return { subtotal, delivery, tax, taxRate, total: subtotal + delivery + tax }
}
