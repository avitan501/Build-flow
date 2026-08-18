import type { DepartmentEssentials } from "@/lib/department-essentials"

export type RequestDepartmentConfig = {
  label: string
  essentials: DepartmentEssentials
}

function item(
  name: string,
  imageUrl: string,
  details?: {
    description: string
    features: string[]
    specifications?: Array<{ label: string; value: string }>
  },
) {
  return {
    name,
    imageUrl,
    ...details,
    requestHref: `/request-quote?request=high-end&item=${encodeURIComponent(name)}#request-form`,
  }
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
  "high-end": {
    label: "Take Care of Yourself",
    essentials: {
      spriteUrl: "",
      items: [
        item("Noam2 Shabbat Water Bar", "/images/materials/take-care-of-yourself/noam2-water-bar.webp", {
          description: "A countertop water system with four temperature choices and an automatic Shabbat and Yom Tov operating mode.",
          features: ["Cold, room-temperature, hot, and extra-hot water", "Automatic Shabbat mode with a calendar through 2054", "Direct water-line connection and stainless-steel tanks", "Child-safety control for boiling water"],
          specifications: [{ label: "Size", value: "17.7 in. H x 12.5 in. W x 14 in. D" }, { label: "Hot range", value: "158-203 F" }, { label: "Cold range", value: "39-55 F" }, { label: "Warranty", value: "1-year full-service warranty" }],
        }),
        item("AMNON18 Shabbat Hot Water System", "/images/materials/take-care-of-yourself/amnon18-hot-water-system.webp", {
          description: "An automated controller designed to manage a home's hot-water system for weekday, Shabbat, and Yom Tov use.",
          features: ["Automatic weekly and holiday operation", "Works without an internet connection", "Bluetooth setup and mobile-app access", "Continuous self-diagnostics with on-device alerts"],
          specifications: [{ label: "Compatibility", value: "Electric, gas, oil, indirect, and tankless systems" }, { label: "Controller", value: "Approximately 12 x 12 in." }, { label: "Schedule", value: "Automatic 24/7 operation" }],
        }),
        item("Modern House Numbers - Numbers + Letters", "/images/materials/take-care-of-yourself/modern-house-numbers.webp", {
          description: "Made-to-order architectural address numbers and letters for residences, multifamily buildings, and commercial properties.",
          features: ["Seven typeface choices", "Five weather-resistant finish choices", "Concealed hardware for a floating or flush installation", "Optional horizontal or vertical drilling template"],
          specifications: [{ label: "Material", value: "3/8-in. solid recycled aluminum" }, { label: "Heights", value: "4, 6, 8, 12, or 15 in." }, { label: "Popular size", value: "6 in." }, { label: "Made in", value: "USA" }],
        }),
        item("Warmboard-S Structural Radiant Panel", "/images/materials/take-care-of-yourself/warmboard-s-radiant-panel.webp", {
          description: "A structural subfloor and hydronic radiant-heating panel combined into one installation-ready building component.",
          features: ["Tongue-and-groove structural panel", "Factory-routed channels for radiant tubing", "Aluminum surface transfers heat efficiently", "Supports a wide range of finished flooring"],
          specifications: [{ label: "Panel size", value: "4 x 8 ft." }, { label: "Thickness", value: "1-1/8 in." }, { label: "Tubing", value: "1/2 in. at 12-in. spacing" }, { label: "Construction", value: "7-ply Douglas fir with aluminum surface" }],
        }),
        item("KOHLER Invigoration Linear Steam Head K-32309", "/images/materials/take-care-of-yourself/kohler-k32309-steam-head.webp", {
          description: "A linear steam outlet for a residential steam shower, with an integrated reservoir for adding aromatherapy.",
          features: ["Integrated aromatherapy reservoir", "Multiple KOHLER finish options", "Low-profile linear form", "Designed for the Invigoration steam system"],
          specifications: [{ label: "Model", value: "K-32309" }, { label: "Length", value: "13-3/4 in." }, { label: "Required", value: "Compatible generator and controller, sold separately" }],
        }),
        item("Tesla Wall Connector", "/images/materials/take-care-of-yourself/tesla-wall-connector.webp", {
          description: "A hardwired Level 2 charging station for overnight residential, multifamily, hospitality, or workplace charging.",
          features: ["Charging schedules and usage in the Tesla app", "Adjustable output for different electrical services", "Suitable for indoor or outdoor installation", "Compatible plug options for Tesla and other EVs"],
          specifications: [{ label: "Maximum output", value: "11.5 kW / 48 A" }, { label: "Cable", value: "24 ft." }, { label: "Maximum circuit", value: "60 A" }, { label: "Installation", value: "Hardwired by a qualified electrician" }],
        }),
        item("Diode LED BLAZE Wet-Location Niche Lighting System", "/images/materials/take-care-of-yourself/diode-led-wet-location-niche-lighting.webp", {
          description: "An Avantia-configured wet-location lighting package for shower niches and other damp architectural details.",
          features: ["BLAZE wet-location LED tape", "Diffused aluminum channel and lens", "Driver selected for the tape voltage and project load", "Multiple white color-temperature choices"],
          specifications: [{ label: "Location rating", value: "IP65 wet location" }, { label: "Voltage", value: "12 VDC or 24 VDC" }, { label: "Color quality", value: "90+ CRI" }, { label: "Tape length", value: "16.4-ft. or 100-ft. spool options" }],
        }),
        item("Mustee DURABASE 3232M Fiberglass Shower Base", "/images/materials/take-care-of-yourself/mustee-3232m-shower-base.webp", {
          description: "A compact, one-piece square shower base with a center drain and a reinforced molded-fiberglass body.",
          features: ["Slip-resistant Starburst surface", "Ribbed underside for added strength", "Mold- and mildew-resistant semi-gloss finish", "Works with tile, DURAWALL, or compatible wall kits"],
          specifications: [{ label: "Model", value: "3232M" }, { label: "Size", value: "32 x 32 in." }, { label: "Drain", value: "Center; connects to 2-in. DWV pipe" }, { label: "Threshold", value: "Standard single threshold" }],
        }),
        item("EverScent Smart Home HVAC Fragrance Diffuser", "/images/materials/take-care-of-yourself/everscent-hvac-diffuser.webp", {
          description: "A whole-home scent diffuser that connects to HVAC supply ductwork and distributes fragrance through the existing airflow.",
          features: ["App-controlled schedules and intensity", "Connects to HVAC outflow ductwork", "One device can serve up to 5,000 sq. ft. per HVAC system", "No open flame, added water, or room-by-room plug-ins"],
          specifications: [{ label: "Connection", value: "3/8-in. delivery tube" }, { label: "Network", value: "2.4 / 5 GHz Wi-Fi" }, { label: "Coverage", value: "Up to 5,000 sq. ft." }, { label: "Control", value: "Mobile app" }],
        }),
      ],
    },
  },
}

export function getRequestDepartmentConfig(request: string | null | undefined) {
  return request ? REQUEST_DEPARTMENTS[request] ?? null : null
}
