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

export type ShopToolCategory = {
  slug: ShopToolSlug
  label: string
  description: string
  imageUrl: string
  imageAlt: string
}

export const SHOP_TOOL_CATEGORIES: ShopToolCategory[] = [
  {
    slug: "services",
    label: "Services",
    description: "Survey, as-built capture, and paperwork services for the job.",
    imageUrl: "/images/materials/services.svg",
    imageAlt: "Services icon",
  },
  {
    slug: "framing",
    label: "Framing",
    description: "Framing lumber, plywood, hangers, nails, and structural items.",
    imageUrl: "/images/materials/photos/lumber.jpg",
    imageAlt: "Framing lumber",
  },
  {
    slug: "tile-work",
    label: "Tile work",
    description: "Tile materials and tile installation supplies.",
    imageUrl: "/images/materials/photos/tile.jpg",
    imageAlt: "Tile work material",
  },
  {
    slug: "sheet-rock",
    label: "Sheet rock",
    description: "Drywall, sheetrock, compound, and wall board materials.",
    imageUrl: "/images/materials/photos/drywall.jpg",
    imageAlt: "Sheet rock material",
  },
  {
    slug: "kitchen",
    label: "Kitchen",
    description: "Kitchen cabinets, design specs, plans, and cabinet package review.",
    imageUrl: "/images/materials/photos/kitchen.jpg",
    imageAlt: "Kitchen cabinet showroom with cabinet door samples and island display",
  },
  {
    slug: "eitan",
    label: "Eitan",
    description: "Window schedule upload and renovation material quote requests.",
    imageUrl: "/images/buildflow-retail/eitan-renovation.png",
    imageAlt: "Residential renovation jobsite with window plans and materials",
  },
  {
    slug: "door-and-molding",
    label: "Door and molding",
    description: "Doors, trim, molding, casing, and finish carpentry materials.",
    imageUrl: "/images/materials/photos/trim.jpg",
    imageAlt: "Door and molding material",
  },
  {
    slug: "wood-floor",
    label: "Wood Floor",
    description: "Wood flooring and related floor finish materials.",
    imageUrl: "/images/materials/photos/flooring.jpg",
    imageAlt: "Wood floor material",
  },
  {
    slug: "siding",
    label: "Siding",
    description: "Siding, weather barriers, trim, fasteners, and exterior finish materials.",
    imageUrl: "/images/materials/photos/trim.jpg",
    imageAlt: "Exterior siding and trim material",
  },
  {
    slug: "roofing",
    label: "Roofing",
    description: "Shingles, underlayment, flashing, ventilation, and roofing fasteners.",
    imageUrl: "/images/materials/photos/roofing.jpg",
    imageAlt: "Roofing material",
  },
  {
    slug: "window",
    label: "Window",
    description: "Window materials and window-related exterior items.",
    imageUrl: "/images/materials/photos/windows.jpg",
    imageAlt: "Window material",
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
