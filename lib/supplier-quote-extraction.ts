import "server-only"

import { Buffer } from "node:buffer"

import { parseSupplierQuoteText } from "@/lib/supplier-quote-parser"

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

  const items = parseSupplierQuoteText(text)
  const extractionNote = items.length
    ? `${items.length} possible line item${items.length === 1 ? "" : "s"} extracted. Review quantities and prices before routing.`
    : text
      ? "The document text was saved, but no dependable item rows were found. Add the items manually."
      : "The original document was saved. This file type needs manual item entry."
  return { text: text.slice(0, 250000), items, extractionNote }
}
