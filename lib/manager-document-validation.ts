const MONEY_TOLERANCE = 0.03

export type DocumentValidationItem = {
  description: string
  quantity: number | null
  unitPrice: number | null
  lineTotal: number | null
  confidence: number
}

export function documentLineValidationStatus(item: DocumentValidationItem): "valid" | "needs_review" | "mismatch" {
  const expected = item.quantity !== null && item.unitPrice !== null ? Math.round(item.quantity * item.unitPrice * 100) / 100 : null
  if (expected !== null && item.lineTotal !== null && Math.abs(expected - item.lineTotal) > MONEY_TOLERANCE) return "mismatch"
  return item.confidence >= 0.85 && item.description ? "valid" : "needs_review"
}

export function documentArithmeticWarnings(input: {
  items: DocumentValidationItem[]
  subtotal: number | null
  discount: number
  deliveryCharge: number
  taxAmount: number | null
  total: number | null
}) {
  const warnings: string[] = []
  const itemSubtotal = input.items.reduce<number | null>((sum, item) => item.lineTotal === null ? sum : (sum ?? 0) + item.lineTotal, null)
  if (itemSubtotal !== null && input.subtotal !== null && Math.abs(itemSubtotal - input.subtotal) > MONEY_TOLERANCE) warnings.push(`Line totals add to $${itemSubtotal.toFixed(2)}, but the printed subtotal is $${input.subtotal.toFixed(2)}.`)
  const expectedTotal = input.subtotal === null || input.taxAmount === null ? null : Math.round((input.subtotal - input.discount + input.deliveryCharge + input.taxAmount) * 100) / 100
  if (expectedTotal !== null && input.total !== null && Math.abs(expectedTotal - input.total) > MONEY_TOLERANCE) warnings.push(`Subtotal, discount, delivery, and tax calculate to $${expectedTotal.toFixed(2)}, but the printed total is $${input.total.toFixed(2)}.`)
  if (input.items.some((item) => documentLineValidationStatus(item) === "mismatch")) warnings.push("One or more line totals do not equal quantity × unit price.")
  return warnings
}
