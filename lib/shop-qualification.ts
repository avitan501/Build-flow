import type { ShopCatalogProduct } from "@/lib/shop-catalog"
import type { ShopToolSlug } from "@/lib/shop-tools"

export type QualifyingQuestionType = "text" | "textarea" | "select"
export type SupplierDeliveryMethod = "email" | "phone" | "whatsapp" | "sms" | "portal" | "manual"
export type SupplierTrustLevel = "not-reviewed" | "first-time" | "verified" | "trusted" | "preferred" | "do-not-use"
export type SupplierReferralSource = "friend" | "client" | "contractor" | "supplier" | "other"

export type SupplierContact = {
  id: string
  name: string
  role?: string
  email?: string
  phone?: string
}

export type SupplierRelationshipUpdate = {
  id: string
  date: string
  summary: string
}

export type QualifyingQuestion = {
  id: string
  label: string
  type: QualifyingQuestionType
  required: boolean
  options?: string[]
}

export type SupplierRoutingOption = {
  id: string
  name: string
  contactLabel: string
  contactName?: string
  email?: string
  phone?: string
  whatsapp?: string
  portalUrl?: string
  preferredDeliveryMethod?: SupplierDeliveryMethod
  contactMethods?: SupplierDeliveryMethod[]
  additionalContacts?: SupplierContact[]
  relationshipUpdates?: SupplierRelationshipUpdate[]
  deliveryNotes?: string
  deliveryCharge?: number | null
  deliveryChargeNote?: string
  notes?: string
  programChannels?: import("@/lib/supplier-program-channels").SupplierProgramChannel[]
  trustLevel?: SupplierTrustLevel
  referredBySource?: SupplierReferralSource | ""
  referredByName?: string
  catalogDepartments?: string[]
  catalogEnabledDepartments?: string[]
  address?: string
  materials?: string
}

export type ProductQualificationSetting = {
  productId: string
  enabled: boolean
  supplierId: string
  questions: QualifyingQuestion[]
}

export type ShopQualificationSettings = {
  suppliers: SupplierRoutingOption[]
  products: Record<string, ProductQualificationSetting>
}

export type QualificationTarget = Pick<ShopCatalogProduct, "id" | "name" | "category" | "price" | "productType">

export type ServiceAssignmentTarget = {
  id: string
  departmentSlug: ShopToolSlug
  departmentLabel: string
  serviceLabel: string
  description: string
  defaultSupplierId: string
  defaultQuestions: QualifyingQuestion[]
}

export const SHOP_QUALIFICATION_SETTINGS_STORAGE_KEY = "buildflow-shop-qualification-settings"
export const AVANTIA_COMPANY_PHONE = "5169088319"

export const DEFAULT_SUPPLIERS: SupplierRoutingOption[] = [
  { id: "buildflow-estimating", name: "Avantia Build estimating desk", contactLabel: "Company phone", contactName: "Estimating coordinator", phone: AVANTIA_COMPANY_PHONE, preferredDeliveryMethod: "phone", deliveryNotes: "Default internal queue for uncategorized service requests." },
  { id: "framing-desk", name: "Framing supplier desk", contactLabel: "Framing quotes", contactName: "Framing estimator", preferredDeliveryMethod: "manual", deliveryNotes: "Send blueprint takeoff, framer list, project address, and required delivery date." },
  { id: "window-supplier", name: "Window supplier desk", contactLabel: "Window schedules", contactName: "Window estimator", whatsapp: "+17189409400", preferredDeliveryMethod: "whatsapp", deliveryNotes: "Send only the extracted window schedule and quote wording." },
  { id: "kitchen-desk", name: "Avantia Build kitchen desk", contactLabel: "Kitchen packages", contactName: "Cabinet coordinator", preferredDeliveryMethod: "manual", deliveryNotes: "Send cabinet layout, appliance notes, finish, hardware, and delivery notes." },
  { id: "door-trim-desk", name: "Door and molding desk", contactLabel: "Doors and trim", contactName: "Finish carpentry estimator", preferredDeliveryMethod: "manual" },
  { id: "materials-desk", name: "Materials supplier desk", contactLabel: "Materials quotes", contactName: "Materials coordinator", preferredDeliveryMethod: "manual" },
  { id: "survey-layout", name: "Survey and layout team", contactLabel: "Survey services", contactName: "Survey coordinator", preferredDeliveryMethod: "manual" },
  { id: "view-as-built", name: "View As-Built", contactLabel: "LiDAR / as-built", contactName: "Capture coordinator", preferredDeliveryMethod: "manual" },
  { id: "source-flooring", name: "Source Flooring", contactLabel: "Flooring supplier", contactName: "Sales team", email: "info@sourceflooring.com", phone: "+15197429188", portalUrl: "https://www.sourceflooring.com/", preferredDeliveryMethod: "email", deliveryNotes: "Kitchener, Ontario flooring supplier. Route flooring requests here after owner review.", notes: "1362 Victoria Street North, Kitchener, Ontario N2B 3E2, Canada" },
]

