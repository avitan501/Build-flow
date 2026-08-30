import type { ManagerDocumentItemRecord, ManagerDocumentRecord } from "@/lib/manager-documents"
import {
  canonicalMaterialCatalogDepartment,
  type MaterialCatalogCategory,
} from "@/lib/material-catalog"

type CatalogDocument = Pick<
  ManagerDocumentRecord,
  | "id"
  | "department"
  | "suggested_department"
  | "document_number"
  | "document_date"
  | "expires_on"
  | "file_name"
>

export type CatalogSourceLine = Pick<
  ManagerDocumentItemRecord,
  | "id"
  | "line_number"
  | "item_code"
  | "description"
  | "specification"
  | "quantity"
  | "unit"
  | "unit_price"
  | "line_total"
  | "source_page"
  | "source_text"
>

export type CatalogItemReference = {
  id: string
  package_quantity: number
  comparison_quantity: number
}

function clean(value: unknown, max: number) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max)
}

function money(value: number | null) {
  return value === null ? "" : `$${Number(value).toFixed(2)}`
}

export function reviewedDocumentCatalogDepartment(document: Pick<CatalogDocument, "department" | "suggested_department">): MaterialCatalogCategory {
  const suggested = canonicalMaterialCatalogDepartment(document.suggested_department)
  return canonicalMaterialCatalogDepartment(document.department, suggested)
}

export function reviewedDocumentSourceNote(document: CatalogDocument, item: CatalogSourceLine) {
  const details = [
    `Source: ${clean(document.file_name, 180)}`,
    document.document_number ? `document ${clean(document.document_number, 100)}` : "",
    document.document_date ? `dated ${document.document_date}` : "",
    item.item_code ? `supplier code ${clean(item.item_code, 120)}` : "",
    item.quantity !== null ? `quantity ${item.quantity}${item.unit ? ` ${clean(item.unit, 40)}` : ""}` : "",
    item.line_total !== null ? `line total ${money(item.line_total)}` : "",
    item.source_page ? `page ${item.source_page}` : "",
  ].filter(Boolean)
  const evidence = clean(item.source_text, 500)
  return clean(`${details.join(" · ")}.${evidence ? ` Evidence: ${evidence}` : ""}`, 1000)
}

export function reviewedDocumentPriceRow(input: {
  document: CatalogDocument
  item: CatalogSourceLine
  catalogItem: CatalogItemReference
  supplier: { id: string; name: string }
  userId: string
  now: string
}) {
  const { document, item, catalogItem, supplier, userId, now } = input
  if (item.unit_price === null) return null
  const observedAt = document.document_date ? `${document.document_date}T12:00:00.000Z` : now
  return {
    item_id: catalogItem.id,
    supplier_id: supplier.id,
    supplier_name_snapshot: clean(supplier.name, 300),
    supplier_sku: clean(item.item_code, 120),
    unit_price: Math.round(item.unit_price * 10000) / 10000,
    availability: "available",
    product_url: null,
    notes: reviewedDocumentSourceNote(document, item),
    price_type: "supplier_quote",
    verification_status: "supplier_quote",
    delivery_price: null,
    minimum_order: 1,
    comparison_price: Math.round(((item.unit_price / (catalogItem.package_quantity || 1)) * (catalogItem.comparison_quantity || 1)) * 10000) / 10000,
    verified_at: observedAt,
    expires_at: document.expires_on ? `${document.expires_on}T23:59:59.999Z` : null,
    price_observed_at: observedAt,
    source_document_id: document.id,
    source_file_name: clean(document.file_name, 255),
    source_quote_number: clean(document.document_number, 100) || null,
    source_document_date: document.document_date,
    source_quantity: item.quantity,
    source_unit: clean(item.unit, 40),
    source_line_total: item.line_total,
    source_page: item.source_page,
    source_text: clean(item.source_text, 1000),
    updated_by: userId,
    updated_at: now,
  } as const
}

export function catalogLineFailureMessage(input: {
  item: Pick<CatalogSourceLine, "line_number" | "item_code" | "description">
  step: "item" | "price"
  code?: string | null
}) {
  const label = `Line ${input.item.line_number} — ${clean(input.item.description, 120) || "unnamed item"}`
  const supplierCode = clean(input.item.item_code, 120)
  const codeLabel = supplierCode ? ` (supplier code ${supplierCode})` : ""
  const reason = ({
    "23505": "A catalog item with the same name or internal code already exists; reload the document and retry so Avantia can match it.",
    "23514": "A reviewed quantity, unit, price, or item value is outside the catalog's accepted range.",
    "42501": "Your account does not have permission to change this catalog row.",
    "42703": "The catalog database is missing the latest document-source fields.",
  } as Record<string, string>)[input.code ?? ""]
    ?? (input.step === "price"
      ? "The item is in the catalog, but its reviewed supplier price and source could not be saved."
      : "The reviewed item could not be created or matched in the catalog.")
  return `${label}${codeLabel}: ${reason}`
}
