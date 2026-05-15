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

const LOCAL_IMAGE_SOURCE = "BuildFlow local placeholder"
const LOCAL_IMAGE_LICENSE = "BuildFlow placeholder asset"
const LOCAL_IMAGE_CREDIT = "BuildFlow"
const LOCAL_PRODUCT_IMAGE_SOURCE = "Home Depot Canada supplier product photo"
const LOCAL_PRODUCT_IMAGE_LICENSE = "Third-party supplier product photo"

type ProductImageOverride = {
  imageUrl: string
  imageAlt: string
  imageCategory: string
}

const PRODUCT_IMAGE_OVERRIDES_BY_SLUG: Record<string, ProductImageOverride> = {
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
  return CATEGORY_ALIASES[normalized] ?? "Materials"
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
  if (/^https?:\/\//i.test(next)) return true
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
    imageSource: LOCAL_PRODUCT_IMAGE_SOURCE,
    imageLicense: LOCAL_PRODUCT_IMAGE_LICENSE,
    imageCredit: LOCAL_IMAGE_CREDIT,
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
    supplierName: "BuildFlow survey services",
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
    supplierName: "BuildFlow survey services",
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
    supplierName: "BuildFlow survey services",
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
    slug: "2x4-premium-lumber",
    name: "2x4 Premium Lumber",
    description: "Kiln-dried framing lumber for clean residential wall framing and interior structural work.",
    category: "Framing",
    unit: "Each - 8 ft",
    price: 7.95,
    supplierName: "BuildFlow sample catalog",
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
    supplierName: "BuildFlow sample catalog",
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
    supplierName: "BuildFlow sample catalog",
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
    supplierName: "BuildFlow sample catalog",
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
    supplierName: "BuildFlow sample catalog",
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
    supplierName: "BuildFlow sample catalog",
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
    supplierName: "BuildFlow sample catalog",
    quoteNumber: "CAT-ADH-028",
    specLine: "High strength bond - subfloor rated",
    featuredLabel: "Jobsite staple",
    popularUse: "Subfloor installs",
    reviewLabel: "4.6 - 63 reviews",
    rating: 4.6,
    relatedCategories: ["Framing", "Tile work"],
  },
  {
    slug: "flashing-roll",
    name: "Flashing Roll",
    description: "Corrosion-resistant flashing for clean water management around roofs, walls, and window openings.",
    category: "Exterior",
    unit: "Roll - 10 in x 50 ft",
    price: 58.9,
    supplierName: "BuildFlow sample catalog",
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
  const dynamicProducts = !error && itemsData && itemsData.length > 0 ? normalizeShopItems(itemsData) : SAMPLE_SHOP_PRODUCTS.filter((product) => product.productType !== "service")
  const serviceProducts = SAMPLE_SHOP_PRODUCTS.filter((product) => product.productType === "service")

  return [...serviceProducts, ...dynamicProducts]
}

export function findShopProductBySlug(products: ShopCatalogProduct[], slug: string) {
  return products.find((product) => product.slug === slug) ?? null
}
