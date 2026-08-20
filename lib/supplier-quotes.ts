export const SUPPLIER_QUOTE_BUCKET = "supplier-quotes"

export type SupplierQuoteStatus =
  | "needs_review"
  | "ready"
  | "cataloged"
  | "comparison"
  | "client_quote"
  | "archived"

export type SupplierQuoteRecord = {
  id: string
  client_id: string | null
  client_name_snapshot: string
  supplier_id: string | null
  supplier_name: string
  quote_number: string
  department: string
  quote_date: string | null
  expires_on: string | null
  status: SupplierQuoteStatus
  file_name: string
  file_path: string
  mime_type: string
  file_size: number
  raw_text: string
  extraction_note: string
  notes: string
  delivery_charge: number
  tax_percent: number
  comparison_id: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type SupplierQuoteItemRecord = {
  id: string
  quote_id: string
  line_number: number
  item_code: string
  description: string
  specification: string
  quantity: number
  unit: string
  unit_price: number | null
  line_total: number | null
  selected: boolean
  review_status: "needs_review" | "ready" | "ignored"
  catalog_item_id: string | null
  comparison_item_id: string | null
  created_at: string
  updated_at: string
}

export type SupplierQuoteSupplier = {
  id: string
  name: string
  catalogDepartments?: string[]
}

export type SupplierQuoteClient = {
  id: string
  name: string
  email: string
}

export function supplierQuoteStatusLabel(status: SupplierQuoteStatus) {
  return {
    needs_review: "Needs review",
    ready: "Ready",
    cataloged: "Added to catalog",
    comparison: "In comparison",
    client_quote: "Client quote",
    archived: "Archived",
  }[status]
}