const DEFAULT_SUPPLIER_IDS = new Set(DEFAULT_SUPPLIERS.map((supplier) => supplier.id))
const OLD_PLACEHOLDER_EMAIL_PATTERN = /@(instabuild\.local|avantia\.build)$/i

function normalizeSupplierContact(supplier: SupplierRoutingOption): SupplierRoutingOption {
  if (!DEFAULT_SUPPLIER_IDS.has(supplier.id)) return supplier

  const next: SupplierRoutingOption = { ...supplier }
  if (next.email && OLD_PLACEHOLDER_EMAIL_PATTERN.test(next.email)) {
    delete next.email
  }

  if (next.id === "buildflow-estimating") {
    next.phone = next.phone || AVANTIA_COMPANY_PHONE
    next.contactLabel = next.contactLabel || "Company phone"
    if (!next.preferredDeliveryMethod || next.preferredDeliveryMethod === "email") {
      next.preferredDeliveryMethod = "phone"
    }
  } else if (next.preferredDeliveryMethod === "email" && !next.email) {
    next.preferredDeliveryMethod = "manual"
  }

  return next
}

function question(id: string, label: string, type: QualifyingQuestionType = "text", required = false, options?: string[]): QualifyingQuestion {
  return { id, label, type, required, options }
}

export const DEFAULT_SERVICE_QUESTIONS: QualifyingQuestion[] = [
  question("scope", "What do you need help with?", "textarea", true),
  question("timeline", "When do you need this completed?", "text"),
  question("site_access", "Any access notes for the property?", "textarea"),
]

export const DEFAULT_PLAN_UPLOAD_QUESTIONS: QualifyingQuestion[] = [
  question("plan_type", "What type of plan is this?", "select", true, ["Blueprint", "Material list", "Schedule", "Photo", "Other"]),
  question("needed_result", "What do you want us to price or extract from it?", "textarea", true),
  question("timeline", "When do you need pricing back?", "text"),
]

const FRAMING_QUESTIONS: QualifyingQuestion[] = [
  question("framing_scope", "What should be priced from this upload?", "select", true, ["Full framing package", "Lumber only", "Hardware only", "Labor review", "Not sure"]),
  question("takeoff_source", "Is this a blueprint or a framer material list?", "select", true, ["Blueprint", "Framer list", "Both", "Other"]),
  question("delivery_timing", "When do you need framing material delivered?", "text"),
  question("framing_notes", "Any joist, LVL, connector, or delivery notes?", "textarea"),
]

const KITCHEN_QUESTIONS: QualifyingQuestion[] = [
  question("cabinet_style", "What cabinet style or finish do you want?", "text"),
  question("appliances", "Are appliance sizes already confirmed?", "select", false, ["Yes", "No", "Not sure"]),
  question("countertop", "Should countertop be included in the quote?", "select", false, ["Yes", "No", "Separate quote"]),
  question("kitchen_notes", "Any layout, hardware, filler, or delivery notes?", "textarea"),
]

const EITAN_WINDOW_QUESTIONS: QualifyingQuestion[] = [
  question("window_scope", "Do you need supply only or supply and install?", "select", true, ["Supply only", "Supply and install", "Not sure"]),
  question("window_schedule", "Do you already have a window schedule?", "select", true, ["Yes", "No", "Uploaded with plan"]),
  question("window_brand", "Any required brand, color, grid, or glass notes?", "textarea"),
]

const DOOR_MOLDING_QUESTIONS: QualifyingQuestion[] = [
  question("door_scope", "What should be priced?", "select", true, ["Doors", "Molding"]),
  question("finish_type", "Paint grade or stain grade?", "select", false, ["Paint grade", "Stain grade", "Not sure"]),
  question("door_notes", "Any swing, size, jamb, casing, or hardware notes?", "textarea"),
]

const DRYWALL_QUESTIONS: QualifyingQuestion[] = [
  question("drywall_scope", "What should be included?", "select", true, ["Boards only", "Boards and accessories", "Full material takeoff", "Labor review"]),
  question("board_type", "Any board type requirements?", "textarea"),
  question("drywall_notes", "Any ceiling height, soundproofing, moisture, or fire-rated notes?", "textarea"),
]

