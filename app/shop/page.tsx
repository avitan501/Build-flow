import { ShopCatalogExperience, type ShopCatalogProduct } from "@/components/buildflow/shop-catalog-experience"
import type { ShopItemRecord } from "@/lib/shop"
import { createClient } from "@/lib/supabase/server"

const SAMPLE_PRODUCTS: ShopCatalogProduct[] = [
  {
    id: "sample-2x4-premium",
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
  },
  {
    id: "sample-2x8-treated",
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
  },
  {
    id: "sample-cdx-plywood",
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
  },
  {
    id: "sample-lvl-beam",
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
  },
  {
    id: "sample-simpson-hanger",
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
  },
  {
    id: "sample-paslode-nails",
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
  },
  {
    id: "sample-subfloor-adhesive",
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
  },
  {
    id: "sample-stainless-flashing",
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
  },
]

function fallbackImageForCategory(category: string | null) {
  switch (category) {
    case "Lumber":
      return SAMPLE_PRODUCTS[0].image
    case "Treated Lumber":
      return SAMPLE_PRODUCTS[1].image
    case "Plywood":
      return SAMPLE_PRODUCTS[2].image
    case "LVL Beams":
      return SAMPLE_PRODUCTS[3].image
    case "Hangers":
      return SAMPLE_PRODUCTS[4].image
    case "Fasteners":
      return SAMPLE_PRODUCTS[5].image
    case "Adhesives":
      return SAMPLE_PRODUCTS[6].image
    case "Flashing":
      return SAMPLE_PRODUCTS[7].image
    default:
      return "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=80"
  }
}

function deriveSpecLine(item: ShopItemRecord) {
  if (item.description?.trim()) {
    return item.description.trim().slice(0, 72)
  }

  if (item.unit?.trim()) {
    return `${item.unit.trim()} · supplier catalog item`
  }

  return "Supplier catalog item ready for quoting"
}

function normalizeShopItems(items: ShopItemRecord[]): ShopCatalogProduct[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description || "Saved supplier catalog item ready for later project selection.",
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
  }))
}

export default async function ShopPage() {
  const supabase = await createClient()
  const { data: itemsData, error } = await supabase
    .from("shop_items")
    .select("id, supplier_estimate_id, supplier_name, quote_number, pricing_date, item_number, name, description, category, quantity, unit, unit_price, extended_price, source, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(24)
    .returns<ShopItemRecord[]>()

  const products = !error && itemsData && itemsData.length > 0 ? normalizeShopItems(itemsData) : SAMPLE_PRODUCTS

  return <ShopCatalogExperience products={products} />
}
