export type ShopCartMap = Record<string, number>

export const SHOP_CART_STORAGE_KEY = "buildflow-shop-cart"
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
  return Object.values(cart).reduce((sum, value) => sum + (typeof value === "number" ? value : 0), 0)
}
