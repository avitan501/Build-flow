import type { ShopItemRecord } from "@/lib/shop"

export type ShopCatalogProduct = {
  id: string
  slug: string
  name: string
  description: string
  category: string
  unit: string
  price: number
  supplierName: string | null
  quoteNumber: string | null
  image: string
  specLine: string
  availability: string
  featuredLabel: string
  popularUse: string
  reviewLabel: string
  rating: number
  relatedCategories: string[]
}

export const SAMPLE_SHOP_PRODUCTS: ShopCatalogProduct[] = [
  {
    id: "sample-2x4-premium",
    slug: "2x4-premium-lumber",
    name: "2x4 Premium Lumber",
    description: "Kiln-dried framing lumber for clean residential wall framing and interior structural work.",
    category: "Lumber",
    unit: "Each · 8 ft",
    price: 7.95,
    supplierName: "BuildFlow sample catalog",
    quoteNumber: "CAT-LUM-204",
    image: "https://images.unsplash.com/photo-1513467535987-fd81bc7d62f8?auto=format&fit=crop&w=900&q=80",
    specLine: "#2 SPF · kiln dried · framing",
    availability: "Ready to quote",
    featuredLabel: "Popular for framing",
    popularUse: "Wall framing",
    reviewLabel: "4.8 · 124 reviews",
    rating: 4.8,
    relatedCategories: ["Plywood", "Fasteners"],
  },
  {
    id: "sample-2x8-treated",
    slug: "2x8-treated-lumber",
    name: "2x8 Treated Lumber",
    description: "Pressure-treated board suited for exterior framing, deck bases, and moisture-prone structural areas.",
    category: "Treated Lumber",
    unit: "Each · 12 ft",
    price: 23.4,
    supplierName: "BuildFlow sample catalog",
    quoteNumber: "CAT-TRL-208",
    image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=80",
    specLine: "Ground contact rated · exterior use",
    availability: "Ready to quote",
    featuredLabel: "Deck & exterior",
    popularUse: "Deck framing",
    reviewLabel: "4.7 · 89 reviews",
    rating: 4.7,
    relatedCategories: ["Fasteners", "Hangers"],
  },
  {
    id: "sample-cdx-plywood",
    slug: "cdx-plywood-sheet",
    name: "CDX Plywood",
    description: "General-purpose structural plywood sheet for roof, wall, and subfloor sheathing applications.",
    category: "Plywood",
    unit: "Sheet · 4x8",
    price: 34.75,
    supplierName: "BuildFlow sample catalog",
    quoteNumber: "CAT-PLY-001",
    image: "https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?auto=format&fit=crop&w=900&q=80",
    specLine: "5/8 in · structural sheathing",
    availability: "Ready to quote",
    featuredLabel: "Popular for framing",
    popularUse: "Wall & roof sheathing",
    reviewLabel: "4.9 · 201 reviews",
    rating: 4.9,
    relatedCategories: ["Lumber", "Adhesives"],
  },
  {
    id: "sample-lvl-beam",
    slug: "lvl-beam-header",
    name: "LVL Beam",
    description: "Engineered laminated veneer lumber beam for long spans, headers, and high-load framing zones.",
    category: "LVL Beams",
    unit: "Each · 1-3/4 x 11-7/8 x 16'",
    price: 118.2,
    supplierName: "BuildFlow sample catalog",
    quoteNumber: "CAT-LVL-118",
    image: "https://images.unsplash.com/photo-1517581177682-a085bb7ffb15?auto=format&fit=crop&w=900&q=80",
    specLine: "Engineered span member · header ready",
    availability: "Ready to quote",
    featuredLabel: "Structural",
    popularUse: "Headers & long spans",
    reviewLabel: "4.9 · 54 reviews",
    rating: 4.9,
    relatedCategories: ["Lumber", "Hangers"],
  },
  {
    id: "sample-simpson-hanger",
    slug: "simpson-joist-hanger",
    name: "Simpson Joist Hanger",
    description: "Heavy-duty galvanized hanger for fastening joists securely into beams or ledger assemblies.",
    category: "Hangers",
    unit: "Each",
    price: 4.85,
    supplierName: "BuildFlow sample catalog",
    quoteNumber: "CAT-HNG-210",
    image: "https://images.unsplash.com/photo-1599707254554-027aeb4deacd?auto=format&fit=crop&w=900&q=80",
    specLine: "Galvanized steel · ledger/beam mount",
    availability: "Ready to quote",
    featuredLabel: "Framing essential",
    popularUse: "Joist connections",
    reviewLabel: "4.8 · 77 reviews",
    rating: 4.8,
    relatedCategories: ["Fasteners", "Lumber"],
  },
  {
    id: "sample-paslode-nails",
    slug: "paslode-framing-nails",
    name: "Paslode Framing Nails",
    description: "Collated framing nails for pneumatic framing tools, sized for efficient structural fastening.",
    category: "Fasteners",
    unit: "Box",
    price: 42.1,
    supplierName: "BuildFlow sample catalog",
    quoteNumber: "CAT-FST-501",
    image: "https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=900&q=80",
    specLine: "Paper tape collated · framing gun ready",
    availability: "Ready to quote",
    featuredLabel: "Popular for framing",
    popularUse: "Stud and plate fastening",
    reviewLabel: "4.7 · 148 reviews",
    rating: 4.7,
    relatedCategories: ["Hangers", "Lumber"],
  },
  {
    id: "sample-subfloor-adhesive",
    slug: "subfloor-adhesive-tube",
    name: "Subfloor Adhesive",
    description: "High-grab construction adhesive designed to reduce squeaks and improve panel hold on floors.",
    category: "Adhesives",
    unit: "Tube · 28 oz",
    price: 6.45,
    supplierName: "BuildFlow sample catalog",
    quoteNumber: "CAT-ADH-028",
    image: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=900&q=80",
    specLine: "High strength bond · subfloor rated",
    availability: "Ready to quote",
    featuredLabel: "Jobsite staple",
    popularUse: "Subfloor installs",
    reviewLabel: "4.6 · 63 reviews",
    rating: 4.6,
    relatedCategories: ["Plywood", "Lumber"],
  },
  {
    id: "sample-stainless-flashing",
    slug: "stainless-flashing-roll",
    name: "Stainless Flashing",
    description: "Corrosion-resistant flashing for clean water management around roofs, walls, and window openings.",
    category: "Flashing",
    unit: "Roll · 10 in x 50 ft",
    price: 58.9,
    supplierName: "BuildFlow sample catalog",
    quoteNumber: "CAT-FLS-050",
    image: "https://images.unsplash.com/photo-1523413651479-597eb2da0ad6?auto=format&fit=crop&w=900&q=80",
    specLine: "Corrosion resistant · exterior weatherproofing",
    availability: "Ready to quote",
    featuredLabel: "Envelope",
    popularUse: "Water management",
    reviewLabel: "4.8 · 42 reviews",
    rating: 4.8,
    relatedCategories: ["Adhesives", "Plywood"],
  },
]