const FLOORING_QUESTIONS: QualifyingQuestion[] = [
  question("flooring_type", "What floor type should be priced?", "select", true, ["Hardwood", "Engineered wood", "Laminate", "Vinyl", "Not sure"]),
  question("flooring_install", "Supply only or supply and install?", "select", false, ["Supply only", "Supply and install", "Not sure"]),
  question("flooring_notes", "Any underlayment, stair, transition, or finish notes?", "textarea"),
]

const TILE_QUESTIONS: QualifyingQuestion[] = [
  question("tile_scope", "What should be priced?", "select", true, ["Tile material", "Thinset and prep", "Full tile package", "Labor review"]),
  question("tile_area", "Where is the tile going?", "text"),
  question("tile_notes", "Any waterproofing, tile size, grout, or substrate notes?", "textarea"),
]

export const SERVICE_ASSIGNMENT_TARGETS: ServiceAssignmentTarget[] = [
  {
    id: "framing-upload-framer-list",
    departmentSlug: "framing",
    departmentLabel: "Framing",
    serviceLabel: "Upload framer list",
    description: "Customer uploads a framer list, CSV, spreadsheet, photo, or PDF for framing pricing.",
    defaultSupplierId: "framing-desk",
    defaultQuestions: FRAMING_QUESTIONS,
  },
  {
    id: "framing-upload-blue-print",
    departmentSlug: "framing",
    departmentLabel: "Framing",
    serviceLabel: "Upload blueprint",
    description: "Customer uploads plans for framing takeoff and pricing.",
    defaultSupplierId: "framing-desk",
    defaultQuestions: FRAMING_QUESTIONS,
  },
  {
    id: "kitchen-upload-kitchen-plan",
    departmentSlug: "kitchen",
    departmentLabel: "Kitchen",
    serviceLabel: "Upload kitchen plan",
    description: "Customer uploads a kitchen plan or cabinet layout for a quote.",
    defaultSupplierId: "kitchen-desk",
    defaultQuestions: KITCHEN_QUESTIONS,
  },
  {
    id: "kitchen-upload-design-spec",
    departmentSlug: "kitchen",
    departmentLabel: "Kitchen",
    serviceLabel: "Upload design spec",
    description: "Customer uploads finish, hardware, appliance, or cabinet spec notes.",
    defaultSupplierId: "kitchen-desk",
    defaultQuestions: KITCHEN_QUESTIONS,
  },
  {
    id: "eitan-window-schedule",
    departmentSlug: "eitan",
    departmentLabel: "Eitan",
    serviceLabel: "Window schedule quote",
    description: "Customer uploads plans and the system extracts the window schedule for quote review.",
    defaultSupplierId: "window-supplier",
    defaultQuestions: EITAN_WINDOW_QUESTIONS,
  },
  {
    id: "door-and-molding-package",
    departmentSlug: "door-and-molding",
    departmentLabel: "Door and molding",
    serviceLabel: "Door and molding package",
    description: "Door, trim, molding, casing, jamb, and finish carpentry quote requests.",
    defaultSupplierId: "door-trim-desk",
    defaultQuestions: DOOR_MOLDING_QUESTIONS,
  },
  {
    id: "sheet-rock-drywall-takeoff",
    departmentSlug: "sheet-rock",
    departmentLabel: "Sheet rock",
    serviceLabel: "Drywall takeoff",
    description: "Blueprint or calculator-backed drywall material requests.",
    defaultSupplierId: "materials-desk",
    defaultQuestions: DRYWALL_QUESTIONS,
  },
  {
    id: "wood-floor-takeoff",
    departmentSlug: "wood-floor",
    departmentLabel: "Wood Floor",
    serviceLabel: "Flooring takeoff",
    description: "Flooring plan uploads and room-based flooring package requests.",
    defaultSupplierId: "materials-desk",
    defaultQuestions: FLOORING_QUESTIONS,
  },
  {
    id: "tile-work-package",
    departmentSlug: "tile-work",
    departmentLabel: "Tile work",
    serviceLabel: "Tile package",
    description: "Tile material, thinset, prep, waterproofing, and substrate requests.",
    defaultSupplierId: "materials-desk",
    defaultQuestions: TILE_QUESTIONS,
  },
  {
    id: "exterior-package",
    departmentSlug: "exterior",
    departmentLabel: "Exterior",
    serviceLabel: "Exterior package",
    description: "Exterior envelope, flashing, siding, and weatherproofing requests.",
    defaultSupplierId: "materials-desk",
    defaultQuestions: DEFAULT_PLAN_UPLOAD_QUESTIONS,
  },
  {
    id: "window-package",
    departmentSlug: "window",
    departmentLabel: "Window",
    serviceLabel: "Window package",
    description: "Window material and window schedule quote requests outside the Eitan workflow.",
    defaultSupplierId: "window-supplier",
    defaultQuestions: EITAN_WINDOW_QUESTIONS,
  },
  {
    id: "services-high-end",
    departmentSlug: "services",
    departmentLabel: "Services",
    serviceLabel: "Take Care of Yourself",
    description: "Comfort, wellness, and premium home upgrade requests.",
    defaultSupplierId: "materials-desk",
    defaultQuestions: DEFAULT_SERVICE_QUESTIONS,
  },
]

