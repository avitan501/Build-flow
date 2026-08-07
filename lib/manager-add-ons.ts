import { placeholderImageMetadata, type ShopCatalogProduct } from "@/lib/shop-catalog"
import { DEPARTMENT_SYMBOL_KEYS, type DepartmentSymbolKey, type ShopToolCategory } from "@/lib/shop-tools"

const DEFAULT_HIDDEN_DEPARTMENTS = new Set(["Services", "Kitchen", "Eitan"])

function normalizeDepartmentSymbols(value: unknown): DepartmentSymbolKey[] {
  if (!Array.isArray(value)) return []
  return value.filter((symbol): symbol is DepartmentSymbolKey =>
    typeof symbol === "string" && DEPARTMENT_SYMBOL_KEYS.includes(symbol as DepartmentSymbolKey),
  )
}

export type ManagerAddOnProductKind = "product" | "service"

export type ManagerCategoryAddOn = {
  id: string
  slug: string
  label: string
  description: string
  imageUrl: string
  imageAlt: string
  symbols: DepartmentSymbolKey[]
  createdAt: string
}

export type ManagerDepartmentOverride = {
  sourceLabel: string
  label: string
  description: string
  imageUrl: string
  imageAlt: string
  symbols: DepartmentSymbolKey[]
  hidden: boolean
  visibilityConfigured?: boolean
  showQuickOrder?: boolean
  showPlanUpload?: boolean
  showChatToOrder?: boolean
  showTakeoff?: boolean
  updatedAt: string
}

export type ManagerDepartmentExperience = {
  showQuickOrder: boolean
  showPlanUpload: boolean
  showChatToOrder: boolean
  showTakeoff: boolean
}

export type ManagerProductAddOn = {
  id: string
  slug: string
  kind: ManagerAddOnProductKind
  name: string
  category: string
  description: string
  unit: string
  price: number
  supplierId: string
  supplierName: string
  createdAt: string
}

export type ManagerCatalogAddOns = {
  categories: ManagerCategoryAddOn[]
  products: ManagerProductAddOn[]
  services: ManagerProductAddOn[]
  departmentOverrides: ManagerDepartmentOverride[]
  hiddenItemIds: string[]
}

export const MANAGER_ADD_ONS_STORAGE_KEY = "buildflow-manager-catalog-add-ons"
export const MANAGER_ADD_ONS_UPDATED_EVENT = "buildflow-manager-catalog-add-ons-updated"

const MANAGER_PRODUCT_ID_PREFIX = "manager-product-"
const MANAGER_SERVICE_ID_PREFIX = "manager-service-"

export function makeManagerSlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `add-on-${Date.now()}`
}

export function createEmptyManagerAddOns(): ManagerCatalogAddOns {
  return { categories: [], products: [], services: [], departmentOverrides: [], hiddenItemIds: [] }
}

export function readManagerAddOns(): ManagerCatalogAddOns {
  if (typeof window === "undefined") return createEmptyManagerAddOns()

  try {
    const raw = window.localStorage.getItem(MANAGER_ADD_ONS_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    if (!parsed || typeof parsed !== "object") return createEmptyManagerAddOns()

    const addOns = parsed as Partial<ManagerCatalogAddOns>
    return {
      categories: Array.isArray(addOns.categories)
        ? addOns.categories.map((category) => ({ ...category, symbols: normalizeDepartmentSymbols(category.symbols) }))
        : [],
      products: Array.isArray(addOns.products) ? addOns.products : [],
      services: Array.isArray(addOns.services) ? addOns.services : [],
      departmentOverrides: Array.isArray(addOns.departmentOverrides)
        ? addOns.departmentOverrides.map((override) => ({ ...override, symbols: normalizeDepartmentSymbols(override.symbols) }))
        : [],
      hiddenItemIds: Array.isArray(addOns.hiddenItemIds) ? addOns.hiddenItemIds : [],
    }
  } catch {
    return createEmptyManagerAddOns()
  }
}

export function writeManagerAddOns(addOns: ManagerCatalogAddOns) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(MANAGER_ADD_ONS_STORAGE_KEY, JSON.stringify(addOns))
  window.dispatchEvent(new Event(MANAGER_ADD_ONS_UPDATED_EVENT))
}

