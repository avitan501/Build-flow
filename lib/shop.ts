export const SHOP_SUPPLIER_ESTIMATE_STATUSES = ["draft", "reviewed", "archived"] as const;
export const SHOP_ITEM_SOURCES = ["supplier_estimate", "manual"] as const;
export const SHOP_CATEGORY_NAMES = ["Services", "Framing", "Tile work", "Sheet rock", "Kitchen", "Eitan", "Carpentry", "Exterior", "Miscellaneous"] as const;
export const SHOP_CATEGORY_CHIPS = SHOP_CATEGORY_NAMES;
export const SHOP_POPULAR_SEARCHES = ["2x4 studs", "joist hangers", "subfloor adhesive", "pressure treated", "flashing roll", "final survey", "stakeout foundations"] as const;

export type ShopSupplierEstimateStatus = (typeof SHOP_SUPPLIER_ESTIMATE_STATUSES)[number];
export type ShopItemSource = (typeof SHOP_ITEM_SOURCES)[number];
export type ShopCategoryName = (typeof SHOP_CATEGORY_NAMES)[number];

const SHOP_CATEGORY_SET = new Set<string>(SHOP_CATEGORY_NAMES);
const SHOP_CATEGORY_KEYWORDS: Record<ShopCategoryName, RegExp> = {
  Services: /\b(survey|surveys|stakeout|final survey|under construction survey)\b/,
  Framing: /\b(2x4|2x6|2x8|2x10|2x12|lvl|joist|joists|hanger|hangers|tie|ties|nail|nails|strap|straps|bridging|treated lumber|plywood)\b/,
  "Tile work": /\b(tile|tiles|grout|thinset|thin set|mortar|schluter|cement board|backer board|backerboard|underlayment|tile paper|wire mesh|mesh|portland cement|fine sand)\b/,
  "Sheet rock": /\b(sheetrock|sheet rock|drywall|gypsum|compound|corner bead)\b/,
  Kitchen: /\b(kitchen|cabinet|cabinets|cabinetry|countertop|countertops|shaker|slab doors)\b/,
  Eitan: /\b(eitan)\b/,
  Carpentry: /\b(trim|casing|baseboard|door|doors|cabinet|cabinets|finish wood|stair|stairs|rail|rails)\b/,
  Exterior: /\b(flashing|exterior|siding|housewrap|house wrap|waterproof|roofing|window|windows)\b/,
  Miscellaneous: /$^/,
};

function normalizeCategoryInput(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function buildCategoryHaystack(input: {
  category?: string | null;
  name?: string | null;
  description?: string | null;
  itemNo?: string | null;
}) {
  return [input.category, input.name, input.description, input.itemNo]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function suggestShopCategory(input: {
  category?: string | null;
  name?: string | null;
  description?: string | null;
  itemNo?: string | null;
}): ShopCategoryName {
  const haystack = buildCategoryHaystack(input);

  if (SHOP_CATEGORY_KEYWORDS.Services.test(haystack)) return "Services";
  if (SHOP_CATEGORY_KEYWORDS.Framing.test(haystack)) return "Framing";
  if (SHOP_CATEGORY_KEYWORDS["Tile work"].test(haystack)) return "Tile work";
  if (SHOP_CATEGORY_KEYWORDS["Sheet rock"].test(haystack)) return "Sheet rock";
  if (SHOP_CATEGORY_KEYWORDS.Kitchen.test(haystack)) return "Kitchen";
  if (SHOP_CATEGORY_KEYWORDS.Eitan.test(haystack)) return "Eitan";
  if (SHOP_CATEGORY_KEYWORDS.Carpentry.test(haystack)) return "Carpentry";
  if (SHOP_CATEGORY_KEYWORDS.Exterior.test(haystack)) return "Exterior";

  return "Miscellaneous";
}

export function mapExistingCategoryToShopCategory(
  category: string | null | undefined,
  context: { name?: string | null; description?: string | null; itemNo?: string | null } = {},
): ShopCategoryName {
  const normalized = normalizeCategoryInput(category);

  if (SHOP_CATEGORY_SET.has(category?.trim() || "")) {
    return category!.trim() as ShopCategoryName;
  }

  switch (normalized) {
    case "services":
    case "service":
      return "Services";
    case "lumber":
    case "treated lumber":
    case "lvl beams":
    case "lvl beam":
    case "engineered lumber":
    case "plywood":
    case "hangers":
    case "hanger":
    case "fasteners":
    case "fastener":
      return "Framing";
    case "adhesives":
    case "adhesive": {
      const suggested = suggestShopCategory({ category, ...context });
      return suggested === "Miscellaneous" ? "Framing" : suggested;
    }
    case "tile":
      return "Tile work";
    case "drywall":
      return "Sheet rock";
    case "doors":
    case "door":
    case "trim":
      return "Carpentry";
    case "kitchen":
    case "cabinetry":
    case "cabinets":
    case "cabinet":
      return "Kitchen";
    case "eitan":
      return "Eitan";
    case "flooring":
      return suggestShopCategory({ category, ...context }) === "Tile work" ? "Tile work" : "Carpentry";
    case "flashing":
    case "roofing":
    case "windows":
    case "window":
      return "Exterior";
    case "glass":
      return suggestShopCategory({ category, ...context }) === "Exterior" ? "Exterior" : "Miscellaneous";
    case "hardware":
    case "materials":
    case "appliances":
    case "lighting":
    case "electrical":
    case "plumbing":
    case "tools":
    case "concrete":
    case "insulation":
      return "Miscellaneous";
    default:
      return suggestShopCategory({ category, ...context });
  }
}

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

export type ShopItemImageRecord = {
  imageUrl?: string | null;
  imageAlt?: string | null;
  imageSource?: string | null;
  imageLicense?: string | null;
  imageCredit?: string | null;
  imageCategory?: string | null;
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
  image_gallery?: ShopItemImageRecord[] | null;
  created_at: string;
  updated_at: string;
};

export const SHOP_ITEM_SELECT_FIELDS = "id, supplier_estimate_id, supplier_name, quote_number, pricing_date, item_number, name, description, category, quantity, unit, unit_price, extended_price, source, image_url, image_alt, image_source, image_license, image_credit, image_category, image_gallery, created_at, updated_at";

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
