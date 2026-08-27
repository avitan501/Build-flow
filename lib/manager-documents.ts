export const MANAGER_DOCUMENT_BUCKET = "manager-documents"

export const managerDocumentTypes = [
  "supplier_quote",
  "supplier_invoice",
  "client_invoice",
  "receipt",
  "catalog_price_list",
  "client_estimate",
  "material_list",
  "purchase_order",
  "project_document",
  "unknown",
] as const

export type ManagerDocumentType = (typeof managerDocumentTypes)[number]
export type ManagerDocumentStatus = "processing" | "needs_review" | "ready" | "routed" | "archived" | "error"

export type ManagerDocumentRecord = {
  id: string
  document_type: ManagerDocumentType
  status: ManagerDocumentStatus
  title: string
  party_name: string
  document_number: string
  document_date: string | null
  due_date: string | null
  expires_on: string | null
  department: string
  suggested_department: string
  currency: string
  subtotal: number | null
  discount: number
  delivery_charge: number
  tax_amount: number | null
  tax_percent: number | null
  total: number | null
  storage_bucket: string
  file_name: string
  file_path: string
  mime_type: string
  file_size: number
  source_sha256: string | null
  raw_text: string
  classification_confidence: number | null
  extraction_note: string
  evidence: ManagerDocumentEvidence[]
  warnings: string[]
  suggested_actions: string[]
  source_channel: "website_upload" | "email" | "whatsapp" | "sms" | "camera" | "project" | "other"
  source_label: string
  source_reference: string
  source_group_id: string
  client_id: string | null
  project_id: string | null
  request_id: string | null
  supplier_id: string | null
  legacy_supplier_quote_id: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

export type ManagerDocumentItemRecord = {
  id: string
  document_id: string
  line_number: number
  item_code: string
  description: string
  specification: string
  quantity: number | null
  unit: string
  unit_price: number | null
  line_total: number | null
  source_page: number | null
  source_text: string
  confidence: number | null
  validation_status: "valid" | "needs_review" | "mismatch"
  selected: boolean
}

export type ManagerDocumentEvidence = {
  field: string
  value: string
  page: number | null
  sourceText: string
  confidence: number
  selected: boolean
}

export function managerDocumentTypeLabel(type: ManagerDocumentType) {
  return ({
    supplier_quote: "Supplier quote",
    supplier_invoice: "Supplier invoice · received",
    client_invoice: "Client invoice · outgoing",
    receipt: "Receipt",
    catalog_price_list: "Catalog / price list",
    client_estimate: "Client estimate",
    material_list: "Material list",
    purchase_order: "Purchase order",
    project_document: "Project document",
    unknown: "Needs classification",
  } satisfies Record<ManagerDocumentType, string>)[type]
}

export function managerDocumentStatusLabel(status: ManagerDocumentStatus) {
  return ({ processing: "Reading", needs_review: "Needs review", ready: "Approved", routed: "Routed", archived: "Archived", error: "Needs attention" })[status]
}

export function confidenceLabel(value: number | null) {
  if (value === null) return "Not scored"
  return `${Math.round(value * 100)}%`
}
