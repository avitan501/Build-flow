import type { ShopToolSlug } from "@/lib/shop-tools"

export type DepartmentEssentials = {
  items: string[]
  spriteUrl: string
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
  services: {
    spriteUrl: "/images/department-essentials/services-grid.webp",
    items: ["Site measurement", "Blueprint takeoff", "Material sourcing", "Quote comparison", "Delivery planning", "Product matching", "Closeout sourcing", "Project coordination"],
  },
}

export function getDepartmentEssentials(slug: ShopToolSlug): DepartmentEssentials {
  return ESSENTIALS[slug] ?? ESSENTIALS.services!
}
