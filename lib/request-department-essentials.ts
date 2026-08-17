import type { DepartmentEssentials } from "@/lib/department-essentials"

export type RequestDepartmentConfig = {
  label: string
  essentials: DepartmentEssentials
}

function item(name: string, imageUrl: string) {
  return { name, imageUrl }
}

const REQUEST_DEPARTMENTS: Record<string, RequestDepartmentConfig> = {
  plumbing: {
    label: "Plumbing",
    essentials: {
      spriteUrl: "",
      items: [
        item("PVC pipe and fittings", "/images/materials/plumbing.svg"),
        item("PEX tubing and fittings", "/images/materials/plumbing.svg"),
        item("Copper pipe and fittings", "/images/materials/plumbing.svg"),
        item("Shutoff valves", "/images/materials/plumbing.svg"),
        item("Faucets", "/images/materials/photos/plumbing.jpg"),
        item("Toilets", "/images/materials/photos/plumbing.jpg"),
        item("Water heaters", "/images/materials/photos/plumbing.jpg"),
        item("Drain and waste supplies", "/images/materials/photos/plumbing.jpg"),
      ],
    },
  },
  lighting: {
    label: "Lighting",
    essentials: {
      spriteUrl: "",
      items: [
        item("Recessed lights", "/images/materials/lighting.svg"),
        item("Ceiling fixtures", "/images/materials/lighting.svg"),
        item("Vanity lights", "/images/materials/lighting.svg"),
        item("Exterior lights", "/images/materials/lighting.svg"),
        item("LED bulbs", "/images/materials/photos/lighting.jpg"),
        item("Under-cabinet lights", "/images/materials/photos/lighting.jpg"),
        item("Track lighting", "/images/materials/photos/lighting.jpg"),
        item("Switches and dimmers", "/images/materials/photos/lighting.jpg"),
      ],
    },
  },
  insulation: {
    label: "Insulation",
    essentials: {
      spriteUrl: "",
      items: [
        item("Fiberglass batts", "/images/materials/insulation.svg"),
        item("Insulation rolls", "/images/materials/insulation.svg"),
        item("Rigid foam board", "/images/materials/insulation.svg"),
        item("Spray foam", "/images/materials/insulation.svg"),
        item("Mineral wool", "/images/materials/photos/insulation.jpg"),
        item("Soundproofing insulation", "/images/materials/photos/insulation.jpg"),
        item("Vapor barriers", "/images/materials/photos/insulation.jpg"),
        item("Insulation fasteners", "/images/materials/photos/insulation.jpg"),
      ],
    },
  },
  concrete: {
    label: "Concrete & Masonry",
    essentials: {
      spriteUrl: "",
      items: [
        item("Concrete mix", "/images/materials/concrete.svg"),
        item("Mortar mix", "/images/materials/concrete.svg"),
        item("Portland cement", "/images/materials/concrete.svg"),
        item("Concrete blocks", "/images/materials/concrete.svg"),
        item("Rebar", "/images/materials/photos/concrete.jpg"),
        item("Wire mesh", "/images/materials/photos/concrete.jpg"),
        item("Forming supplies", "/images/materials/photos/concrete.jpg"),
        item("Masonry tools", "/images/materials/photos/concrete.jpg"),
      ],
    },
  },
  cabinets: {
    label: "Cabinets & Appliances",
    essentials: {
      spriteUrl: "",
      items: [
        item("Base cabinets", "/images/materials/cabinets.svg"),
        item("Wall cabinets", "/images/materials/cabinets.svg"),
        item("Tall cabinets", "/images/materials/cabinets.svg"),
        item("Cabinet panels", "/images/materials/cabinets.svg"),
        item("Cabinet hardware", "/images/materials/photos/cabinets.jpg"),
        item("Countertops", "/images/materials/photos/kitchen.jpg"),
        item("Kitchen sinks", "/images/materials/photos/kitchen.jpg"),
        item("Appliances", "/images/materials/appliances.svg"),
      ],
    },
  },
  "tool-rental": {
    label: "Tool Rental",
    essentials: {
      spriteUrl: "",
      items: [
        item("Drills and drivers", "/images/materials/tools.svg"),
        item("Circular and miter saws", "/images/materials/tools.svg"),
        item("Concrete tools", "/images/materials/tools.svg"),
        item("Floor sanders", "/images/materials/tools.svg"),
        item("Tile saws", "/images/materials/photos/tools.jpg"),
        item("Ladders and lifts", "/images/materials/photos/tools.jpg"),
        item("Demolition tools", "/images/materials/photos/tools.jpg"),
        item("Compaction equipment", "/images/materials/photos/tools.jpg"),
      ],
    },
  },
}

export function getRequestDepartmentConfig(request: string | null | undefined) {
  return request ? REQUEST_DEPARTMENTS[request] ?? null : null
}
