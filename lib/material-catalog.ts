import type { SupplierTrustLevel } from "@/lib/shop-qualification"

export const MATERIAL_CATALOG_CATEGORIES = [
  "Framing",
  "Electrical",
  "Tile",
  "Sheet Rock",
  "Door & Molding",
  "Flooring",
  "Siding",
  "Roofing",
  "Windows",
  "Plumbing",
  "Lighting",
  "Insulation",
  "Concrete & Masonry",
  "Cabinets",
  "Appliances",
  "Tool Rental",
  "Take Care of Yourself",
  "Liquidation",
  "Others",
] as const

export type MaterialCatalogCategory = (typeof MATERIAL_CATALOG_CATEGORIES)[number]

export type MaterialCatalogItem = {
  id: string
  category: string
  item_code: string
  name: string
  description: string
  measurement: string
  thickness: string
  brand: string
  manufacturer_model_number: string
  upc: string
  package_quantity: number
  package_unit: string
  comparison_quantity: number
  comparison_unit: string
  review_status: "ready" | "needs_review" | "ambiguous" | "discontinued"
  quality_notes: string
  default_quantity: number
  unit: string
  image_url: string | null
  status: "active" | "inactive"
  source: string
  sort_order: number
  created_at: string
  updated_at: string
}

export type MaterialCatalogSupplierPrice = {
  item_id: string
  supplier_id: string
  supplier_name_snapshot: string
  supplier_sku: string
  product_url: string | null
  unit_price: number | null
  availability: "available" | "not_available" | "unknown"
  notes: string
  price_type: "retail" | "supplier_quote" | "contractor" | "estimated"
  verification_status: "verified_today" | "recently_verified" | "supplier_quote" | "stale" | "unavailable" | "possible_match" | "unverified"
  delivery_price: number | null
  minimum_order: number
  verified_at: string | null
  expires_at: string | null
  comparison_price: number | null
  retail_store_id: string | null
  retail_store_name: string | null
  retail_zip_code: string | null
  price_observed_at: string | null
  updated_at: string
}

export type CatalogSupplier = {
  id: string
  name: string
  email?: string
  phone?: string
  whatsapp?: string
  portalUrl?: string
  materials?: string | string[]
  trustLevel?: SupplierTrustLevel
  catalogDepartments?: string[]
  catalogEnabledDepartments?: string[]
}

const DEPARTMENT_ALIASES: Record<string, MaterialCatalogCategory> = {
  lumber: "Framing",
  "lumber & building materials": "Framing",
  "lumber and building materials": "Framing",
  "door and molding": "Door & Molding",
  "doors and molding": "Door & Molding",
  "door & molding": "Door & Molding",
  drywall: "Sheet Rock",
  "sheet rock": "Sheet Rock",
  sheetrock: "Sheet Rock",
  "tile work": "Tile",
  window: "Windows",
  windows: "Windows",
  "wood floor": "Flooring",
  "wood flooring": "Flooring",
  concrete: "Concrete & Masonry",
  masonry: "Concrete & Masonry",
  "cabinets & appliances": "Cabinets",
  appliance: "Appliances",
  appliances: "Appliances",
  rentals: "Appliances",
  "high end": "Take Care of Yourself",
  "high-end": "Take Care of Yourself",
  liquidation: "Liquidation",
  unassigned: "Others",
  general: "Others",
  "general request": "Others",
  other: "Others",
  others: "Others",
}

const ROUTABLE_SUPPLIER_TRUST_LEVELS: SupplierTrustLevel[] = ["first-time", "verified", "trusted", "preferred"]

export function normalizeMaterialCatalogDepartment(value: string | null | undefined) {
  const trimmed = String(value ?? "").trim().replace(/\s+/g, " ")
  if (!trimmed) return "Others"
  const normalized = trimmed.toLowerCase()
  const known = MATERIAL_CATALOG_CATEGORIES.find((category) => category.toLowerCase() === normalized)
  return known ?? DEPARTMENT_ALIASES[normalized] ?? trimmed
}

export function materialCatalogDepartmentOptions(...sources: Array<Iterable<string>>) {
  const values = [...MATERIAL_CATALOG_CATEGORIES, ...sources.flatMap((source) => [...source].map(normalizeMaterialCatalogDepartment))]
  return values.filter((value, index) => value && values.indexOf(value) === index)
}

export function hasRoutableSupplierTrust(level: SupplierTrustLevel | null | undefined) {
  return ROUTABLE_SUPPLIER_TRUST_LEVELS.includes(level ?? "not-reviewed")
}

export function supplierServesMaterialDepartment(
  supplier: Pick<CatalogSupplier, "catalogDepartments">,
  department: string,
) {
  const expected = normalizeMaterialCatalogDepartment(department)
  return (supplier.catalogDepartments ?? []).some((entry) => normalizeMaterialCatalogDepartment(entry) === expected)
}

export function supplierIsAddedToCatalogDepartment(
  supplier: Pick<CatalogSupplier, "catalogEnabledDepartments">,
  department: string,
) {
  const expected = normalizeMaterialCatalogDepartment(department)
  return (supplier.catalogEnabledDepartments ?? []).some((entry) => normalizeMaterialCatalogDepartment(entry) === expected)
}

export function supplierCanReceiveDepartmentRequest(
  supplier: Pick<CatalogSupplier, "catalogDepartments" | "email" | "phone" | "whatsapp" | "trustLevel">,
  department: string,
) {
  return Boolean(supplier.email?.trim() || supplier.phone?.trim() || supplier.whatsapp?.trim())
    && hasRoutableSupplierTrust(supplier.trustLevel)
    && supplierServesMaterialDepartment(supplier, department)
}