function supplierForTarget(target: QualificationTarget) {
  const haystack = `${target.name} ${target.category}`.toLowerCase()
  if (haystack.includes("survey") || haystack.includes("stakeout")) return "survey-layout"
  if (haystack.includes("lidar") || haystack.includes("as-built")) return "view-as-built"
  if (haystack.includes("kitchen") || haystack.includes("cabinet")) return "kitchen-desk"
  if (haystack.includes("window") || haystack.includes("eitan")) return "window-supplier"
  if (target.productType === "service") return "buildflow-estimating"
  return "materials-desk"
}

function defaultQuestionsForTarget(target: QualificationTarget) {
  const haystack = `${target.name} ${target.category}`.toLowerCase()
  if (haystack.includes("window") || haystack.includes("eitan")) {
    return [
      question("window_scope", "Do you need supply only or supply and install?", "select", true, ["Supply only", "Supply and install", "Not sure"]),
      question("window_schedule", "Do you already have a window schedule?", "select", true, ["Yes", "No", "Uploaded with plan"]),
      question("notes", "Any brand, color, glass, or delivery notes?", "textarea"),
    ]
  }

  if (haystack.includes("kitchen") || haystack.includes("cabinet")) {
    return [
      question("cabinet_style", "What cabinet style or finish do you want?", "text"),
      question("appliances", "Are appliance sizes already confirmed?", "select", false, ["Yes", "No", "Not sure"]),
      question("notes", "Any layout, hardware, or delivery notes?", "textarea"),
    ]
  }

  if (target.productType === "service" || target.price <= 0) {
    return DEFAULT_SERVICE_QUESTIONS
  }

  return []
}

export function defaultQualificationSettingForProduct(target: QualificationTarget): ProductQualificationSetting {
  const questions = defaultQuestionsForTarget(target)
  return {
    productId: target.id,
    enabled: target.productType === "service" || target.price <= 0,
    supplierId: supplierForTarget(target),
    questions,
  }
}

export function defaultQualificationSettingForServiceTarget(target: ServiceAssignmentTarget): ProductQualificationSetting {
  return {
    productId: target.id,
    enabled: true,
    supplierId: target.defaultSupplierId,
    questions: target.defaultQuestions,
  }
}

export function createEmptyQualificationSettings(): ShopQualificationSettings {
  return { suppliers: DEFAULT_SUPPLIERS, products: {} }
}

export function readShopQualificationSettings(): ShopQualificationSettings {
  if (typeof window === "undefined") return createEmptyQualificationSettings()

  try {
    const raw = window.localStorage.getItem(SHOP_QUALIFICATION_SETTINGS_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    if (!parsed || typeof parsed !== "object") return createEmptyQualificationSettings()

    const settings = parsed as Partial<ShopQualificationSettings>
    return {
      suppliers: Array.isArray(settings.suppliers) ? settings.suppliers.map(normalizeSupplierContact) : DEFAULT_SUPPLIERS,
      products: settings.products && typeof settings.products === "object" ? settings.products : {},
    }
  } catch {
    return createEmptyQualificationSettings()
  }
}

export function writeShopQualificationSettings(settings: ShopQualificationSettings) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(SHOP_QUALIFICATION_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
}

export function getQualificationSettingForProduct(target: QualificationTarget, settings = readShopQualificationSettings()) {
  return settings.products[target.id] ?? defaultQualificationSettingForProduct(target)
}

export function getQualificationSettingForPlanRequest(id: string, name: string, category: string, settings = readShopQualificationSettings()) {
  const serviceTarget = SERVICE_ASSIGNMENT_TARGETS.find((target) => target.id === id)
  if (serviceTarget) {
    return settings.products[id] ?? defaultQualificationSettingForServiceTarget(serviceTarget)
  }

  return settings.products[id] ?? {
    productId: id,
    enabled: true,
    supplierId: supplierForTarget({ id, name, category, price: 0, productType: "service" }),
    questions: DEFAULT_PLAN_UPLOAD_QUESTIONS,
  }
}
