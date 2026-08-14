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
] as const

export type MaterialCatalogCategory = (typeof MATERIAL_CATALOG_CATEGORIES)[number]

export type MaterialCatalogItem = {
  id: string
  category: string
  item_code: string
  name: string
  description: string
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
  unit_price: number | null
  availability: "available" | "not_available" | "unknown"
  notes: string
  updated_at: string
}

export type CatalogSupplier = {
  id: string
  name: string
  email?: string
  phone?: string
  materials?: string[]
}
