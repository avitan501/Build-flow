import type { ShopCatalogProduct } from "@/lib/shop-catalog"

export type ShopActivityEventType = "search" | "product_view" | "category_select" | "add_to_cart"

export type ShopActivityEvent = {
  eventType: ShopActivityEventType
  query?: string | null
  productSlug?: string | null
  productName?: string | null
  category?: string | null
  createdAt?: string | null
}

const SHOP_ACTIVITY_SESSION_KEY = "buildflow-shop-activity-session"
const SHOP_ACTIVITY_LOCAL_KEY = "buildflow-shop-activity-local"
const MAX_LOCAL_EVENTS = 40

export function getShopActivitySessionId() {
  if (typeof window === "undefined") return ""

  const existing = window.localStorage.getItem(SHOP_ACTIVITY_SESSION_KEY)
  if (existing) return existing

  const next = `shop-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
  window.localStorage.setItem(SHOP_ACTIVITY_SESSION_KEY, next)
  return next
}

export function readLocalShopActivity(): ShopActivityEvent[] {
  if (typeof window === "undefined") return []

  try {
    const raw = window.localStorage.getItem(SHOP_ACTIVITY_LOCAL_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function writeLocalShopActivity(event: ShopActivityEvent) {
  if (typeof window === "undefined") return

  const next = [{ ...event, createdAt: event.createdAt || new Date().toISOString() }, ...readLocalShopActivity()].slice(0, MAX_LOCAL_EVENTS)
  window.localStorage.setItem(SHOP_ACTIVITY_LOCAL_KEY, JSON.stringify(next))
}

export function buildSuggestedProducts(products: ShopCatalogProduct[], events: ShopActivityEvent[], limit = 6) {
  if (products.length === 0) return []

  const scores = new Map<string, number>()
  const lookup = new Map(products.map((product) => [product.slug, product]))

  for (const event of events) {
    if (event.productSlug && lookup.has(event.productSlug)) {
      scores.set(event.productSlug, (scores.get(event.productSlug) || 0) + (event.eventType === "add_to_cart" ? 6 : 4))
    }

    const query = event.query?.trim().toLowerCase()
    const category = event.category?.trim().toLowerCase()

    for (const product of products) {
      let delta = 0
      const haystack = [product.name, product.category, product.description, product.popularUse, product.specLine, product.productType || "material"].join(" ").toLowerCase()
      if (query && haystack.includes(query)) delta += event.eventType === "search" ? 3 : 1
      if (category && [product.category, product.imageCategory, product.productType === "service" ? "services" : "materials"].join(" ").toLowerCase().includes(category)) delta += 3
      if (delta > 0) {
        scores.set(product.slug, (scores.get(product.slug) || 0) + delta)
      }
    }
  }

  const ranked = [...products]
    .map((product) => ({ product, score: scores.get(product.slug) || 0 }))
    .sort((a, b) => b.score - a.score || b.product.rating - a.product.rating || a.product.price - b.product.price)

  const personalized = ranked.filter((entry) => entry.score > 0).slice(0, limit).map((entry) => entry.product)
  if (personalized.length > 0) return personalized

  return [...products]
    .sort((a, b) => Number(b.productType === "service") - Number(a.productType === "service") || b.rating - a.rating || a.price - b.price)
    .slice(0, limit)
}