export function isManagerAddOnProductId(productId: string) {
  return productId.startsWith(MANAGER_PRODUCT_ID_PREFIX) || productId.startsWith(MANAGER_SERVICE_ID_PREFIX)
}

export function isManagerItemHidden(addOns: ManagerCatalogAddOns, itemId: string) {
  return addOns.hiddenItemIds.includes(itemId)
}

export function visibleManagerItems<T extends { id: string }>(items: T[], addOns: ManagerCatalogAddOns) {
  return items.filter((item) => !isManagerItemHidden(addOns, item.id))
}

export function buildManagerCategoryAddOn(input: { label: string; description?: string; imageUrl?: string; symbols?: DepartmentSymbolKey[] }): ManagerCategoryAddOn {
  const label = input.label.trim()
  const slug = makeManagerSlug(label)
  const image = input.imageUrl?.trim()
    ? {
        imageUrl: input.imageUrl.trim(),
        imageAlt: `${label} category`,
      }
    : placeholderImageMetadata(label, label)

  return {
    id: `manager-category-${slug}`,
    slug,
    label,
    description: input.description?.trim() || `${label} requests and materials.`,
    imageUrl: image.imageUrl,
    imageAlt: image.imageAlt,
    symbols: normalizeDepartmentSymbols(input.symbols),
    createdAt: new Date().toISOString(),
  }
}

export function buildManagerDepartmentOverride(input: {
  sourceLabel: string
  label: string
  description?: string
  imageUrl?: string
  symbols?: DepartmentSymbolKey[]
  hidden?: boolean
  showQuickOrder?: boolean
  showPlanUpload?: boolean
  showChatToOrder?: boolean
  showTakeoff?: boolean
}): ManagerDepartmentOverride {
  const sourceLabel = input.sourceLabel.trim()
  const label = input.label.trim() || sourceLabel
  const image = input.imageUrl?.trim()
    ? {
        imageUrl: input.imageUrl.trim(),
        imageAlt: `${label} department`,
      }
    : placeholderImageMetadata(label, label)

  return {
    sourceLabel,
    label,
    description: input.description?.trim() || `${label} requests and materials.`,
    imageUrl: image.imageUrl,
    imageAlt: image.imageAlt,
    symbols: normalizeDepartmentSymbols(input.symbols),
    hidden: Boolean(input.hidden),
    visibilityConfigured: true,
    showQuickOrder: input.showQuickOrder ?? false,
    showPlanUpload: input.showPlanUpload ?? true,
    showChatToOrder: input.showChatToOrder ?? true,
    showTakeoff: input.showTakeoff ?? true,
    updatedAt: new Date().toISOString(),
  }
}

export function departmentOverrideFor(addOns: ManagerCatalogAddOns, sourceLabel: string) {
  return addOns.departmentOverrides.find((override) => override.sourceLabel === sourceLabel) ?? null
}

export function isDepartmentHidden(addOns: ManagerCatalogAddOns, sourceLabel: string) {
  const override = departmentOverrideFor(addOns, sourceLabel)
  if (override?.visibilityConfigured) return override.hidden
  return Boolean(override?.hidden) || DEFAULT_HIDDEN_DEPARTMENTS.has(sourceLabel)
}

export function departmentDisplayLabel(addOns: ManagerCatalogAddOns, sourceLabel: string) {
  return departmentOverrideFor(addOns, sourceLabel)?.label || sourceLabel
}

export function departmentExperienceFor(addOns: ManagerCatalogAddOns, sourceLabel: string): ManagerDepartmentExperience {
  const override = departmentOverrideFor(addOns, sourceLabel)
  return {
    showQuickOrder: override?.showQuickOrder ?? false,
    showPlanUpload: override?.showPlanUpload ?? true,
    showChatToOrder: override?.showChatToOrder ?? true,
    showTakeoff: override?.showTakeoff ?? true,
  }
}

export function resolveDepartmentSourceLabel(addOns: ManagerCatalogAddOns, labelOrSource: string) {
  const override = addOns.departmentOverrides.find(
    (entry) => entry.label === labelOrSource || entry.sourceLabel === labelOrSource,
  )
  return override?.sourceLabel || labelOrSource
}

