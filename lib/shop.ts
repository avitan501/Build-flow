export const SHOP_SUPPLIER_ESTIMATE_STATUSES = ["draft", "reviewed", "archived"] as const;
export const SHOP_ITEM_SOURCES = ["supplier_estimate", "manual"] as const;
export const SHOP_CATEGORY_NAMES = [
  "Lumber",
  "Plywood",
  "Drywall",
  "Concrete",
  "Roofing",
  "Insulation",
  "Hardware",
  "Electrical",
  "Plumbing",
  "Tools",
  "Treated Lumber",
  "LVL Beams",
  "Fasteners",
  "Hangers",
  "Adhesives",
  "Flashing",
  "Doors",
  "Trim",
  "Windows",
  "Flooring",
  "Appliances",
  "Glass",
  "Lighting",
  "Tile",
  "Cabinets",
  "Materials",
] as const;
export const SHOP_POPULAR_SEARCHES = ["2x4 studs", "joist hangers", "subfloor adhesive", "pressure treated", "flashing roll"] as const;

export type ShopSupplierEstimateStatus = (typeof SHOP_SUPPLIER_ESTIMATE_STATUSES)[number];
export type ShopItemSource = (typeof SHOP_ITEM_SOURCES)[number];

export type ShopSupplierEstimateRecord = {
  id: string;
  supplier_name: string;
  quote_number: string | null;
  estimate_date: string | null;
  source_file_name: string | null;
  source_file_path: string | null;
  status: ShopSupplierEstimateStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ShopItemRecord = {
  id: string;
  supplier_estimate_id: string | null;
  supplier_name: string;
  quote_number: string | null;
  pricing_date: string | null;
  item_number: string | null;
  name: string;
  description: string | null;
  category: string | null;
  quantity: number | null;
  unit: string | null;
  unit_price: number;
  extended_price: number;
  source: ShopItemSource;
  image_url?: string | null;
  image_alt?: string | null;
  image_source?: string | null;
  image_license?: string | null;
  image_credit?: string | null;
  image_category?: string | null;
  created_at: string;
  updated_at: string;
};

export function normalizeShopText(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "") || null;
}

export function buildShopDuplicateMatch(input: {
  supplierName: string;
  pricingDate?: string | null;
  itemNumber?: string | null;
  name?: string | null;
  description?: string | null;
  unit?: string | null;
}) {
  return {
    supplierName: input.supplierName.trim().toLowerCase(),
    pricingDate: input.pricingDate ?? null,
    itemNumber: input.itemNumber?.trim() || null,
    normalizedName: normalizeShopText(input.name),
    normalizedDescription: normalizeShopText(input.description),
    unit: input.unit?.trim().toLowerCase() || null,
  };
}
