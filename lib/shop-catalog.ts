import { MATERIAL_REAL_PHOTOS, realPhotoForMaterialCategory } from "@/lib/material-photo-catalog"
import { mapExistingCategoryToShopCategory, suggestShopCategory, type ShopCategoryName, type ShopItemImageRecord, type ShopItemRecord } from "@/lib/shop"

export type ShopProductImage = {
  imageUrl: string
  imageAlt: string
  imageSource: string
  imageLicense: string
  imageCredit: string
  imageCategory: string
}

export type ShopCatalogProduct = {
  id: string
  slug: string
  name: string
  description: string
  shortDescription?: string
  category: string
  unit: string
  price: number
  supplierName: string | null
  quoteNumber: string | null
  image: string
  imageUrl: string
  imageAlt: string
  imageSource: string
  imageLicense: string
  imageCredit: string
  imageCategory: string
  gallery: ShopProductImage[]
  specLine: string
  availability: string
  featuredLabel: string
  popularUse: string
  reviewLabel: string
  rating: number
  relatedCategories: string[]
  productType?: "material" | "service"
  detailBullets?: string[]
}

type ProductSeed = Omit<ShopCatalogProduct, "id">

const LOCAL_IMAGE_SOURCE = "Avantia Build local placeholder"
const LOCAL_IMAGE_LICENSE = "Avantia Build placeholder asset"
const LOCAL_IMAGE_CREDIT = "Avantia Build"
const LOCAL_PRODUCT_IMAGE_SOURCE = "Home Depot Canada supplier product photo"
const LOCAL_PRODUCT_IMAGE_LICENSE = "Third-party supplier product photo"

type ProductImageOverride = {
  imageUrl: string
  imageAlt: string
  imageCategory: string
  imageSource?: string
  imageLicense?: string
  imageCredit?: string
}

const PRODUCT_IMAGE_OVERRIDES_BY_SLUG: Record<string, ProductImageOverride> = {
  "mapei-ultraflex-1-white-thinset-tile-mortar": {
    imageUrl: "/images/materials/products-real/mapei-ultraflex-thinset.jpg",
    imageAlt: "White thinset tile mortar bag on a clean product background",
    imageCategory: "Tile",
    imageSource: "Generated with OpenAI imagegen for Avantia Build",
    imageLicense: "Project-owned generated image",
    imageCredit: "OpenAI imagegen",
  },
  "yardas-fine-sand": {
    imageUrl: "/images/materials/products-real/yardas-fine-sand.jpg",
    imageAlt: "Fine sand bag for tile prep on a clean product background",
    imageCategory: "Tile",
    imageSource: "Generated with OpenAI imagegen for Avantia Build",
    imageLicense: "Project-owned generated image",
    imageCredit: "OpenAI imagegen",
  },
  "heidelberg-materials-lehigh-portland-cement-type-i-ii": {
    imageUrl: "/images/materials/products-real/lehigh-portland-cement-type-i-ii.jpg",
    imageAlt: "Portland cement bag for tile prep on a clean product background",
    imageCategory: "Tile",
    imageSource: "Generated with OpenAI imagegen for Avantia Build",
    imageLicense: "Project-owned generated image",
    imageCredit: "OpenAI imagegen",
  },
  "tile-underlayment-paper-for-plywood": {
    imageUrl: "/images/materials/products-real/tile-underlayment-paper.jpg",
    imageAlt: "Underlayment paper roll for plywood tile prep on a clean product background",
    imageCategory: "Tile",
    imageSource: "Generated with OpenAI imagegen for Avantia Build",
    imageLicense: "Project-owned generated image",
    imageCredit: "OpenAI imagegen",
  },
  "tile-wire-mesh-for-mortar-bed": {
    imageUrl: "/images/materials/products-real/tile-wire-mesh-v2.jpg",
    imageAlt: "Galvanized wire mesh for tile mortar bed prep on a clean product background",
    imageCategory: "Tile",
    imageSource: "Generated with OpenAI imagegen for Avantia Build",
    imageLicense: "Project-owned generated image",
    imageCredit: "OpenAI imagegen",
  },
  "cement-board-5x3": {
    imageUrl: "/images/materials/products-real/cement-board-5x3.jpg",
    imageAlt: "Cement backer board panel for tile substrate on a clean product background",
    imageCategory: "Tile",
    imageSource: "Generated with OpenAI imagegen for Avantia Build",
    imageLicense: "Project-owned generated image",
    imageCredit: "OpenAI imagegen",
  },
  "white-shaker-kitchen-cabinet-package": {
    imageUrl: "/images/materials/products-real/kitchen-cabinets.jpg",
    imageAlt: "White shaker and natural wood kitchen cabinet showroom display",
    imageCategory: "Cabinets",
    imageSource: "Generated with OpenAI imagegen for Avantia Build",
    imageLicense: "Project-owned generated image",
    imageCredit: "OpenAI imagegen",
  },
  "european-slab-kitchen-cabinet-package": {
    imageUrl: "/images/materials/products-real/kitchen-cabinets.jpg",
    imageAlt: "European slab kitchen cabinetry showroom display",
    imageCategory: "Cabinets",
    imageSource: "Generated with OpenAI imagegen for Avantia Build",
    imageLicense: "Project-owned generated image",
    imageCredit: "OpenAI imagegen",
  },
  "kitchen-cabinet-design-review": {
    imageUrl: "/images/materials/products-real/kitchen-cabinets.jpg",
    imageAlt: "Kitchen cabinetry design review showroom display",
    imageCategory: "Cabinets",
    imageSource: "Generated with OpenAI imagegen for Avantia Build",
    imageLicense: "Project-owned generated image",
    imageCredit: "OpenAI imagegen",
  },
  "2x4-premium-lumber": {
    imageUrl: "/images/materials/products-real/2x4-premium-lumber.jpg",
    imageAlt: "Single 2x4 lumber board on white background",
    imageCategory: "Lumber",
  },
  "2x8-treated-lumber": {
    imageUrl: "/images/materials/products-real/2x8-treated-lumber.jpg",
    imageAlt: "Single pressure-treated 2x8 lumber board on white background",
    imageCategory: "Lumber",
  },
  "cdx-plywood-sheet": {
    imageUrl: "/images/materials/products-real/cdx-plywood-sheet.jpg",
    imageAlt: "Single plywood sheet on white background",
    imageCategory: "Plywood",
  },
  "lvl-beam-header": {
    imageUrl: "/images/materials/products-real/lvl-beam-header.jpg",
    imageAlt: "Single LVL beam on white background",
    imageCategory: "Lumber",
  },
  "galvanized-joist-hanger": {
    imageUrl: "/images/materials/products-real/galvanized-joist-hanger.jpg",
    imageAlt: "Galvanized U-shaped joist hanger on white background",
    imageCategory: "Hardware",
  },
  "collated-framing-nails": {
    imageUrl: "/images/materials/products-real/collated-framing-nails.jpg",
    imageAlt: "Collated framing nails on white background",
    imageCategory: "Hardware",
  },
  "subfloor-adhesive-tube": {
    imageUrl: "/images/materials/products-real/subfloor-adhesive-tube.jpg",
    imageAlt: "Subfloor adhesive tube on white background",
    imageCategory: "Hardware",
  },
  "flashing-roll": {
    imageUrl: "/images/materials/products-real/flashing-roll.jpg",
    imageAlt: "Flashing roll on white background",
    imageCategory: "Roofing",
  },
  "view-as-built-lidar-capture": {
    imageUrl: "/images/materials/products/view-as-built-lidar-capture.svg",
    imageAlt: "LiDAR scanner icon projecting a floor plan and point cloud",
    imageCategory: "Services",
    imageSource: "Avantia Build local SVG icon",
    imageLicense: "Avantia Build original icon",
    imageCredit: "Avantia Build",
  },
}

