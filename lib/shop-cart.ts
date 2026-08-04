export type ShopCartMap = Record<string, number>

export type ShopCartQuestionAnswer = {
  questionId: string
  label: string
  value: string
}

export type ShopCartQualificationStatus = "not_required" | "pending" | "answered" | "skipped"

export type ShopCartItemDetails = {
  productId: string
  productName: string
  category: string
  itemType: "material" | "service" | "custom-priced"
  qualificationStatus: ShopCartQualificationStatus
  answers: ShopCartQuestionAnswer[]
  updatedAt: string
}

export type ShopCustomCartItem = {
  id: string
  name: string
  category: string
  quantity: number
  unit: string
  unitPrice: number
  fileName?: string | null
  qualificationStatus: ShopCartQualificationStatus
  answers: ShopCartQuestionAnswer[]
  updatedAt: string
}

export const SHOP_CART_STORAGE_KEY = "buildflow-shop-cart"
export const SHOP_CART_DETAILS_STORAGE_KEY = "buildflow-shop-cart-details"
export const SHOP_CUSTOM_CART_STORAGE_KEY = "buildflow-shop-custom-cart"
export const SHOP_SAVE_STORAGE_KEY = "buildflow-shop-save"
export const SHOP_CART_UPDATED_EVENT = "buildflow-shop-cart-updated"
export const SHOP_SAVE_UPDATED_EVENT = "buildflow-shop-save-updated"

export function readShopCartMap(): ShopCartMap {
  if (typeof window === "undefined") return {}

  try {
    const raw = window.localStorage.getItem(SHOP_CART_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as ShopCartMap) : {}
  } catch {
    return {}
  }
}

export function writeShopCartMap(next: ShopCartMap) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(SHOP_CART_STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event(SHOP_CART_UPDATED_EVENT))
}

export function readShopCartDetailsMap(): Record<string, ShopCartItemDetails> {
  if (typeof window === "undefined") return {}

  try {
    const raw = window.localStorage.getItem(SHOP_CART_DETAILS_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, ShopCartItemDetails>) : {}
  } catch {
    return {}
  }
}

export function writeShopCartDetailsMap(next: Record<string, ShopCartItemDetails>) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(SHOP_CART_DETAILS_STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event(SHOP_CART_UPDATED_EVENT))
}

export function upsertShopCartItemDetails(details: ShopCartItemDetails) {
  const current = readShopCartDetailsMap()
  writeShopCartDetailsMap({ ...current, [details.productId]: details })
}

export function removeShopCartItemDetails(productId: string) {
  const current = readShopCartDetailsMap()
  delete current[productId]
  writeShopCartDetailsMap(current)
}

export function readShopCustomCartItems(): ShopCustomCartItem[] {
  if (typeof window === "undefined") return []

  try {
    const raw = window.localStorage.getItem(SHOP_CUSTOM_CART_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((item): item is ShopCustomCartItem => Boolean(item && typeof item === "object" && typeof item.id === "string")) : []
  } catch {
    return []
  }
}

export function writeShopCustomCartItems(next: ShopCustomCartItem[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(SHOP_CUSTOM_CART_STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event(SHOP_CART_UPDATED_EVENT))
}

export function upsertShopCustomCartItem(item: ShopCustomCartItem) {
  const current = readShopCustomCartItems()
  const existingIndex = current.findIndex((entry) => entry.id === item.id)
  const next = existingIndex >= 0 ? current.map((entry) => (entry.id === item.id ? item : entry)) : [item, ...current]
  writeShopCustomCartItems(next)
}

export function removeShopCustomCartItem(itemId: string) {
  writeShopCustomCartItems(readShopCustomCartItems().filter((item) => item.id !== itemId))
}

export function readShopSavedIds(): string[] {
  if (typeof window === "undefined") return []

  try {
    const raw = window.localStorage.getItem(SHOP_SAVE_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : []
  } catch {
    return []
  }
}

export function writeShopSavedIds(next: string[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(SHOP_SAVE_STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event(SHOP_SAVE_UPDATED_EVENT))
}

export function readShopCartCount() {
  const cart = readShopCartMap()
  const materialCount = Object.values(cart).reduce((sum, value) => sum + (typeof value === "number" ? value : 0), 0)
  const customCount = readShopCustomCartItems().reduce((sum, item) => sum + (Number.isFinite(item.quantity) ? item.quantity : 1), 0)
  return materialCount + customCount
}
