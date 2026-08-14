import "server-only"

import { Buffer } from "node:buffer"

import { MATERIAL_CATALOG_CATEGORIES, type MaterialCatalogCategory } from "@/lib/material-catalog"

export type ImportedCatalogItem = {
  category: MaterialCatalogCategory
  itemCode: string
  name: string
  defaultQuantity: number
  unit: string
  sortOrder: number
}

const CATEGORY_PREFIX: Record<MaterialCatalogCategory, string> = {
  Framing: "FRA", Electrical: "ELE", Tile: "TIL", "Sheet Rock": "SHR", "Door & Molding": "DOM",
  Flooring: "FLO", Siding: "SID", Roofing: "ROO", Windows: "WIN", Others: "OTH",
}

function normalizeCategory(value: string): MaterialCatalogCategory | null {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ")
  return MATERIAL_CATALOG_CATEGORIES.find((category) => normalized === category.toLowerCase() || normalized.startsWith(`${category.toLowerCase()} `)) ?? null
}

function normalizeUnit(value: string) {
  return value.trim().toLowerCase().replace(/^sq\.?\s*ft\.?$/, "sq. ft.").replace(/^lin\.?\s*ft\.?$/, "lin. ft.")
}

export function parseMaterialComparisonText(text: string): ImportedCatalogItem[] {
  const rows: ImportedCatalogItem[] = []
  const counters = new Map<MaterialCatalogCategory, number>()
  let category: MaterialCatalogCategory | null = null
  for (const rawLine of text.replace(/\r/g, "").split("\n")) {
    const line = rawLine.replace(/\s+/g, " ").trim()
    if (!line) continue
    const categoryMatch = line.match(/^\d+\.\s+(.+)$/)
    if (categoryMatch) { category = normalizeCategory(categoryMatch[1]); continue }
    if (!category) continue
    const itemMatch = line.match(/^([\d,]+(?:\.\d+)?)\s+(pcs|sheets|boxes|tubes|rolls|bags|pails|sets|squares|bundles|sq\.?\s*ft\.?|lin\.?\s*ft\.?)\s+(.+)$/i)
    if (!itemMatch) continue
    const quantity = Number(itemMatch[1].replace(/,/g, ""))
    const name = itemMatch[3].trim()
    if (!Number.isFinite(quantity) || quantity <= 0 || !name || /before ordering/i.test(name)) continue
    const next = (counters.get(category) ?? 0) + 1
    counters.set(category, next)
    rows.push({ category, itemCode: `${CATEGORY_PREFIX[category]}-${String(next).padStart(3, "0")}`, name, defaultQuantity: quantity, unit: normalizeUnit(itemMatch[2]), sortOrder: next * 10 })
  }
  return rows
}

export async function extractMaterialCatalogItemsFromPdf(file: File) {
  if (file.type && file.type !== "application/pdf") throw new Error("Choose a PDF file.")
  if (file.size <= 0 || file.size > 25 * 1024 * 1024) throw new Error("Choose a PDF under 25 MB.")
  await import("@napi-rs/canvas")
  const { PDFParse } = await import("pdf-parse")
  const bytes = Buffer.from(await file.arrayBuffer())
  const parser = new PDFParse({ data: new Uint8Array(bytes) })
  try {
    const result = await parser.getText()
    const text = (result.pages ?? []).map((page: { text?: string }) => page.text ?? "").join("\n")
    const items = parseMaterialComparisonText(text)
    if (!items.length) throw new Error("No quantity, unit, and material rows were found in this PDF.")
    return items
  } finally { await parser.destroy() }
}
