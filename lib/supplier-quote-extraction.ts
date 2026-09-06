import "server-only"

import { extractSupplierQuoteWithAi, type SupplierQuoteAiInvoker, type SupplierQuoteAiMetadata } from "@/lib/supplier-quote-ai"
import { parseSupplierQuoteMetadata, parseSupplierQuoteText } from "@/lib/supplier-quote-parser"

const emptyMetadata: SupplierQuoteAiMetadata = {
  supplierName: "",
  quoteNumber: "",
  quoteDate: "",
  expiresOn: "",
  department: "",
  deliveryCharge: 0,
  taxPercent: 0,
  leadTimeDays: null,
  subtotal: null,
  total: null,
}

export type SupplierQuoteExtractionOptions = {
  aiMode?: "always" | "when-empty"
}

export async function extractSupplierQuoteFile(
  file: File,
  suppliedOcrText = "",
  invoke?: SupplierQuoteAiInvoker,
  options: SupplierQuoteExtractionOptions = {},
) {
  const type = file.type.toLowerCase()
  let text = ""
  if (type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const { extractText, getDocumentProxy } = await import("unpdf")
    const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()))
    try {
      const result = await extractText(pdf, { mergePages: true })
      text = result.text
    } finally {
      await pdf.loadingTask?.destroy()
    }
  } else if (type === "text/csv" || type === "text/plain" || /\.(csv|txt)$/i.test(file.name)) {
    text = await file.text()
  }
  if (!text.trim() && suppliedOcrText.trim()) text = suppliedOcrText.slice(0, 250000)

  const parsedItems = parseSupplierQuoteText(text)
  const parsedMetadata = parseSupplierQuoteMetadata(text)
  let aiResult = null
  const shouldUseAi = options.aiMode !== "when-empty" || parsedItems.length === 0
  if (shouldUseAi) {
    try {
      aiResult = await extractSupplierQuoteWithAi(file, text, invoke)
    } catch (error) {
      console.error("Supplier quote AI extraction failed", error)
    }
    if (!aiResult && invoke) {
      try {
        aiResult = await extractSupplierQuoteWithAi(file, text)
      } catch (error) {
        console.error("Supplier quote direct AI fallback failed", error)
      }
    }
  }

  const items = aiResult?.items.length ? aiResult.items : parsedItems
  const extractionNote = aiResult?.items.length
    ? `${items.length} line item${items.length === 1 ? "" : "s"} extracted with OCR + AI. Review every value before routing.${aiResult.notes ? ` ${aiResult.notes}` : ""}`
    : items.length
      ? `${items.length} possible line item${items.length === 1 ? "" : "s"} extracted from document text. AI was unavailable or did not improve the result; review quantities and prices.`
      : text
        ? "The original document and its text were saved. AI could not confirm dependable rows yet; use Re-read with AI. Nothing was added to the catalog."
        : "The original document was saved. AI could not confirm dependable rows yet; use Re-read with AI. Nothing was added to the catalog."
  const aiMetadata = aiResult?.metadata
  const metadata: SupplierQuoteAiMetadata = {
    ...(aiMetadata ?? emptyMetadata),
    quoteNumber: aiMetadata?.quoteNumber || parsedMetadata.quoteNumber,
    expiresOn: aiMetadata?.expiresOn || parsedMetadata.expiresOn,
    deliveryCharge: aiMetadata?.deliveryCharge || parsedMetadata.deliveryCharge || 0,
    taxPercent: aiMetadata?.taxPercent || parsedMetadata.taxPercent || 0,
    leadTimeDays: aiMetadata?.leadTimeDays ?? parsedMetadata.leadTimeDays,
    subtotal: aiMetadata?.subtotal ?? parsedMetadata.subtotal,
    total: aiMetadata?.total ?? parsedMetadata.total,
  }
  return {
    text: text.slice(0, 250000),
    items,
    metadata,
    extractionNote,
  }
}
