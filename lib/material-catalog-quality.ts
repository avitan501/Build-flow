import type { MaterialCatalogItem, MaterialCatalogSupplierPrice } from "@/lib/material-catalog"

export type CatalogReviewFilter = "all" | "missing_price" | "stale" | "needs_review" | "ready"

const AMBIGUOUS_PRODUCT_NAME = /\b(any|standard|matching|regular|common|typical)\b/i

export function catalogItemIssues(item: MaterialCatalogItem, prices: MaterialCatalogSupplierPrice[]) {
  const issues: string[] = []
  const activePrices = prices.filter((price) => price.item_id === item.id && price.unit_price !== null)
  if (AMBIGUOUS_PRODUCT_NAME.test(item.name)) issues.push("Ambiguous product name")
  if (!item.measurement.trim()) issues.push("Missing measurement")
  if (!item.manufacturer_model_number.trim() && !item.upc.trim()) issues.push("Missing model or UPC")
  if (!item.package_quantity || !item.package_unit.trim()) issues.push("Missing package size")
  if (!item.comparison_quantity || !item.comparison_unit.trim()) issues.push("Missing comparison unit")
  if (!activePrices.length) issues.push("Missing price")
  if (!item.image_url) issues.push("Missing image")
  return issues
}

export function isPriceStale(price: MaterialCatalogSupplierPrice, now = Date.now()) {
  if (price.unit_price === null) return false
  if (price.verification_status === "stale") return true
  const checkedAt = price.verified_at ?? price.price_observed_at
  if (!checkedAt) return true
  return now - new Date(checkedAt).getTime() > 30 * 24 * 60 * 60 * 1000
}

export function catalogItemMatchesReview(
  item: MaterialCatalogItem,
  prices: MaterialCatalogSupplierPrice[],
  filter: CatalogReviewFilter,
) {
  if (filter === "all") return true
  const itemPrices = prices.filter((price) => price.item_id === item.id)
  const hasPrice = itemPrices.some((price) => price.unit_price !== null)
  if (filter === "missing_price") return !hasPrice
  if (filter === "stale") return itemPrices.some((price) => isPriceStale(price))
  if (filter === "needs_review") return item.review_status !== "ready" || catalogItemIssues(item, prices).length > 0
  return item.review_status === "ready" && hasPrice && !itemPrices.some((price) => isPriceStale(price))
}

export function normalizedComparisonPrice(item: MaterialCatalogItem, price: MaterialCatalogSupplierPrice) {
  if (price.comparison_price !== null) return price.comparison_price
  if (price.unit_price === null || item.package_quantity <= 0 || item.comparison_quantity <= 0) return null
  return ((price.unit_price + (price.delivery_price ?? 0)) / item.package_quantity) * item.comparison_quantity
}

export function priceVerificationLabel(price: MaterialCatalogSupplierPrice) {
  if (isPriceStale(price)) return "Stale"
  return {
    verified_today: "Verified today",
    recently_verified: "Recently verified",
    supplier_quote: "Supplier quote",
    stale: "Stale",
    unavailable: "Unavailable",
    possible_match: "Possible match",
    unverified: "Unverified",
  }[price.verification_status]
}

export function priceCheckedDateLabel(price: MaterialCatalogSupplierPrice) {
  const checkedAt = price.verified_at ?? price.price_observed_at
  if (!checkedAt) return null
  const date = new Date(checkedAt)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(date)
}
