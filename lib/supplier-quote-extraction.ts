import "server-only"

import { Buffer } from "node:buffer"

import { extractSupplierQuoteWithAi, type SupplierQuoteAiMetadata } from "@/lib/supplier-quote-ai"
import { parseSupplierQuoteText } from "@/lib/supplier-quote-parser"

const emptyMetadata: SupplierQuoteAiMetadata = {
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

export async function extractSupplierQuoteFile(file: File) {
  const type = file.type.toLowerCase()
  let text = ""
  if (type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    await import("@napi-rs/canvas")
    const { PDFParse } = await import("pdf-parse")
    const parser = new PDFParse({ data: new Uint8Array(Buffer.from(await file.arrayBuffer())) })
    try {
      const result = await parser.getText()
      text = (result.pages ?? []).map((page: { text?: string }) => page.text ?? "").join("\n")
    } finally {
      await parser.destroy()
    }
  } else if (type === "text/csv" || type === "text/plain" || /\.(csv|txt)$/i.test(file.name)) {
    text = await file.text()
  }

  const parsedItems = parseSupplierQuoteText(text)
  let aiResult = null
  try {
    aiResult = await extractSupplierQuoteWithAi(file, text)
  } catch (error) {
    console.error("Supplier quote AI extraction failed", error)
  }

  const items = aiResult?.items.length ? aiResult.items : parsedItems
  const extractionNote = aiResult?.items.length
    ? `${items.length} line item${items.length === 1 ? "" : "s"} extracted with OCR + AI. Review every value before routing.${aiResult.notes ? ` ${aiResult.notes}` : ""}`
    : items.length
      ? `${items.length} possible line item${items.length === 1 ? "" : "s"} extracted from document text. AI was unavailable or did not improve the result; review quantities and prices.`
      : text
        ? "The document text was saved, but no dependable item rows were found. Add the items manually."
        : "The original document was saved, but OCR could not identify dependable item rows. Add the items manually."
  return {
    text: text.slice(0, 250000),
    items,
    metadata: aiResult?.metadata ?? emptyMetadata,
    extractionNote,
  }
}
