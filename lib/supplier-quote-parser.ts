export type ExtractedSupplierQuoteItem = {
  itemCode: string
  description: string
  specification: string
  quantity: number
  unit: string
  unitPrice: number | null
  lineTotal: number | null
}

const UNIT_PATTERN = "(?:ea(?:ch)?|pcs?|pieces?|sheets?|boards?|boxes?|bags?|rolls?|bundles?|pails?|tubes?|sets?|pairs?|sq\\.?\\s*ft\\.?|sf|lin\\.?\\s*ft\\.?|lf|ft|yards?|yds?)"
const MONEY_PATTERN = "\\$?([0-9][0-9,]*(?:\\.[0-9]{1,4})?)"

function amount(value: string | undefined) {
  if (!value) return null
  const parsed = Number(value.replace(/[$,]/g, ""))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function quantity(value: string | undefined) {
  const parsed = amount(value)
  return parsed && parsed > 0 ? parsed : null
}

function normalizeUnit(value: string | undefined) {
  const unit = String(value ?? "each").trim().toLowerCase().replace(/\./g, "")
  if (["ea", "each", "pc", "pcs", "piece", "pieces"].includes(unit)) return "each"
  if (["sf", "sq ft"].includes(unit)) return "sq. ft."
  if (["lf", "lin ft"].includes(unit)) return "lin. ft."
  if (["yd", "yds", "yard", "yards"].includes(unit)) return "yard"
  return unit || "each"
}

function cleanDescription(value: string) {
  return value.replace(/\s+/g, " ").replace(/^[-|:]+|[-|:]+$/g, "").trim().slice(0, 500)
}

export function parseSupplierQuoteText(text: string): ExtractedSupplierQuoteItem[] {
  const rows: ExtractedSupplierQuoteItem[] = []
  const seen = new Set<string>()
  const leading = new RegExp(`^(?:([A-Z0-9][A-Z0-9._/-]{2,})\\s+)?([0-9][0-9,.]*)\\s+(${UNIT_PATTERN})\\s+(.+?)\\s+${MONEY_PATTERN}(?:\\s+${MONEY_PATTERN})?$`, "i")
  const trailing = new RegExp(`^(?:([A-Z0-9][A-Z0-9._/-]{2,})\\s+)?(.+?)\\s+([0-9][0-9,.]*)\\s+(${UNIT_PATTERN})?\\s+${MONEY_PATTERN}\\s+${MONEY_PATTERN}$`, "i")
  const ocrPriceRow = /^(.+?)\s+\$?([0-9][0-9,]*(?:\.[0-9]{1,4})?)T?\s+\$?([0-9][0-9,]*(?:\.[0-9]{1,4})?)T?(?:\s*[|.]+)?$/i

  for (const originalLine of text.replace(/\r/g, "").split("\n").slice(0, 10000)) {
    const line = originalLine.replace(/\s+/g, " ").trim()
    if (line.length < 8 || line.length > 700) continue
    if (/^(subtotal|tax|delivery|freight|shipping|total|page|quote|estimate)\b/i.test(line)) continue
    const first = line.match(leading)
    const second = first ? null : line.match(trailing)
    let item: ExtractedSupplierQuoteItem | null = null
    if (first) {
      const rowQuantity = quantity(first[2])
      const description = cleanDescription(first[4])
      const unitPrice = amount(first[5])
      const lineTotal = amount(first[6]) ?? (rowQuantity && unitPrice !== null ? rowQuantity * unitPrice : null)
      if (rowQuantity && description) item = { itemCode: first[1] ?? "", description, specification: "", quantity: rowQuantity, unit: normalizeUnit(first[3]), unitPrice, lineTotal }
    } else if (second) {
      const rowQuantity = quantity(second[3])
      const description = cleanDescription(second[2])
      const unitPrice = amount(second[5])
      const lineTotal = amount(second[6])
      if (rowQuantity && description) item = { itemCode: second[1] ?? "", description, specification: "", quantity: rowQuantity, unit: normalizeUnit(second[4]), unitPrice, lineTotal }
    } else {
      const scanned = line.match(ocrPriceRow)
      const unitPrice = amount(scanned?.[2])
      const lineTotal = amount(scanned?.[3])
      const calculatedQuantity = unitPrice && lineTotal ? lineTotal / unitPrice : 0
      const roundedQuantity = Math.round(calculatedQuantity)
      const description = cleanDescription(scanned?.[1] ?? "")
      if (description && unitPrice && lineTotal && roundedQuantity > 0 && roundedQuantity <= 500 && Math.abs(calculatedQuantity - roundedQuantity) < 0.01) {
        item = { itemCode: "", description, specification: "", quantity: roundedQuantity, unit: "each", unitPrice, lineTotal }
      }
    }
    if (!item || /^(description|item|quantity|qty|unit price)$/i.test(item.description)) continue
    const key = `${item.itemCode}|${item.description}|${item.quantity}|${item.unitPrice}`.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    rows.push(item)
    if (rows.length >= 500) break
  }
  return rows
}
