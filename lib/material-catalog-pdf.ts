import "server-only"

import { Buffer } from "node:buffer"

import {
  parseMaterialComparisonText,
  supplierRowsToCatalogItems,
} from "@/lib/material-catalog-pdf-parser"
import { extractSupplierQuoteWithAi } from "@/lib/supplier-quote-ai"

export async function extractMaterialCatalogItemsFromPdf(file: File, fallbackCategory: string) {
  if (file.type && file.type !== "application/pdf") throw new Error("Choose a PDF file.")
  if (file.size <= 0 || file.size > 25 * 1024 * 1024) throw new Error("Choose a PDF under 25 MB.")
  await import("@napi-rs/canvas")
  const { PDFParse } = await import("pdf-parse")
  const bytes = Buffer.from(await file.arrayBuffer())
  const parser = new PDFParse({ data: new Uint8Array(bytes) })
  try {
    const result = await parser.getText()
    const text = (result.pages ?? []).map((page: { text?: string }) => page.text ?? "").join("\n")
    let items = parseMaterialComparisonText(text, fallbackCategory)
    if (!items.length) {
      try {
        const aiResult = await extractSupplierQuoteWithAi(file, text)
        items = supplierRowsToCatalogItems(aiResult?.items ?? [], fallbackCategory)
      } catch (error) {
        console.error("Catalog PDF AI fallback failed", error)
      }
    }
    if (!items.length) throw new Error("The PDF opened, but no dependable product rows were found. Use a supplier quote, invoice, price list, or catalog PDF with readable product names.")
    return items
  } finally { await parser.destroy() }
}
