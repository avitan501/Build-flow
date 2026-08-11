import type { ShopCatalogProduct } from "@/lib/shop-catalog"

export type ShopToolSlug =
  | "services"
  | "paper-work"
  | "framing"
  | "tile-work"
  | "sheet-rock"
  | "kitchen"
  | "eitan"
  | "door-and-molding"
  | "wood-floor"
  | "siding"
  | "roofing"
  | "exterior"
  | "window"

export const DEPARTMENT_SYMBOL_KEYS = [
  "shopping-list",
  "blueprint",
  "site-visit",
  "delivery",
  "quote",
  "installation",
] as const

export type DepartmentSymbolKey = (typeof DEPARTMENT_SYMBOL_KEYS)[number]

export type ShopToolCategory = {
  slug: ShopToolSlug
  label: string
  description: string
  imageUrl: string
  imageAlt: string
  symbols?: DepartmentSymbolKey[]
}

export const SHOP_TOOL_CATEGORIES: ShopToolCategory[] = [
  {
    slug: "services",
    label: "Services",
    description: "Survey, as-built capture, and paperwork services for the job.",
    imageUrl: "/images/department-essentials/services-grid.webp",
    imageAlt: "Services icon",
    symbols: ["site-visit", "quote"],
  },
  {
    slug: "framing",
    label: "Framing",
    description: "Framing lumber, plywood, hangers, nails, and structural items.",
    imageUrl: "/images/buildflow-retail/framing-jobsite-v3.png",
    imageAlt: "Residential wood framing jobsite with dimensional lumber and plywood sheathing",
    symbols: ["shopping-list", "blueprint", "site-visit"],
  },
  {
    slug: "tile-work",
    label: "Tile work",
    description: "Tile materials and tile installation supplies.",
    imageUrl: "/images/buildflow-retail/tile-department.webp",
    imageAlt: "Tile, backer board, grout, spacers, trim, and waterproofing materials",
    symbols: ["shopping-list", "blueprint", "installation"],
  },
  {
    slug: "sheet-rock",
    label: "Sheet rock",
    description: "Drywall, sheetrock, compound, and wall board materials.",
    imageUrl: "/images/buildflow-retail/drywall-department.webp",
    imageAlt: "Drywall sheets, compound, tape, screws, corner bead, and metal studs",
    symbols: ["shopping-list", "blueprint", "delivery"],
  },
  {
    slug: "kitchen",
    label: "Kitchen",
    description: "Kitchen cabinets, design specs, plans, and cabinet package review.",
    imageUrl: "/images/department-essentials/kitchen-grid.webp",
    imageAlt: "Kitchen cabinet showroom with cabinet door samples and island display",
    symbols: ["shopping-list", "blueprint", "site-visit"],
  },
  {
    slug: "eitan",
    label: "Eitan",
    description: "Window schedule upload and renovation material quote requests.",
    imageUrl: "/images/department-essentials/windows-grid.webp",
    imageAlt: "Residential renovation jobsite with window plans and materials",
    symbols: ["blueprint", "quote"],
  },
  {
    slug: "door-and-molding",
    label: "Door and molding",
    description: "Doors, trim, molding, casing, and finish carpentry materials.",
    imageUrl: "/images/buildflow-retail/door-molding-department.webp",
    imageAlt: "Baseboard, casing, crown molding, shoe molding, and door trim",
    symbols: ["shopping-list", "blueprint", "delivery"],
  },
  {
    slug: "wood-floor",
    label: "Wood Floor",
    description: "Wood flooring and related floor finish materials.",
    imageUrl: "/images/buildflow-retail/flooring-department.webp",
    imageAlt: "Wood flooring, underlayment, transitions, stair nosing, adhesive, and trim",
    symbols: ["shopping-list", "site-visit", "installation"],
  },
  {
    slug: "siding",
    label: "Siding",
    description: "Siding, weather barriers, trim, fasteners, and exterior finish materials.",
    imageUrl: "/images/buildflow-retail/siding-department-v2.webp",
    imageAlt: "Siding panels, weather barrier, trim, starter strips, channels, and fasteners",
    symbols: ["shopping-list", "blueprint", "site-visit"],
  },
  {
    slug: "roofing",
    label: "Roofing",
    description: "Shingles, underlayment, flashing, ventilation, and roofing fasteners.",
    imageUrl: "/images/buildflow-retail/roofing-department.webp",
    imageAlt: "Roof shingles, underlayment, flashing, ridge caps, vents, and roofing nails",
    symbols: ["shopping-list", "blueprint", "site-visit"],
  },
  {
    slug: "window",
    label: "Window",
    description: "Window materials and window-related exterior items.",
    imageUrl: "/images/buildflow-retail/windows-department.webp",
    imageAlt: "Wood, vinyl, replacement, and new-construction windows with installation materials",
    symbols: ["shopping-list", "blueprint", "site-visit"],
  },
]

