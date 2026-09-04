export type SupplierQuotePriceLine = {
  quantity: number
  unitPrice: number | null
  lineTotal: number | null
}

function safeNonNegative(value: unknown) {
  if (value === null || value === undefined || value === "") return null
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}

export function supplierQuoteLineTotal(line: SupplierQuotePriceLine) {
  const stated = safeNonNegative(line.lineTotal)
  if (stated !== null) return Math.round(stated * 100) / 100
  const quantity = safeNonNegative(line.quantity) ?? 0
  const unitPrice = safeNonNegative(line.unitPrice)
  return unitPrice === null ? null : Math.round(quantity * unitPrice * 100) / 100
}

export function supplierQuoteComparableUnitPrice(line: SupplierQuotePriceLine) {
  const quantity = safeNonNegative(line.quantity)
  const total = supplierQuoteLineTotal(line)
  if (quantity && total !== null) return Math.round((total / quantity) * 10_000) / 10_000
  return safeNonNegative(line.unitPrice)
}

export function normalizeSupplierQuoteUnit(value: unknown) {
  const unit = String(value ?? "each").trim().toLowerCase().replace(/[.\s]+/g, "")
  if (["ea", "each", "pc", "pcs", "piece", "pieces"].includes(unit)) return "each"
  if (["sf", "sqft"].includes(unit)) return "sq. ft."
  if (["lf", "linft"].includes(unit)) return "lin. ft."
  if (["ml", "m/l", "mlf"].includes(unit)) return "1,000 lin. ft."
  if (["ms", "m/s", "msf"].includes(unit)) return "1,000 sq. ft."
  if (["yd", "yds", "yard", "yards"].includes(unit)) return "yard"
  return String(value ?? "each").trim().toLowerCase() || "each"
}