const PRODUCT_IMAGE_OVERRIDES_BY_NAME: Record<string, ProductImageOverride> = {
  "2x4 premium lumber": PRODUCT_IMAGE_OVERRIDES_BY_SLUG["2x4-premium-lumber"],
  "2x8 treated lumber": PRODUCT_IMAGE_OVERRIDES_BY_SLUG["2x8-treated-lumber"],
  "cdx plywood": PRODUCT_IMAGE_OVERRIDES_BY_SLUG["cdx-plywood-sheet"],
  "lvl beam": PRODUCT_IMAGE_OVERRIDES_BY_SLUG["lvl-beam-header"],
  "galvanized joist hanger": PRODUCT_IMAGE_OVERRIDES_BY_SLUG["galvanized-joist-hanger"],
  "collated framing nails": PRODUCT_IMAGE_OVERRIDES_BY_SLUG["collated-framing-nails"],
  "subfloor adhesive": PRODUCT_IMAGE_OVERRIDES_BY_SLUG["subfloor-adhesive-tube"],
  "flashing roll": PRODUCT_IMAGE_OVERRIDES_BY_SLUG["flashing-roll"],
}

export const MATERIAL_IMAGE_CATEGORIES = [
  "Services",
  "Lumber",
  "Plywood",
  "Drywall",
  "Concrete",
  "Roofing",
  "Insulation",
  "Hardware",
  "Electrical",
  "Plumbing",
  "Tools",
  "Doors",
  "Trim",
  "Windows",
  "Flooring",
  "Appliances",
  "Glass",
  "Lighting",
  "Tile",
  "Cabinets",
  "Materials",
] as const

const MATERIAL_PLACEHOLDER_BY_CATEGORY: Record<(typeof MATERIAL_IMAGE_CATEGORIES)[number], string> = {
  Services: "/images/materials/services.svg",
  Lumber: "/images/materials/lumber.svg",
  Plywood: "/images/materials/plywood.svg",
  Drywall: "/images/materials/drywall.svg",
  Concrete: "/images/materials/concrete.svg",
  Roofing: "/images/materials/roofing.svg",
  Insulation: "/images/materials/insulation.svg",
  Hardware: "/images/materials/hardware.svg",
  Electrical: "/images/materials/electrical.svg",
  Plumbing: "/images/materials/plumbing.svg",
  Tools: "/images/materials/tools.svg",
  Doors: "/images/materials/doors.svg",
  Trim: "/images/materials/trim.svg",
  Windows: "/images/materials/windows.svg",
  Flooring: "/images/materials/flooring.svg",
  Appliances: "/images/materials/appliances.svg",
  Glass: "/images/materials/glass.svg",
  Lighting: "/images/materials/lighting.svg",
  Tile: "/images/materials/tile.svg",
  Cabinets: "/images/materials/cabinets.svg",
  Materials: "/images/materials/materials.svg",
}

const CATEGORY_ALIASES: Record<string, (typeof MATERIAL_IMAGE_CATEGORIES)[number]> = {
  service: "Services",
  services: "Services",
  survey: "Services",
  surveys: "Services",
  stakeout: "Services",
  adhesive: "Hardware",
  adhesives: "Hardware",
  cabinet: "Cabinets",
  cabinets: "Cabinets",
  cabinetry: "Cabinets",
  kitchen: "Cabinets",
  concrete: "Concrete",
  door: "Doors",
  doors: "Doors",
  drywall: "Drywall",
  electric: "Electrical",
  electrical: "Electrical",
  fastener: "Hardware",
  fasteners: "Hardware",
  flashing: "Roofing",
  floor: "Flooring",
  flooring: "Flooring",
  faucet: "Plumbing",
  glass: "Glass",
  hanger: "Hardware",
  hangers: "Hardware",
  hardware: "Hardware",
  insulation: "Insulation",
  lighting: "Lighting",
  light: "Lighting",
  lumber: "Lumber",
  "lvl beam": "Lumber",
  "lvl beams": "Lumber",
  materials: "Materials",
  miscellaneous: "Materials",
  moulding: "Trim",
  plumbing: "Plumbing",
  plywood: "Plywood",
  roofing: "Roofing",
  tile: "Tile",
  "tile work": "Tile",
  tools: "Tools",
  treated: "Lumber",
  "treated lumber": "Lumber",
  trim: "Trim",
  toilet: "Plumbing",
  window: "Windows",
  windows: "Windows",
  framing: "Lumber",
  "sheet rock": "Drywall",
  carpentry: "Trim",
  exterior: "Roofing",
}