export function visibleDepartmentSources(sources: string[], addOns: ManagerCatalogAddOns) {
  return sources.filter((source, index, all) => source && all.indexOf(source) === index && !isDepartmentHidden(addOns, source))
}

export function applyDepartmentAddOns(categories: ShopToolCategory[], addOns: ManagerCatalogAddOns): ShopToolCategory[] {
  const baseCategories = categories
    .filter((category) => !isDepartmentHidden(addOns, category.label))
    .map((category) => {
      const override = departmentOverrideFor(addOns, category.label)
      return override
        ? {
            ...category,
            label: override.label,
            description: override.description,
            imageUrl: override.imageUrl || category.imageUrl,
            imageAlt: override.imageAlt || category.imageAlt,
            symbols: override.symbols,
          }
        : category
    })

  const existingSlugs = new Set(baseCategories.map((category) => category.slug))
  const customCategories = addOns.categories.filter((category) => !existingSlugs.has(category.slug as ShopToolCategory["slug"]))

  return [...baseCategories, ...managerAddOnsToShopCategories({ ...addOns, categories: customCategories })]
}

export function buildManagerProductAddOn(input: {
  kind: ManagerAddOnProductKind
  name: string
  category: string
  description?: string
  unit?: string
  price?: number
  supplierId?: string
  supplierName?: string
}): ManagerProductAddOn {
  const name = input.name.trim()
  const slug = makeManagerSlug(name)
  const prefix = input.kind === "service" ? MANAGER_SERVICE_ID_PREFIX : MANAGER_PRODUCT_ID_PREFIX

  return {
    id: `${prefix}${slug}`,
    slug,
    kind: input.kind,
    name,
    category: input.category.trim() || (input.kind === "service" ? "Sub-departments" : "Miscellaneous"),
    description: input.description?.trim() || `${name} added from manager preview.`,
    unit: input.unit?.trim() || (input.kind === "service" ? "Request" : "Each"),
    price: Number.isFinite(input.price) && Number(input.price) > 0 ? Number(Number(input.price).toFixed(2)) : 0,
    supplierId: input.supplierId?.trim() || "",
    supplierName: input.supplierName?.trim() || "Manager added",
    createdAt: new Date().toISOString(),
  }
}

export function managerAddOnsToShopCategories(addOns: ManagerCatalogAddOns): ShopToolCategory[] {
  return addOns.categories.map((category) => ({
    slug: category.slug as ShopToolCategory["slug"],
    label: category.label,
    description: category.description,
    imageUrl: category.imageUrl,
    imageAlt: category.imageAlt,
    symbols: category.symbols,
  }))
}

export function managerAddOnsToShopProducts(addOns: ManagerCatalogAddOns): ShopCatalogProduct[] {
  return visibleManagerItems([...addOns.services, ...addOns.products], addOns).map((item, index) => {
    const image = placeholderImageMetadata(item.kind === "service" ? "Sub-departments" : item.category, item.name)

    return {
      id: item.id,
      slug: item.slug,
      name: item.name,
      description: item.description,
      shortDescription: item.description,
      category: item.kind === "service" ? item.category || "Sub-departments" : item.category,
      unit: item.unit,
      price: item.price,
      supplierName: item.supplierName,
      quoteNumber: null,
      image: image.imageUrl,
      imageUrl: image.imageUrl,
      imageAlt: image.imageAlt,
      imageSource: image.imageSource,
      imageLicense: image.imageLicense,
      imageCredit: image.imageCredit,
      imageCategory: item.kind === "service" ? "Sub-departments" : item.category,
      gallery: [image],
      specLine: item.kind === "service" ? "Manager-created file upload request" : "Manager-created catalog item",
      availability: "Manager preview",
      featuredLabel: "Manager added",
      popularUse: item.category,
      reviewLabel: "Preview item",
      rating: 4.8 - (index % 3) * 0.1,
      relatedCategories: [item.category, "Sub-departments"].filter((value, valueIndex, all) => value && all.indexOf(value) === valueIndex),
      productType: item.kind === "service" ? "service" : "material",
      detailBullets: [item.kind === "service" ? "Added from Manager sub-departments" : "Added from Manager catalog items"],
    }
  })
}