export function slugifyShopProduct(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function fallbackImageForCategory(category: string | null) {
  switch (category) {
    case "Lumber":
      return SAMPLE_SHOP_PRODUCTS[0].image
    case "Treated Lumber":
      return SAMPLE_SHOP_PRODUCTS[1].image
    case "Plywood":
      return SAMPLE_SHOP_PRODUCTS[2].image
    case "LVL Beams":
      return SAMPLE_SHOP_PRODUCTS[3].image
    case "Hangers":
      return SAMPLE_SHOP_PRODUCTS[4].image
    case "Fasteners":
      return SAMPLE_SHOP_PRODUCTS[5].image
    case "Adhesives":
      return SAMPLE_SHOP_PRODUCTS[6].image
    case "Flashing":
      return SAMPLE_SHOP_PRODUCTS[7].image
    default:
      return "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=80"
  }
}

export function deriveSpecLine(item: ShopItemRecord) {
  if (item.description?.trim()) {
    return item.description.trim().slice(0, 72)
  }

  if (item.unit?.trim()) {
    return `${item.unit.trim()} · supplier catalog item`
  }

  return "Supplier catalog item ready for quoting"
}

export function normalizeShopItems(items: ShopItemRecord[]): ShopCatalogProduct[] {
  return items.map((item, index) => ({
    id: item.id,
    slug: slugifyShopProduct(`${item.name}-${item.id.slice(0, 6)}`),
    name: item.name,
    description: item.description || "Supplier catalog item ready for project quoting.",
    category: item.category || "Materials",
    unit: item.unit || "Unit not specified",
    price: item.unit_price,
    supplierName: item.supplier_name,
    quoteNumber: item.quote_number,
    image: fallbackImageForCategory(item.category),
    specLine: deriveSpecLine(item),
    availability: "Ready to quote",
    featuredLabel: item.category === "Lumber" || item.category === "Plywood" || item.category === "Fasteners" ? "Popular for framing" : "Jobsite pick",
    popularUse: item.category || "General materials",
    reviewLabel: `${4.6 + ((index % 4) * 0.1)} · ${48 + index * 13} reviews`,
    rating: 4.6 + ((index % 4) * 0.1),
    relatedCategories: [item.category || "Materials"],
  }))
}

export function buildShopProducts(itemsData: ShopItemRecord[] | null | undefined, error: unknown) {
  return !error && itemsData && itemsData.length > 0 ? normalizeShopItems(itemsData) : SAMPLE_SHOP_PRODUCTS
}

export function findShopProductBySlug(products: ShopCatalogProduct[], slug: string) {
  return products.find((product) => product.slug === slug) ?? null
}
