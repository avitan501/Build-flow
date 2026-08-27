import {
  MATERIAL_CATALOG_CATEGORIES,
  type MaterialCatalogCategory,
} from "@/lib/material-catalog"
import {
  parseSupplierQuoteText,
  type ExtractedSupplierQuoteItem,
} from "@/lib/supplier-quote-parser"

export type ImportedCatalogItem = {
  category: string
  itemCode: string
  name: string
  defaultQuantity: number
  unit: string
  sortOrder: number
  supplierSku: string
  unitPrice: number | null
  lineTotal: number | null
}

const CATEGORY_PREFIX: Record<MaterialCatalogCategory, string> = {
  Framing: "FRA", Electrical: "ELE", Tile: "TIL", "Sheet Rock": "SHR", "Door & Molding": "DOM",
  Flooring: "FLO", Siding: "SID", Roofing: "ROO", Windows: "WIN", Plumbing: "PLU", Lighting: "LIG",
  Insulation: "INS", "Concrete & Masonry": "CON", Cabinets: "CAB", Appliances: "APP", "Tool Rental": "TOL",
  "Take Care of Yourself": "TCY", Liquidation: "LIQ", Others: "OTH",
}

const QUANTITY_UNIT_PATTERN = "([\\d,]+(?:\\.\\d+)?)\\s+(ea(?:ch)?|pcs?|pieces?|sheets?|boards?|boxes?|bags?|rolls?|bundles?|pails?|tubes?|sets?|pairs?|squares?|sq\\.?\\s*ft\\.?|sf|lin\\.?\\s*ft\\.?|lf|ft|yards?|yds?)"

function normalizeCategory(value: string): MaterialCatalogCategory | null {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ")
  return MATERIAL_CATALOG_CATEGORIES.find((category) => normalized === category.toLowerCase() || normalized.startsWith(`${category.toLowerCase()} `)) ?? null
}

function normalizeUnit(value: string) {
  const unit = value.trim().toLowerCase().replace(/\./g, "")
  if (["ea", "each", "pc", "pcs", "piece", "pieces"].includes(unit)) return "each"
  if (["sf", "sq ft"].includes(unit)) return "sq. ft."
  if (["lf", "lin ft"].includes(unit)) return "lin. ft."
  if (["yd", "yds", "yard", "yards"].includes(unit)) return "yard"
  return unit || "each"
}

function positiveQuantity(value: string) {
  const quantity = Number(value.replace(/,/g, ""))
  return Number.isFinite(quantity) && quantity > 0 ? quantity : null
}

function cleanName(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/^[-|:]+|[-|:]+$/g, "")
    .trim()
    .slice(0, 300)
}

function usableName(value: string) {
  return value.length >= 3
    && !/^(?:description|item|product|quantity|qty|unit|unit price|price|amount|total)$/i.test(value)
    && !/^(?:subtotal|sales tax|tax|delivery|freight|shipping|grand total|total|page|quote|estimate)\b/i.test(value)
    && !/^[\s$€£¥0-9,./:%+\-]+$/.test(value)
}

function categoryPrefix(category: string) {
  if ((MATERIAL_CATALOG_CATEGORIES as readonly string[]).includes(category)) {
    return CATEGORY_PREFIX[category as MaterialCatalogCategory]
  }
  return category.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "MAT"
}

function generatedItem(
  category: string,
  index: number,
  name: string,
  quantity: number,
  unit: string,
  supplierSku = "",
  unitPrice: number | null = null,
  lineTotal: number | null = null,
): ImportedCatalogItem {
  return {
    category,
    itemCode: `${categoryPrefix(category)}-${String(index).padStart(3, "0")}`,
    name,
    defaultQuantity: quantity,
    unit: normalizeUnit(unit),
    sortOrder: index * 10,
    supplierSku,
    unitPrice,
    lineTotal,
  }
}

export function supplierRowsToCatalogItems(rows: ExtractedSupplierQuoteItem[], category: string) {
  return rows.slice(0, 500).map((row, index) => {
    const name = cleanName([row.itemCode, row.description, row.specification].filter(Boolean).join(" · "))
    return generatedItem(
      category,
      index + 1,
      name,
      row.quantity || 1,
      row.unit || "each",
      row.itemCode,
      row.unitPrice,
      row.lineTotal,
    )
  }).filter((item) => usableName(item.name))
}

export function parseMaterialComparisonText(text: string, fallbackCategory?: string): ImportedCatalogItem[] {
  const rows: ImportedCatalogItem[] = []
  const counters = new Map<string, number>()
  const seen = new Set<string>()
  let category: string | null = fallbackCategory ?? null
  const leadingItem = new RegExp(`^${QUANTITY_UNIT_PATTERN}\\s+(.+)$`, "i")
  const trailingItem = new RegExp(`^(.+?)\\s+${QUANTITY_UNIT_PATTERN}$`, "i")

  for (const rawLine of text.replace(/\r/g, "").split("\n").slice(0, 10000)) {
    const line = rawLine.replace(/\s+/g, " ").trim()
    if (!line) continue
    const categoryMatch = line.match(/^(?:\d+[.)]\s*)?(.+)$/)
    const matchedCategory = categoryMatch ? normalizeCategory(categoryMatch[1]) : null
    if (matchedCategory && (line.length < 80 || /^\d+[.)]/.test(line))) {
      category = matchedCategory
      continue
    }
    if (!category) continue

    const leading = line.match(leadingItem)
    const trailing = leading ? null : line.match(trailingItem)
    const quantity = positiveQuantity(leading?.[1] ?? trailing?.[2] ?? "")
    const unit = leading?.[2] ?? trailing?.[3] ?? ""
    const name = cleanName(leading?.[3] ?? trailing?.[1] ?? "")
    if (!quantity || !usableName(name) || /before ordering/i.test(name)) continue

    const key = `${category}|${name}|${quantity}|${unit}`.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const next = (counters.get(category) ?? 0) + 1
    counters.set(category, next)
    rows.push(generatedItem(category, next, name, quantity, unit))
  }

  if (rows.length || !fallbackCategory) return rows
  return supplierRowsToCatalogItems(parseSupplierQuoteText(text), fallbackCategory)
}
