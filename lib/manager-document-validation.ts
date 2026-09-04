const MONEY_TOLERANCE = 0.03

export type DocumentValidationItem = {
  description: string
  quantity: number | null
  unit?: string
  unitPrice: number | null
  lineTotal: number | null
  sourceText?: string
  confidence: number
}

export type DocumentPricingBasis = Pick<
  DocumentValidationItem,
  "quantity" | "unit" | "unitPrice" | "lineTotal" | "sourceText"
>

function sourceNumbers(sourceText: string) {
  return [...sourceText.matchAll(/\d[\d,]*(?:\.\d+)?/g)]
    .map((match) => Number(match[0].replaceAll(",", "")))
    .filter(Number.isFinite)
}

function canonicalPerThousandUnit(value: string | undefined) {
  const unit = String(value ?? "").trim().toUpperCase().replaceAll(".", "")
  if (unit === "MS" || unit === "MSF") return "MS"
  if (unit === "ML" || unit === "MLF") return "ML"
  return ""
}

/** Normalize a source-grounded MS/MSF or ML/MLF extension to its pricing basis. */
export function normalizeDocumentPricingBasis<T extends DocumentPricingBasis>(
  item: T,
): T {
  if (
    item.lineTotal === null ||
    item.lineTotal <= 0 ||
    !item.sourceText?.trim()
  )
    return item

  const unit = canonicalPerThousandUnit(item.unit)
  if (!unit) return item

  const printedNumbers = sourceNumbers(item.sourceText)
  if (
    !printedNumbers.some(
      (value) => Math.abs(value - item.lineTotal!) <= MONEY_TOLERANCE,
    )
  )
    return item

  const rates = [
    ...item.sourceText.matchAll(
      /(\d[\d,]*(?:\.\d+)?)\s*\/\s*(MSF?|MLF?)\b/gi,
    ),
  ]
  const rateMatch = rates.find(
    (match) => canonicalPerThousandUnit(match[2]) === unit,
  )
  if (!rateMatch) return item

  const rate = Number(rateMatch[1].replaceAll(",", ""))
  if (!Number.isFinite(rate) || rate <= 0) return item

  const currentExpected =
    item.quantity !== null && item.unitPrice !== null
      ? Math.round(item.quantity * item.unitPrice * 100) / 100
      : null
  if (
    currentExpected !== null &&
    Math.abs(currentExpected - item.lineTotal) <= MONEY_TOLERANCE
  )
    return item

  const quantity = Math.round((item.lineTotal / rate) * 10_000) / 10_000
  if (!Number.isFinite(quantity) || quantity <= 0) return item

  return { ...item, quantity, unit, unitPrice: rate }
}

const NON_ITEM_LINE_PATTERN = /^(?:subtotal|sales tax|tax|delivery(?: fee| charge)?|shipping(?: fee| charge)?|freight(?: fee| charge)?|discount|grand total|total|balance due|payments?\/?credits?)$/i

export function isObsoleteSelectionSubtotalWarning(warning: string) {
  return warning.trim().startsWith("Selected lines add to $")
}

export function isManagerDocumentChargeLine(description: string) {
  return NON_ITEM_LINE_PATTERN.test(description.trim())
}

export function managerDocumentReviewLineIncomplete(input: {
  documentType: string
  selected: boolean
  description: string
  quantity: number | null
  unit: string
  unitPrice: number | null
  lineTotal: number | null
}) {
  if (!input.selected) return false
  if (!input.description.trim() || !input.unit.trim()) return true

  // A supplier catalog/price list describes the price of one sale unit. It
  // normally has no ordered quantity or extended line total, so those fields
  // must not block a manager from saving one reviewed product to the catalog.
  if (input.documentType === "catalog_price_list") {
    return input.unitPrice === null
  }

  const requiresPricing = [
    "supplier_quote",
    "supplier_invoice",
    "receipt",
    "client_estimate",
    "purchase_order",
  ].includes(input.documentType)

  return (
    input.quantity === null ||
    (requiresPricing &&
      (input.unitPrice === null || input.lineTotal === null))
  )
}

export function documentLineValidationStatus(item: DocumentValidationItem): "valid" | "needs_review" | "mismatch" {
  const normalized = normalizeDocumentPricingBasis(item)
  const expected = normalized.quantity !== null && normalized.unitPrice !== null ? Math.round(normalized.quantity * normalized.unitPrice * 100) / 100 : null
  if (expected !== null && normalized.lineTotal !== null && Math.abs(expected - normalized.lineTotal) > MONEY_TOLERANCE) return "mismatch"
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
