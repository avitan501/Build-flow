import type { RequestClientDocumentType, RequestClientQuotePdfInput } from "@/lib/request-client-quote-pdf"

export type StoredRequestClientDocument = {
  document_type: RequestClientDocumentType
  document_number: string
  document_data: unknown
  version: number
  updated_at: string
}

export function parseRequestClientDocument(row: StoredRequestClientDocument): RequestClientQuotePdfInput | null {
  if (!row.document_data || typeof row.document_data !== "object" || Array.isArray(row.document_data)) return null
  const value = row.document_data as Record<string, unknown>
  const lines = Array.isArray(value.lines) ? value.lines.flatMap((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return []
    const line = raw as Record<string, unknown>
    const description = String(line.description || "").trim()
    const quantity = Number(line.quantity)
    const unitPrice = Number(line.unitPrice)
    if (!description || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) return []
    return [{ description, quantity, unit: String(line.unit || "each"), unitPrice }]
  }) : []
  if (!lines.length) return null
  return {
    documentType: row.document_type,
    quoteNumber: row.document_number,
    issueDate: String(value.issueDate || ""),
    expiresOn: String(value.expiresOn || ""),
    clientName: String(value.clientName || "Client"),
    clientAddress: String(value.clientAddress || ""),
    shipTo: String(value.shipTo || ""),
    requestTitle: String(value.requestTitle || "Material request"),
    lines,
    deliveryCharge: Math.max(0, Number(value.deliveryCharge) || 0),
    salesTaxRate: Math.max(0, Number(value.salesTaxRate) || 0),
    taxableDelivery: value.taxableDelivery !== false,
    terms: String(value.terms || ""),
    paymentLink: typeof value.paymentLink === "string" ? value.paymentLink : undefined,
  }
}