function normalizeCategoryKey(category: string | null | undefined) {
  return (category ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

export function imageCategoryForMaterial(category: string | null | undefined): (typeof MATERIAL_IMAGE_CATEGORIES)[number] {
  const normalized = normalizeCategoryKey(category)
  if (CATEGORY_ALIASES[normalized]) {
    return CATEGORY_ALIASES[normalized]
  }

  const mappedCategory = mapExistingCategoryToShopCategory(category)
  return CATEGORY_ALIASES[normalizeCategoryKey(mappedCategory)] ?? "Materials"
}

export function fallbackImageForCategory(category: string | null | undefined) {
  const imageCategory = imageCategoryForMaterial(category)
  return MATERIAL_REAL_PHOTOS[imageCategory]?.imageUrl ?? MATERIAL_PLACEHOLDER_BY_CATEGORY[imageCategory]
}

export const MATERIAL_REAL_PHOTO_OPTIONS = Object.entries(MATERIAL_REAL_PHOTOS).map(([category, image]) => ({
  category,
  ...image,
}))

function isSupportedMaterialImageUrl(value: string | null | undefined) {
  const next = value?.trim() || ""
  if (!next) return false
  if (next.startsWith("data:image/")) return true
  if (/^https?:\/\//i.test(next)) return false
  if (next.startsWith("/images/materials/products/") || next.startsWith("/images/materials/products-real/")) return true
  if (!next.startsWith("/images/materials/")) return false
  return !next.endsWith(".svg")
}

function buildImageMetadata(params: {
  name: string
  category: string | null | undefined
  imageUrl?: string | null
  imageAlt?: string | null
  imageSource?: string | null
  imageLicense?: string | null
  imageCredit?: string | null
  imageCategory?: string | null
}): ShopProductImage {
  const imageCategory = imageCategoryForMaterial(params.imageCategory || params.category)
  const fallbackPhoto = realPhotoForMaterialCategory(imageCategory)
  const fallbackUrl = fallbackPhoto?.imageUrl ?? MATERIAL_PLACEHOLDER_BY_CATEGORY[imageCategory]
  const hasSupportedImage = isSupportedMaterialImageUrl(params.imageUrl)
  const imageUrl = hasSupportedImage ? params.imageUrl!.trim() : fallbackUrl

  return {
    imageUrl,
    imageAlt: hasSupportedImage ? params.imageAlt?.trim() || fallbackPhoto?.imageAlt || `${params.name} material image` : fallbackPhoto?.imageAlt || `${params.name} material image`,
    imageSource: hasSupportedImage ? params.imageSource?.trim() || fallbackPhoto?.imageSource || LOCAL_IMAGE_SOURCE : fallbackPhoto?.imageSource || LOCAL_IMAGE_SOURCE,
    imageLicense: hasSupportedImage ? params.imageLicense?.trim() || fallbackPhoto?.imageLicense || LOCAL_IMAGE_LICENSE : fallbackPhoto?.imageLicense || LOCAL_IMAGE_LICENSE,
    imageCredit: hasSupportedImage ? params.imageCredit?.trim() || fallbackPhoto?.imageCredit || LOCAL_IMAGE_CREDIT : fallbackPhoto?.imageCredit || LOCAL_IMAGE_CREDIT,
    imageCategory: hasSupportedImage ? params.imageCategory?.trim() || fallbackPhoto?.imageCategory || imageCategory : fallbackPhoto?.imageCategory || imageCategory,
  }
}

export function placeholderImageMetadata(category: string | null | undefined, name = category || "Miscellaneous"): ShopProductImage {
  return buildImageMetadata({ name, category })
}

function normalizeProductImageOverrideKey(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase()
}

function productSpecificImageOverride(params: { slug?: string | null; name?: string | null }) {
  const bySlug = params.slug ? PRODUCT_IMAGE_OVERRIDES_BY_SLUG[params.slug] : undefined
  if (bySlug) return bySlug
  return PRODUCT_IMAGE_OVERRIDES_BY_NAME[normalizeProductImageOverrideKey(params.name)]
}

function productSpecificImageMetadata(params: { slug?: string | null; name: string; category: string | null | undefined }) {
  const override = productSpecificImageOverride(params)
  if (!override) return null

  return buildImageMetadata({
    name: params.name,
    category: params.category,
    imageUrl: override.imageUrl,
    imageAlt: override.imageAlt,
    imageSource: override.imageSource ?? LOCAL_PRODUCT_IMAGE_SOURCE,
    imageLicense: override.imageLicense ?? LOCAL_PRODUCT_IMAGE_LICENSE,
    imageCredit: override.imageCredit ?? LOCAL_IMAGE_CREDIT,
    imageCategory: override.imageCategory,
  })
}

function normalizeGalleryImages(images: Array<ShopItemImageRecord | Partial<ShopProductImage> | null | undefined>, fallbackName: string, fallbackCategory: string | null | undefined) {
  return images
    .filter(Boolean)
    .map((image) =>
      buildImageMetadata({
        name: fallbackName,
        category: fallbackCategory,
        imageUrl: image?.imageUrl ?? null,
        imageAlt: image?.imageAlt ?? null,
        imageSource: image?.imageSource ?? null,
        imageLicense: image?.imageLicense ?? null,
        imageCredit: image?.imageCredit ?? null,
        imageCategory: image?.imageCategory ?? null,
      }),
    )
}

function galleryForProduct(primary: ShopProductImage, category: string | null | undefined, extraImages: Array<ShopItemImageRecord | Partial<ShopProductImage> | null | undefined> = [], fallbackName = category || "Miscellaneous") {
  const images = [primary, ...normalizeGalleryImages(extraImages, fallbackName, category)]

  return images.filter((image, index, all) => all.findIndex((candidate) => candidate.imageUrl === image.imageUrl) === index)
}

function relatedCategoriesFor(category: ShopCategoryName) {
  switch (category) {
    case "Services":
      return ["Services", "Framing"]
    case "Framing":
      return ["Framing", "Exterior", "Carpentry"]
    case "Tile work":
      return ["Tile work", "Carpentry", "Miscellaneous"]
    case "Sheet rock":
      return ["Sheet rock", "Carpentry", "Miscellaneous"]
    case "Kitchen":
      return ["Kitchen", "Carpentry", "Tile work"]
    case "Eitan":
      return ["Eitan", "Framing", "Carpentry"]
    case "Carpentry":
      return ["Carpentry", "Exterior", "Tile work"]
    case "Exterior":
      return ["Exterior", "Framing", "Carpentry"]
    default:
      return ["Miscellaneous", "Framing", "Carpentry"]
  }
}

const PRODUCT_SEED_INPUTS = [
  {
    slug: "stakeout-foundations",
    name: "Stakeout Foundations",
    description: "We mark the exact foundation location on site before construction begins, helping the builder place footings, walls, and foundation work according to the approved plans.",
    shortDescription: "Marks the foundation location on site before construction starts.",
    category: "Services",
    unit: "Per service",
    price: 850,
    supplierName: "Avantia Build survey services",
    quoteNumber: "SRV-STK-001",
    specLine: "Foundation stakeout before concrete and footing work begins",
    featuredLabel: "Field layout service",
    popularUse: "Foundation layout",
    reviewLabel: "Service",
    rating: 5,
    relatedCategories: ["Services", "Framing"],
    productType: "service",
    detailBullets: [
      "Foundation corners and primary layout points marked on site",
      "Helps footings and walls start in the approved location",
      "Useful before excavation, formwork, and concrete placement",
    ],
  },
  {
    slug: "under-construction-survey-for-structures",
    name: "Under Construction Survey for Structures",
    description: "A progress survey performed while the structure is being built to confirm location, layout, and construction alignment before the project continues too far.",
    shortDescription: "Confirms the structure is being built in the correct location during construction.",
    category: "Services",
    unit: "Per service",
    price: 800,
    supplierName: "Avantia Build survey services",
    quoteNumber: "SRV-UCS-002",
    specLine: "Mid-project alignment and location check during active construction",
    featuredLabel: "Progress verification",
    popularUse: "Structure layout confirmation",
    reviewLabel: "Service",
    rating: 5,
    relatedCategories: ["Services", "Framing"],
    productType: "service",
    detailBullets: [
      "Confirms structure location before the project advances too far",
      "Helps catch layout drift while corrections are still manageable",
      "Useful during framing or structural progress milestones",
    ],
  },
  {
    slug: "final-survey",
    name: "Final Survey",
    description: "A completed as-built survey showing the final location of the structure and site improvements after construction is finished, often needed for closing, permits, or final approvals.",
    shortDescription: "Shows the completed structure and site improvements after the work is finished.",
    category: "Services",
    unit: "Per service",
    price: 950,
    supplierName: "Avantia Build survey services",
    quoteNumber: "SRV-FNL-003",
    specLine: "As-built survey for final approvals, permits, and closing needs",
    featuredLabel: "Closing ready",
    popularUse: "Final approvals",
    reviewLabel: "Service",
    rating: 5,
    relatedCategories: ["Services", "Framing"],
    productType: "service",
    detailBullets: [
      "Documents final structure and site improvement locations",
      "Useful for permit closeout, lender requests, and final approvals",
      "Presents a clean end-of-project site position record",
    ],
  },
  {
    slug: "view-as-built-lidar-capture",
    name: "View As-Built LiDAR Capture",
    description: "Professional LiDAR capture for active construction, renovations, commercial spaces, showrooms, and facilities. One site visit can produce a hosted 3D tour, 2D floor plans, AutoCAD .DWG, Revit .RVT, and E57 point cloud files.",
    shortDescription: "LiDAR site capture for 3D tours, floor plans, CAD, BIM, and point cloud files.",
    category: "Services",
    unit: "Custom quote",
    price: 0,
    supplierName: "View As-Built",
    quoteNumber: "https://viewasbuilt.com",
    specLine: "LiDAR as-built documentation package with tour, plans, CAD, BIM, and point cloud options",
    featuredLabel: "3D site capture",
    popularUse: "As-built documentation",
    reviewLabel: "Service",
    rating: 5,
    relatedCategories: ["Services", "Framing"],
    productType: "service",
    detailBullets: [
      "Captures job-site conditions for construction, remodel, commercial, retail, facility, and real estate workflows",
      "Deliverables can include hosted 3D tours, 2D plans, AutoCAD .DWG, Revit .RVT, E57 point cloud data, and 4K stills",
      "Useful for pre-drywall documentation, existing-condition records, design coordination, and long-term as-built access",
    ],
  },
  {
    slug: "white-shaker-kitchen-cabinet-package",
    name: "White Shaker Kitchen Cabinet Package",
    description: "Builder-ready kitchen cabinet package for white shaker layouts, including cabinet style review, finish notes, hardware coordination, and plan-based quoting.",
    shortDescription: "White shaker cabinet package for plan-based quoting.",
    category: "Kitchen",
    unit: "Custom quote",
    price: 0,
    supplierName: "Avantia Build kitchen desk",
    quoteNumber: "Kitchen package",
    specLine: "White shaker cabinetry - plan and design spec review",
    featuredLabel: "Cabinet package",
    popularUse: "Kitchen cabinetry",
    reviewLabel: "Quote first",
    rating: 5,
    relatedCategories: ["Kitchen", "Carpentry"],
    detailBullets: [
      "Upload the kitchen plan before ordering",
      "Review cabinet style, finish, hardware, and appliance openings",
      "Final quote depends on confirmed layout and design spec",
    ],
  },
  {
    slug: "european-slab-kitchen-cabinet-package",
    name: "European Slab Kitchen Cabinet Package",
    description: "Modern slab cabinet package for clean kitchen designs, coordinated from plan, design spec, finish direction, and appliance schedule.",
    shortDescription: "Modern slab cabinet package for kitchen layouts.",
    category: "Kitchen",
    unit: "Custom quote",
    price: 0,
    supplierName: "Avantia Build kitchen desk",
    quoteNumber: "Kitchen package",
    specLine: "European slab cabinetry - plan and design spec review",
    featuredLabel: "Modern cabinet package",
    popularUse: "Kitchen cabinetry",
    reviewLabel: "Quote first",
    rating: 5,
    relatedCategories: ["Kitchen", "Carpentry"],
    detailBullets: [
      "Best reviewed with plan dimensions and appliance notes",
      "Confirm slab finish, edge pulls, hardware, and panel details",
      "Final quote is prepared after the design spec is checked",
    ],
  },
  {
    slug: "kitchen-cabinet-design-review",
    name: "Kitchen Cabinet Design Review",
    description: "Pre-order review for cabinet layout, design spec, finish selection, hardware, appliance clearances, and missing plan information.",
    shortDescription: "Review kitchen plan and cabinet design spec before quote.",
    category: "Kitchen",
    unit: "Review",
    price: 0,
    supplierName: "Avantia Build kitchen desk",
    quoteNumber: "Design review",
    specLine: "Plan, elevations, finish schedule, and appliance notes",
    featuredLabel: "Upload first",
    popularUse: "Plan review",
    reviewLabel: "Required before order",
    rating: 5,
    relatedCategories: ["Kitchen", "Carpentry", "Tile work"],
    detailBullets: [
      "Checks whether the plan and design spec are complete enough to quote",
      "Flags missing dimensions, appliance openings, finish choices, and hardware notes",
      "Keeps the kitchen package connected to the selected project",
    ],
  },
  {
    slug: "eitan-item-1",
    name: "Eitan Item 1",
    description: "Custom Eitan shop item reserved for project-specific material selection and quote review.",
    shortDescription: "Custom Eitan material item for project quote review.",
    category: "Eitan",
    unit: "Custom quote",
    price: 0,
    supplierName: "Eitan",
    quoteNumber: "EITAN-001",
    specLine: "Eitan custom item - confirm exact spec before ordering",
    featuredLabel: "Eitan",
    popularUse: "Project material selection",
    reviewLabel: "Quote first",
    rating: 5,
    relatedCategories: ["Eitan", "Framing", "Carpentry"],
    detailBullets: [
      "Confirm final product spec before ordering",
      "Attach the item to the selected project for quote review",
      "Use when the Eitan material list calls for this item",
    ],
  },
  {
    slug: "eitan-item-2",
    name: "Eitan Item 2",
    description: "Second custom Eitan shop item for grouping project material requests in one department.",
    shortDescription: "Second custom Eitan material item for project quotes.",
    category: "Eitan",
    unit: "Custom quote",
    price: 0,
    supplierName: "Eitan",
    quoteNumber: "EITAN-002",
    specLine: "Eitan custom item - verify quantity and field condition",
    featuredLabel: "Eitan",
    popularUse: "Project material selection",
    reviewLabel: "Quote first",
    rating: 5,
    relatedCategories: ["Eitan", "Framing", "Carpentry"],
    detailBullets: [
      "Confirm quantity before quote approval",
      "Use project notes to describe the exact field need",
      "Final pricing depends on confirmed material details",
    ],
  },
  {
    slug: "eitan-item-3",
    name: "Eitan Item 3",
    description: "Third custom Eitan shop item for project-specific material requests and quote preparation.",
    shortDescription: "Third custom Eitan material item for quote preparation.",
    category: "Eitan",
    unit: "Custom quote",
    price: 0,
    supplierName: "Eitan",
    quoteNumber: "EITAN-003",
    specLine: "Eitan custom item - quote after review",
    featuredLabel: "Eitan",
    popularUse: "Project material selection",
    reviewLabel: "Quote first",
    rating: 5,
    relatedCategories: ["Eitan", "Framing", "Carpentry"],
    detailBullets: [
      "Keep material notes attached to the project",
      "Review scope before sending the quote request",
      "Use as a placeholder until the exact item spec is provided",
    ],
  },
  {
    slug: "2x4-premium-lumber",
    name: "2x4 Premium Lumber",
    description: "Kiln-dried framing lumber for clean residential wall framing and interior structural work.",
    category: "Framing",
    unit: "Each - 8 ft",
    price: 7.95,
    supplierName: "Avantia Build sample catalog",
    quoteNumber: "CAT-LUM-204",
    specLine: "#2 SPF - kiln dried - framing",
    featuredLabel: "Popular for framing",
    popularUse: "Wall framing",
    reviewLabel: "4.8 - 124 reviews",
    rating: 4.8,
    relatedCategories: ["Framing", "Exterior"],
  },
  {
    slug: "2x8-treated-lumber",
    name: "2x8 Treated Lumber",
    description: "Pressure-treated board suited for exterior framing, deck bases, and moisture-prone structural areas.",
    category: "Framing",
    unit: "Each - 12 ft",
    price: 23.4,
    supplierName: "Avantia Build sample catalog",
    quoteNumber: "CAT-TRL-208",
    specLine: "Ground contact rated - exterior use",
    featuredLabel: "Deck & exterior",
    popularUse: "Deck framing",
    reviewLabel: "4.7 - 89 reviews",
    rating: 4.7,
    relatedCategories: ["Framing", "Exterior"],
  },
  {
    slug: "cdx-plywood-sheet",
    name: "CDX Plywood",
    description: "General-purpose structural plywood sheet for roof, wall, and subfloor sheathing applications.",
    category: "Framing",
    unit: "Sheet - 4x8",
    price: 34.75,
    supplierName: "Avantia Build sample catalog",
    quoteNumber: "CAT-PLY-001",
    specLine: "5/8 in - structural sheathing",
    featuredLabel: "Popular for framing",
    popularUse: "Wall & roof sheathing",
    reviewLabel: "4.9 - 201 reviews",
    rating: 4.9,
    relatedCategories: ["Framing", "Carpentry"],
  },
  {
    slug: "lvl-beam-header",
    name: "LVL Beam",
    description: "Engineered laminated veneer lumber beam for long spans, headers, and high-load framing zones.",
    category: "Framing",
    unit: "Each - 1-3/4 x 11-7/8 x 16 ft",
    price: 118.2,
    supplierName: "Avantia Build sample catalog",
    quoteNumber: "CAT-LVL-118",
    specLine: "Engineered span member - header ready",
    featuredLabel: "Structural",
    popularUse: "Headers & long spans",
    reviewLabel: "4.9 - 54 reviews",
    rating: 4.9,
    relatedCategories: ["Framing", "Carpentry"],
  },
  {
    slug: "galvanized-joist-hanger",
    name: "Galvanized Joist Hanger",
    description: "Heavy-duty galvanized hanger for fastening joists securely into beams or ledger assemblies.",
    category: "Framing",
    unit: "Each",
    price: 4.85,
    supplierName: "Avantia Build sample catalog",
    quoteNumber: "CAT-HNG-210",
    specLine: "Galvanized steel - ledger/beam mount",
    featuredLabel: "Framing essential",
    popularUse: "Joist connections",
    reviewLabel: "4.8 - 77 reviews",
    rating: 4.8,
    relatedCategories: ["Framing", "Exterior"],
  },
  {
    slug: "collated-framing-nails",
    name: "Collated Framing Nails",
    description: "Collated framing nails for pneumatic framing tools, sized for efficient structural fastening.",
    category: "Framing",
    unit: "Box",
    price: 42.1,
    supplierName: "Avantia Build sample catalog",
    quoteNumber: "CAT-FST-501",
    specLine: "Paper tape collated - framing gun ready",
    featuredLabel: "Popular for framing",
    popularUse: "Stud and plate fastening",
    reviewLabel: "4.7 - 148 reviews",
    rating: 4.7,
    relatedCategories: ["Framing", "Exterior"],
  },
  {
    slug: "subfloor-adhesive-tube",
    name: "Subfloor Adhesive",
    description: "High-grab construction adhesive designed to reduce squeaks and improve panel hold on floors.",
    category: "Framing",
    unit: "Tube - 28 oz",
    price: 6.45,
    supplierName: "Avantia Build sample catalog",
    quoteNumber: "CAT-ADH-028",
    specLine: "High strength bond - subfloor rated",
    featuredLabel: "Jobsite staple",
    popularUse: "Subfloor installs",
    reviewLabel: "4.6 - 63 reviews",
    rating: 4.6,
    relatedCategories: ["Framing", "Tile work"],
  },
  {
    slug: "mapei-ultraflex-1-white-thinset-tile-mortar",
    name: "MAPEI UltraFlex 1 White Thinset Tile Mortar",
    description: "50 lb white polymer-modified thinset tile mortar. For ceramic and most natural stone; use on floors and walls; mix with water.",
    shortDescription: "50 lb white polymer-modified thinset mortar for tile work.",
    category: "Tile work",
    unit: "50 lb bag",
    price: 17.98,
    supplierName: "Lowe's",
    quoteNumber: "Item #193422 / Model #2905736",
    specLine: "50 lb - white - polymer-modified thinset",
    featuredLabel: "Thinset mortar",
    popularUse: "Tile setting",
    reviewLabel: "4.7 - 547 reviews",
    rating: 4.7,
    relatedCategories: ["Tile work", "Carpentry"],
    detailBullets: [
      "For use with ceramic and most natural stone",
      "Mix with water; no additive required",
      "Use on floors and walls",
      "Exceeds ANSI A118.4 and ANSI A118.11 bond strength requirements",
    ],
  },
  {
    slug: "yardas-fine-sand",
    name: "Yardas Fine Sand",
    description: "Fine sand for tile preparation, mud work, leveling mixes, and jobsite material needs where clean fine aggregate is required.",
    shortDescription: "Fine sand for tile prep and mud mix work.",
    category: "Tile work",
    unit: "Bag",
    price: 6.58,
    supplierName: "Lowe's / Instacart market baseline",
    quoteNumber: "Sakrete 0.5-cu ft 50 lb sand baseline",
    specLine: "Fine/all-purpose sand - 50 lb comparable baseline",
    featuredLabel: "Tile prep",
    popularUse: "Mud work and leveling",
    reviewLabel: "Quote first",
    rating: 4.7,
    relatedCategories: ["Tile work", "Concrete"],
    detailBullets: [
      "Use for tile prep where fine sand is specified",
      "Confirm bag size, mix ratio, and installer preference before ordering",
      "Match the plan or field condition before adding quantity",
    ],
  },
  {
    slug: "heidelberg-materials-lehigh-portland-cement-type-i-ii",
    name: "Heidelberg Materials Lehigh Portland Cement Type I-II",
    description: "Portland cement Type I-II for tile prep mixes, mortar beds, and cement-based jobsite mixes where specified by the installer.",
    shortDescription: "Type I-II Portland cement for cement-based tile prep mixes.",
    category: "Tile work",
    unit: "Bag",
    price: 15,
    supplierName: "Pedra Rustica market baseline",
    quoteNumber: "Lehigh Portland Cement Type I/II - 94 lb",
    specLine: "Portland cement Type I-II - 94 lb bag",
    featuredLabel: "Mortar bed material",
    popularUse: "Mud bed mixes",
    reviewLabel: "Quote first",
    rating: 4.7,
    relatedCategories: ["Tile work", "Concrete"],
    detailBullets: [
      "Use only where Portland cement is part of the specified tile prep mix",
      "Confirm Type I-II requirement with the installer or spec",
      "Coordinate with sand and additive requirements before ordering",
    ],
  },
  {
    slug: "tile-underlayment-paper-for-plywood",
    name: "Tile Underlayment Paper for Plywood",
    description: "Paper underlayment layer used over plywood before tile prep assemblies where the installer calls for paper below wire mesh or mortar bed work.",
    shortDescription: "Paper layer for plywood before tile prep assemblies.",
    category: "Tile work",
    unit: "Roll",
    price: 23.99,
    supplierName: "Tools4Flooring market baseline",
    quoteNumber: "Fortifiber Aquabar B - 500 sq ft roll",
    specLine: "Aquabar B underlayment paper - 500 sq ft roll",
    featuredLabel: "Plywood prep",
    popularUse: "Under tile prep",
    reviewLabel: "Quote first",
    rating: 4.7,
    relatedCategories: ["Tile work", "Carpentry"],
    detailBullets: [
      "Used as a prep layer over plywood where specified",
      "Commonly coordinated with wire mesh or mortar bed assemblies",
      "Confirm paper type and coverage before ordering",
    ],
  },
  {
    slug: "tile-wire-mesh-for-mortar-bed",
    name: "Tile Wire Mesh for Mortar Bed",
    description: "Wire mesh reinforcement for tile prep assemblies, typically installed over prepared plywood before mortar bed or mud work where specified.",
    shortDescription: "Wire mesh reinforcement for tile prep over plywood.",
    category: "Tile work",
    unit: "Sheet - 27 in x 96 in",
    price: 21.37,
    supplierName: "Menards market baseline",
    quoteNumber: "2.5 galvanized metal lath comparable",
    specLine: "Galvanized wire mesh / metal lath - 27 in x 96 in",
    featuredLabel: "Mortar bed prep",
    popularUse: "Tile substrate prep",
    reviewLabel: "Quote first",
    rating: 4.7,
    relatedCategories: ["Tile work", "Carpentry"],
    detailBullets: [
      "Used under tile mortar bed assemblies where specified",
      "Confirm roll size, gauge, and fastening method with installer",
      "Coordinate with paper underlayment and mortar bed materials",
    ],
  },
  {
    slug: "cement-board-5x3",
    name: "Cement Board 5x3",
    description: "Cement backer board panel for tile walls, floors, wet areas, and substrate prep where cement board is required.",
    shortDescription: "5x3 cement backer board panel for tile substrate prep.",
    category: "Tile work",
    unit: "Sheet - 5x3",
    price: 17.5,
    supplierName: "Lowe's",
    quoteNumber: "James Hardie Item #60358 / Model #220023",
    specLine: "Cement board - 3 ft x 5 ft panel",
    featuredLabel: "Backer board",
    popularUse: "Tile substrate",
    reviewLabel: "Quote first",
    rating: 4.8,
    relatedCategories: ["Tile work", "Sheet rock"],
    detailBullets: [
      "Use for tile substrate areas where cement board is required",
      "Common for wet areas and tile assemblies",
      "Confirm thickness, fasteners, and waterproofing requirements before ordering",
    ],
  },
  {
    slug: "half-inch-drywall-board-4x8",
    name: "1/2 in. Drywall Board",
    description: "Standard 1/2 in. gypsum drywall panel for interior walls and ceilings in common residential work.",
    shortDescription: "Standard 1/2 in. drywall panel for walls and ceilings.",
    category: "Sheet rock",
    unit: "Sheet - 4x8",
    price: 16.68,
    supplierName: "11515 retail baseline",
    quoteNumber: "HD 14113411708",
    specLine: "1/2 in. x 4 ft. x 8 ft. gypsum board",
    featuredLabel: "Most common",
    popularUse: "Interior walls",
    reviewLabel: "Common item",
    rating: 4.8,
    relatedCategories: ["Sheet rock", "Carpentry"],
    detailBullets: [
      "Common interior wall and ceiling board",
      "Used for most standard residential drywall areas",
      "Confirm moisture, fire, and thickness requirements before ordering",
    ],
  },
  {
    slug: "five-eighths-fire-rated-drywall-board-4x8",
    name: "5/8 in. Fire-Rated Drywall Board",
    description: "Type X fire-rated drywall panel commonly used where fire resistance or added stiffness is required.",
    shortDescription: "Type X 5/8 in. drywall panel for fire-rated areas.",
    category: "Sheet rock",
    unit: "Sheet - 4x8",
    price: 18.88,
    supplierName: "11515 retail baseline",
    quoteNumber: "USG Firecode X baseline",
    specLine: "5/8 in. Type X - 4 ft. x 8 ft.",
    featuredLabel: "Fire-rated",
    popularUse: "Garage and rated walls",
    reviewLabel: "Common item",
    rating: 4.8,
    relatedCategories: ["Sheet rock", "Carpentry"],
    detailBullets: [
      "Common for garage walls, ceilings, and rated assemblies",
      "Adds stiffness compared with standard 1/2 in. board",
      "Match local code and plan requirements before ordering",
    ],
  },
  {
    slug: "moisture-resistant-drywall-board-4x8",
    name: "Moisture-Resistant Drywall Board",
    description: "Moisture-resistant drywall panel for bathrooms, laundry rooms, and other damp interior locations.",
    shortDescription: "Moisture-resistant board for damp interior rooms.",
    category: "Sheet rock",
    unit: "Sheet - 4x8",
    price: 23.58,
    supplierName: "11515 retail baseline",
    quoteNumber: "HD 14302111708",
    specLine: "Moisture-resistant gypsum board - 4 ft. x 8 ft.",
    featuredLabel: "Damp areas",
    popularUse: "Bathrooms and laundry",
    reviewLabel: "Common item",
    rating: 4.7,
    relatedCategories: ["Sheet rock", "Tile work"],
    detailBullets: [
      "Useful for bathrooms, laundry rooms, and damp interior spaces",
      "Not a replacement for cement board in wet tile assemblies",
      "Confirm exact room use before selecting the board type",
    ],
  },
  {
    slug: "lightweight-joint-compound",
    name: "Lightweight Joint Compound",
    description: "Ready-mix lightweight joint compound for taping, filling, and finishing drywall seams.",
    shortDescription: "Ready-mix compound for taping and finishing seams.",
    category: "Sheet rock",
    unit: "Bucket - 4.5 gal",
    price: 23.65,
    supplierName: "11515 retail baseline",
    quoteNumber: "HD RURLW45P",
    specLine: "Ready-mix lightweight joint compound",
    featuredLabel: "Finishing",
    popularUse: "Drywall seams",
    reviewLabel: "Common item",
    rating: 4.7,
    relatedCategories: ["Sheet rock", "Carpentry"],
    detailBullets: [
      "Used for bedding tape and finishing drywall joints",
      "Common bucket size for residential patch and room work",
      "Check coat sequence and drying time with the finisher",
    ],
  },
  {
    slug: "drywall-paper-joint-tape",
    name: "Drywall Paper Joint Tape",
    description: "Paper joint tape for reinforcing drywall seams and inside corners before finishing compound.",
    shortDescription: "Paper tape for seams and inside corners.",
    category: "Sheet rock",
    unit: "Roll - 250 ft",
    price: 4.57,
    supplierName: "11515 retail baseline",
    quoteNumber: "HD 382175",
    specLine: "Paper joint tape - 250 ft roll",
    featuredLabel: "Taping",
    popularUse: "Seams and corners",
    reviewLabel: "Common item",
    rating: 4.7,
    relatedCategories: ["Sheet rock", "Carpentry"],
    detailBullets: [
      "Reinforces flat seams and inside corners",
      "Used with joint compound during taping",
      "Common roll size for small and medium jobs",
    ],
  },
  {
    slug: "coarse-thread-drywall-screws",
    name: "Coarse Thread Drywall Screws",
    description: "Coarse thread drywall screws for fastening gypsum board to wood studs and framing.",
    shortDescription: "Drywall screws for fastening board to wood framing.",
    category: "Sheet rock",
    unit: "Box - 5 lb",
    price: 24.98,
    supplierName: "11515 retail baseline",
    quoteNumber: "HD 158CDWS5",
    specLine: "Coarse thread - drywall to wood framing",
    featuredLabel: "Fasteners",
    popularUse: "Board fastening",
    reviewLabel: "Common item",
    rating: 4.8,
    relatedCategories: ["Sheet rock", "Framing"],
    detailBullets: [
      "Used to fasten drywall panels to wood framing",
      "Select length by board thickness and substrate",
      "Confirm screw spacing from plans or local requirements",
    ],
  },
  {
    slug: "metal-drywall-corner-bead",
    name: "Metal Drywall Corner Bead",
    description: "Metal corner bead for protecting and finishing outside drywall corners cleanly.",
    shortDescription: "Corner bead for clean outside drywall corners.",
    category: "Sheet rock",
    unit: "Each - 8 ft",
    price: 4.47,
    supplierName: "11515 retail baseline",
    quoteNumber: "HD 741339",
    specLine: "Metal outside corner bead - 8 ft",
    featuredLabel: "Corners",
    popularUse: "Outside corners",
    reviewLabel: "Common item",
    rating: 4.7,
    relatedCategories: ["Sheet rock", "Carpentry"],
    detailBullets: [
      "Protects outside corners before finishing",
      "Common for rooms, closets, returns, and openings",
      "Confirm metal, vinyl, or paper-faced preference with installer",
    ],
  },
  {
    slug: "flashing-roll",
    name: "Flashing Roll",
    description: "Corrosion-resistant flashing for clean water management around roofs, walls, and window openings.",
    category: "Exterior",
    unit: "Roll - 10 in x 50 ft",
    price: 58.9,
    supplierName: "Avantia Build sample catalog",
    quoteNumber: "CAT-FLS-050",
    specLine: "Corrosion resistant - exterior weatherproofing",
    featuredLabel: "Envelope",
    popularUse: "Water management",
    reviewLabel: "4.8 - 42 reviews",
    rating: 4.8,
    relatedCategories: ["Exterior", "Framing"],
  },
] satisfies Array<Omit<ProductSeed, "image" | "imageUrl" | "imageAlt" | "imageSource" | "imageLicense" | "imageCredit" | "imageCategory" | "gallery" | "availability">>

export const SAMPLE_SHOP_PRODUCTS: ShopCatalogProduct[] = PRODUCT_SEED_INPUTS.map((product, index) => {
  const image = productSpecificImageMetadata({ slug: product.slug, name: product.name, category: product.category }) ?? placeholderImageMetadata(product.category, product.name)

  return {
    id: `sample-${index + 1}`,
    ...product,
    image: image.imageUrl,
    imageUrl: image.imageUrl,
    imageAlt: image.imageAlt,
    imageSource: image.imageSource,
    imageLicense: image.imageLicense,
    imageCredit: image.imageCredit,
    imageCategory: image.imageCategory,
    gallery: galleryForProduct(image, product.category),
    availability: product.productType === "service" ? "Available" : "Available",
    productType: product.productType ?? "material",
    detailBullets: product.detailBullets ?? [],
  }
})

export function slugifyShopProduct(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function deriveSpecLine(item: ShopItemRecord) {
  if (item.description?.trim()) {
    return item.description.trim().slice(0, 72)
  }

  if (item.unit?.trim()) {
    return `${item.unit.trim()} - supplier catalog item`
  }

  return "Supplier catalog item ready for quoting"
}

export function normalizeShopItems(items: ShopItemRecord[]): ShopCatalogProduct[] {
  return items.map((item, index) => {
    const mappedCategory = mapExistingCategoryToShopCategory(item.category, {
      name: item.name,
      description: item.description,
      itemNo: item.item_number,
    })
    const productOverride = productSpecificImageMetadata({ name: item.name, category: mappedCategory })
    const imageLooksGeneric = !item.image_url || item.image_url.startsWith("/images/materials/photos/") || (item.image_url.startsWith("/images/materials/") && !item.image_url.startsWith("/images/materials/products/") && !item.image_url.startsWith("/images/materials/products-real/"))
    const image = productOverride && imageLooksGeneric
      ? productOverride
      : buildImageMetadata({
          name: item.name,
          category: mappedCategory,
          imageUrl: item.image_url,
          imageAlt: item.image_alt,
          imageSource: item.image_source,
          imageLicense: item.image_license,
          imageCredit: item.image_credit,
          imageCategory: item.image_category,
        })
    const extraGallery = Array.isArray(item.image_gallery) ? item.image_gallery : []

    return {
      id: item.id,
      slug: slugifyShopProduct(`${item.name}-${item.id.slice(0, 6)}`),
      name: item.name,
      description: item.description || "Supplier catalog item ready for project quoting.",
      shortDescription: item.description || "Supplier catalog item ready for project quoting.",
      category: mappedCategory,
      unit: item.unit || "Unit not specified",
      price: item.unit_price,
      supplierName: item.supplier_name,
      quoteNumber: item.quote_number,
      image: image.imageUrl,
      imageUrl: image.imageUrl,
      imageAlt: image.imageAlt,
      imageSource: image.imageSource,
      imageLicense: image.imageLicense,
      imageCredit: image.imageCredit,
      imageCategory: image.imageCategory,
      gallery: galleryForProduct(image, mappedCategory, extraGallery, item.name),
      specLine: deriveSpecLine(item),
      availability: "Available",
      featuredLabel: mappedCategory === "Framing" ? "Popular for framing" : mappedCategory === "Exterior" ? "Exterior pick" : "Jobsite pick",
      popularUse: mappedCategory || suggestShopCategory({ name: item.name, description: item.description, itemNo: item.item_number }),
      reviewLabel: `${(4.6 + (index % 4) * 0.1).toFixed(1)} - ${48 + index * 13} reviews`,
      rating: 4.6 + (index % 4) * 0.1,
      relatedCategories: relatedCategoriesFor(mappedCategory),
      productType: "material",
      detailBullets: [],
    }
  })
}

export function buildShopProducts(itemsData: ShopItemRecord[] | null | undefined, error: unknown) {
  const sampleMaterialProducts = SAMPLE_SHOP_PRODUCTS.filter((product) => product.productType !== "service")
  const dynamicProducts = !error && itemsData && itemsData.length > 0 ? normalizeShopItems(itemsData) : []
  const serviceProducts = SAMPLE_SHOP_PRODUCTS.filter((product) => product.productType === "service").sort(
    (a, b) => Number(b.slug === "view-as-built-lidar-capture") - Number(a.slug === "view-as-built-lidar-capture"),
  )
  const materialProducts = [...dynamicProducts, ...sampleMaterialProducts].filter((product, index, all) => {
    const key = `${product.name.trim().toLowerCase()}::${product.category.trim().toLowerCase()}`
    return (
      all.findIndex((candidate) => candidate.slug === product.slug) === index &&
      all.findIndex((candidate) => `${candidate.name.trim().toLowerCase()}::${candidate.category.trim().toLowerCase()}` === key) === index
    )
  })

  return [...serviceProducts, ...materialProducts]
}

export function findShopProductBySlug(products: ShopCatalogProduct[], slug: string) {
  return products.find((product) => product.slug === slug) ?? null
}
