import type { ShopToolSlug } from "@/lib/shop-tools"

export type DepartmentEssentials = {
  items: Array<string | CatalogEssentialItem>
  spriteUrl: string
}

export type CatalogEssentialItem = {
  name: string
  imageUrl: string
  description?: string
  features?: string[]
  specifications?: Array<{ label: string; value: string }>
  requestHref?: string
}

const ESSENTIALS: Partial<Record<ShopToolSlug, DepartmentEssentials>> = {
  framing: {
    spriteUrl: "/images/department-essentials/lumber-grid.webp",
    items: ["2x4 studs", "2x6 lumber", "Pressure-treated lumber", "Plywood", "OSB sheathing", "Framing lumber", "Deck boards", "Furring strips"],
  },
  siding: {
    spriteUrl: "/images/department-essentials/siding-grid.webp",
    items: ["Vinyl siding", "Fiber cement siding", "Engineered wood siding", "House wrap / weather barrier", "Siding trim", "Starter strips", "J-channel", "Siding nails / fasteners"],
  },
  roofing: {
    spriteUrl: "/images/department-essentials/roofing-grid.webp",
    items: ["Roof shingles", "Roof underlayment", "Ice and water shield", "Drip edge", "Roof flashing", "Ridge caps", "Roof vents", "Roofing nails"],
  },
  electrical: {
    spriteUrl: "",
    items: [
      { name: "GFCI outlets", imageUrl: "/images/materials/catalog/ele-014.jpg" },
      { name: "Light switches", imageUrl: "/images/materials/catalog/ele-015.jpg" },
      { name: "6/3 NM-B electrical wire, 125 ft.", imageUrl: "/images/materials/catalog/ele-016.jpg" },
      { name: "100-amp breaker subpanels", imageUrl: "/images/materials/catalog/ele-017.jpeg" },
      { name: "30-amp double-pole breakers", imageUrl: "/images/materials/catalog/ele-018.jpg" },
      { name: "Three-way light switches", imageUrl: "/images/materials/catalog/ele-019.jpg" },
      { name: "Combination smoke and carbon-monoxide alarms", imageUrl: "/images/materials/catalog/ele-020.jpg" },
      { name: "Kasa HS200 Smart Light Switches (3-Pack)", imageUrl: "/images/materials/catalog/ele-021-kasa-smart-switches.png" },
    ],
  },
  "wood-floor": {
    spriteUrl: "/images/department-essentials/flooring-grid.webp",
    items: ["Hardwood flooring", "Engineered wood flooring", "Laminate flooring", "Flooring underlayment", "Transition strips", "Stair nosing", "Flooring adhesive", "Floor trim / shoe molding"],
  },
  "tile-work": {
    spriteUrl: "/images/department-essentials/tile-grid.webp",
    items: ["Floor tile", "Wall tile", "Cement board / backer board", "Thinset mortar", "Grout", "Tile spacers", "Tile trim", "Waterproofing membrane"],
  },
  kitchen: {
    spriteUrl: "/images/department-essentials/kitchen-grid.webp",
    items: ["Kitchen cabinets", "Countertops", "Cabinet hardware", "Kitchen sinks", "Kitchen faucets", "Backsplash tile", "Garbage disposals", "Range hoods"],
  },
  window: {
    spriteUrl: "/images/department-essentials/windows-grid.webp",
    items: ["Vinyl windows", "Wood windows", "New construction windows", "Replacement windows", "Patio doors", "Window flashing tape", "Window trim", "Caulk / sealant"],
  },
  eitan: {
    spriteUrl: "/images/department-essentials/windows-grid.webp",
    items: ["Window schedules", "New construction windows", "Replacement windows", "Patio doors", "Window flashing", "Extension jambs", "Interior trim", "Exterior sealant"],
  },
  "door-and-molding": {
    spriteUrl: "/images/department-essentials/moldings-grid.webp",
    items: ["Baseboard molding", "Casing", "Crown molding", "Shoe molding", "Quarter round", "Chair rail", "Door jambs", "Window stools / sills"],
  },
  "sheet-rock": {
    spriteUrl: "/images/department-essentials/drywall-grid.webp",
    items: ["Drywall sheets", "Moisture-resistant board", "Joint compound", "Drywall tape", "Corner bead", "Drywall screws", "Metal studs", "Insulation"],
  },
  "concrete-masonry": {
    spriteUrl: "",
    items: [
      { name: "80 lb. concrete mix", imageUrl: "/images/materials/products-real/quikrete-80lb-concrete-mix-real.webp" },
      { name: "80 lb. Type S mortar mix", imageUrl: "/images/materials/products-real/quikrete-type-s-mortar-mix-80lb-real.jpg" },
      { name: "94 lb. Portland cement", imageUrl: "/images/materials/products-real/heidelberg-lehigh-portland-cement-type-i-ii-real.jpg" },
      { name: "8 x 8 x 16 concrete block", imageUrl: "/images/materials/products-real/oldcastle-8x8x16-concrete-block-real.jpg" },
      { name: "#4 steel rebar", imageUrl: "/images/materials/products-real/steel-rebar-half-inch-20ft-real.jpg" },
      { name: "Concrete reinforcing mesh", imageUrl: "/images/materials/products-real/concrete-remesh-sheet-real.jpg" },
      { name: "Concrete form plywood", imageUrl: "/images/materials/products-real/concrete-form-plywood-real.jpg" },
      { name: "Masonry hand tools", imageUrl: "/images/materials/products-real/masonry-tool-set-real.jpg" },
    ],
  },
  services: {
    spriteUrl: "/images/department-essentials/services-grid.webp",
    items: ["Site measurement", "Blueprint takeoff", "Material sourcing", "Quote comparison", "Delivery planning", "Product matching", "Closeout sourcing", "Project coordination"],
  },
}

export function getDepartmentEssentials(slug: ShopToolSlug, catalogItems: CatalogEssentialItem[] = []): DepartmentEssentials {
  if (catalogItems.length === 8) {
    return { spriteUrl: "", items: catalogItems }
  }

  return ESSENTIALS[slug] ?? ESSENTIALS.services!
}
