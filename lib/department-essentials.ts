import type { ShopToolSlug } from "@/lib/shop-tools"

export type DepartmentEssentials = {
  items: string[]
  imageUrl: string
  nextStep: string
}

const ESSENTIALS: Partial<Record<ShopToolSlug, DepartmentEssentials>> = {
  framing: {
    imageUrl: "/images/materials/photos/lumber.jpg",
    items: ["2x4 studs", "2x6 lumber", "Pressure-treated lumber", "Plywood", "OSB sheathing", "Framing lumber", "Deck boards", "Furring strips"],
    nextStep: "Upload the framing plan or lumber list, then confirm quantities in your project.",
  },
  siding: {
    imageUrl: "/images/materials/photos/trim.jpg",
    items: ["Vinyl siding", "Fiber cement siding", "Engineered wood siding", "House wrap / weather barrier", "Siding trim", "Starter strips", "J-channel", "Siding nails / fasteners"],
    nextStep: "Upload exterior elevations or a siding list before requesting pricing.",
  },
  roofing: {
    imageUrl: "/images/materials/photos/roofing.jpg",
    items: ["Roof shingles", "Roof underlayment", "Ice and water shield", "Drip edge", "Roof flashing", "Ridge caps", "Roof vents", "Roofing nails"],
    nextStep: "Upload the roof plan or material list and include the roof area when known.",
  },
  "wood-floor": {
    imageUrl: "/images/materials/photos/flooring.jpg",
    items: ["Hardwood flooring", "Engineered wood flooring", "Laminate flooring", "Flooring underlayment", "Transition strips", "Stair nosing", "Flooring adhesive", "Floor trim / shoe molding"],
    nextStep: "Upload room measurements or use the flooring calculator before requesting pricing.",
  },
  "tile-work": {
    imageUrl: "/images/materials/photos/tile.jpg",
    items: ["Floor tile", "Wall tile", "Cement board / backer board", "Thinset mortar", "Grout", "Tile spacers", "Tile trim", "Waterproofing membrane"],
    nextStep: "Upload the tile schedule or use the thinset calculator to prepare quantities.",
  },
  kitchen: {
    imageUrl: "/images/materials/photos/kitchen.jpg",
    items: ["Kitchen cabinets", "Countertops", "Cabinet hardware", "Kitchen sinks", "Kitchen faucets", "Backsplash tile", "Garbage disposals", "Range hoods"],
    nextStep: "Upload the kitchen layout and appliance schedule before requesting a cabinet quote.",
  },
  window: {
    imageUrl: "/images/materials/photos/windows.jpg",
    items: ["Vinyl windows", "Wood windows", "New construction windows", "Replacement windows", "Patio doors", "Window flashing tape", "Window trim", "Caulk / sealant"],
    nextStep: "Upload the window schedule so sizes and opening types stay attached to the project.",
  },
  eitan: {
    imageUrl: "/images/materials/photos/windows.jpg",
    items: ["Window schedules", "New construction windows", "Replacement windows", "Patio doors", "Window flashing", "Extension jambs", "Interior trim", "Exterior sealant"],
    nextStep: "Upload the complete plan set so the window schedule can be reviewed clearly.",
  },
  "door-and-molding": {
    imageUrl: "/images/materials/photos/trim.jpg",
    items: ["Baseboard molding", "Casing", "Crown molding", "Shoe molding", "Quarter round", "Chair rail", "Door jambs", "Window stools / sills"],
    nextStep: "Upload the door and trim schedule, including profiles and lengths when available.",
  },
  "sheet-rock": {
    imageUrl: "/images/materials/photos/drywall.jpg",
    items: ["Drywall sheets", "Moisture-resistant board", "Joint compound", "Drywall tape", "Corner bead", "Drywall screws", "Metal studs", "Insulation"],
    nextStep: "Upload the floor plan or use the drywall calculator to prepare a takeoff.",
  },
  services: {
    imageUrl: "/images/materials/photos/materials.jpg",
    items: ["Site measurement", "Blueprint takeoff", "Material sourcing", "Quote comparison", "Delivery planning", "Product matching", "Closeout sourcing", "Project coordination"],
    nextStep: "Describe the service you need and attach any plan or supporting list.",
  },
}

export function getDepartmentEssentials(slug: ShopToolSlug): DepartmentEssentials {
  return ESSENTIALS[slug] ?? ESSENTIALS.services!
}
