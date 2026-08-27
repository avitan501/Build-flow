import "server-only"

import { Buffer } from "node:buffer"

import {
  parseMaterialComparisonText,
  supplierRowsToCatalogItems,
  type ImportedCatalogItem,
} from "@/lib/material-catalog-pdf-parser"
import { extractSupplierQuoteWithAi, type SupplierQuoteAiMetadata } from "@/lib/supplier-quote-ai"
import { parseSupplierQuoteText } from "@/lib/supplier-quote-parser"
import { inferSupplierName } from "@/lib/supplier-quote-supplier"
import { MATERIAL_CATALOG_CATEGORIES, normalizeMaterialCatalogDepartment } from "@/lib/material-catalog"

export type MaterialCatalogPdfExtraction = {
  items: ImportedCatalogItem[]
  metadata: SupplierQuoteAiMetadata
  detectedSupplierName: string
  category: string
}

const EMPTY_METADATA: SupplierQuoteAiMetadata = {
  supplierName: "",
  quoteNumber: "",
  quoteDate: "",
  expiresOn: "",
  department: "",
  deliveryCharge: 0,
  taxPercent: 0,
  subtotal: null,
  total: null,
}

export async function extractMaterialCatalogItemsFromPdf(file: File, fallbackCategory: string): Promise<MaterialCatalogPdfExtraction> {
  if (file.type && file.type !== "application/pdf") throw new Error("Choose a PDF file.")
  if (file.size <= 0 || file.size > 25 * 1024 * 1024) throw new Error("Choose a PDF under 25 MB.")
  await import("@napi-rs/canvas")
  const { PDFParse } = await import("pdf-parse")
  const bytes = Buffer.from(await file.arrayBuffer())
  const parser = new PDFParse({ data: new Uint8Array(bytes) })
  try {
    const result = await parser.getText()
    const text = (result.pages ?? []).map((page: { text?: string }) => page.text ?? "").join("\n")
    const textQuoteItems = parseSupplierQuoteText(text)
    let aiResult = null
    try {
      aiResult = await extractSupplierQuoteWithAi(file, text)
    } catch (error) {
      console.error("Catalog PDF AI extraction failed", error)
    }
    const metadata = aiResult?.metadata ?? EMPTY_METADATA
    const detectedCategory = metadata.department ? normalizeMaterialCatalogDepartment(metadata.department) : ""
    const category = (MATERIAL_CATALOG_CATEGORIES as readonly string[]).includes(detectedCategory)
      ? detectedCategory
      : fallbackCategory
    const supplierItems = aiResult?.items.length ? aiResult.items : textQuoteItems
    const items = supplierItems.length
      ? supplierRowsToCatalogItems(supplierItems, category)
      : parseMaterialComparisonText(text, category)
    if (!items.length) throw new Error("The PDF opened, but no dependable product rows were found. Use a supplier quote, invoice, price list, or catalog PDF with readable product names.")
    return {
      items,
      metadata,
      detectedSupplierName: metadata.supplierName || inferSupplierName(text),
      category,
    }
  } finally { await parser.destroy() }
}