export function findShopToolCategory(slug: string) {
  if (slug === "paper-work") {
    return SHOP_TOOL_CATEGORIES.find((category) => category.slug === "services") ?? null
  }

  if (slug === "exterior") {
    return SHOP_TOOL_CATEGORIES.find((category) => category.slug === "roofing") ?? null
  }

  return SHOP_TOOL_CATEGORIES.find((category) => category.slug === slug) ?? null
}

function productHaystack(product: ShopCatalogProduct) {
  return [
    product.name,
    product.description,
    product.shortDescription,
    product.category,
    product.imageCategory,
    product.specLine,
    product.popularUse,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}

function isWoodFloorProduct(product: ShopCatalogProduct) {
  const haystack = productHaystack(product)
  return /\b(wood floor|wood flooring|hardwood|engineered floor|flooring)\b/.test(haystack)
}

function isWindowProduct(product: ShopCatalogProduct) {
  const haystack = productHaystack(product)
  return /\b(window|windows)\b/.test(haystack)
}

function isKitchenProduct(product: ShopCatalogProduct) {
  const haystack = productHaystack(product)
  return product.category === "Kitchen" || /\b(kitchen|cabinet|cabinets|cabinetry|countertop|countertops|shaker)\b/.test(haystack)
}

function isRoofingProduct(product: ShopCatalogProduct) {
  return /\b(roof|roofing|shingle|underlayment|ice and water|drip edge|ridge cap|roof vent)\b/.test(productHaystack(product))
}

function isSidingProduct(product: ShopCatalogProduct) {
  return /\b(siding|house wrap|weather barrier|j-channel|starter strip|fiber cement)\b/.test(productHaystack(product))
}

export function filterProductsForShopTool(products: ShopCatalogProduct[], slug: ShopToolSlug) {
  return products.filter((product) => {
    if (slug === "services" || slug === "paper-work") {
      return product.productType === "service" || product.category === "Services"
    }

    if (slug === "framing") {
      return product.productType !== "service" && product.category === "Framing"
    }

    if (slug === "tile-work") {
      return product.productType !== "service" && product.category === "Tile work"
    }

    if (slug === "sheet-rock") {
      return product.productType !== "service" && product.category === "Sheet rock"
    }

    if (slug === "kitchen") {
      return product.productType !== "service" && isKitchenProduct(product)
    }

    if (slug === "eitan") {
      return product.productType !== "service" && product.category === "Eitan"
    }

    if (slug === "door-and-molding") {
      return product.productType !== "service" && product.category === "Carpentry" && !isWoodFloorProduct(product) && !isKitchenProduct(product)
    }

    if (slug === "wood-floor") {
      return product.productType !== "service" && isWoodFloorProduct(product)
    }

    if (slug === "siding") {
      return product.productType !== "service" && product.category === "Exterior" && isSidingProduct(product)
    }

    if (slug === "roofing" || slug === "exterior") {
      return product.productType !== "service" && product.category === "Exterior" && !isWindowProduct(product) && (isRoofingProduct(product) || !isSidingProduct(product))
    }

    return product.productType !== "service" && isWindowProduct(product)
  })
}
