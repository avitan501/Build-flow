import { buildClientQuoteSummary, calculateQuoteTax, type ClientQuoteSummary, type QuoteComparisonBidRecord, type QuoteComparisonItemRecord } from "@/lib/quote-comparison"
import type { FinalizedProcurementRoute } from "@/lib/finalized-procurement-route"
import type { QuoteComparisonRecord } from "@/lib/quote-comparison"

export function finalizedClientSnapshot(comparison: QuoteComparisonRecord, items: QuoteComparisonItemRecord[]) {
  return {
    comparison: Object.fromEntries(["active_route_id", "client_id", "client_name_snapshot", "client_email_snapshot", "quote_number", "expires_on", "client_message", "job_address", "client_delivery_charge", "client_tax_percent", "client_quote_status"].map((key) => [key, comparison[key as keyof QuoteComparisonRecord] ?? null])),
    items: [...items].sort((a,b) => a.id.localeCompare(b.id)).map((item) => ({ id:item.id, description:item.description, specification:item.specification, quantity:item.quantity, unit:item.unit, markup_percent:item.markup_percent, client_unit_price:item.client_unit_price })),
  }
}

/** A cost map, not a synthetic supplier/bid. Supplier identity stays on route lines. */
export function procurementItemCosts(route: FinalizedProcurementRoute | null, legacyBid: QuoteComparisonBidRecord | null) {
  if (route) return new Map(route.items.map((line) => [line.item_id, { unit_price: Number(line.unit_cost), is_available: true }]))
  return new Map((legacyBid?.quote_comparison_prices ?? []).map((line) => [line.item_id, { unit_price: line.unit_price, is_available: line.is_available }]))
}
const amount = (value: number | null | undefined) => Number.isFinite(value) && Number(value) >= 0 ? Number(value) : 0
const cents = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

export function buildProcurementClientQuoteSummary(items: QuoteComparisonItemRecord[], route: FinalizedProcurementRoute | null, legacyBid: QuoteComparisonBidRecord | null, clientDeliveryCharge: number, clientTaxPercent: number): ClientQuoteSummary {
  if (!route) return buildClientQuoteSummary(items, legacyBid, clientDeliveryCharge, clientTaxPercent)
  const costs = procurementItemCosts(route, null)
  const lines = items.map((item) => {
    const cost = costs.get(item.id)?.unit_price
    const supplierUnitCost = cost !== undefined && cost !== null && Number.isFinite(cost) && cost >= 0 ? cost : null
    const markupPercent = amount(item.markup_percent)
    const clientUnitPrice = item.client_unit_price == null ? supplierUnitCost === null ? null : cents(supplierUnitCost * (1 + markupPercent / 100)) : amount(item.client_unit_price)
    const quantity = amount(item.quantity)
    const supplierLineCost = cents((supplierUnitCost ?? 0) * quantity)
    const clientLineTotal = cents((clientUnitPrice ?? 0) * quantity)
    return { itemId: item.id, description: item.description, specification: item.specification, quantity, unit: item.unit, supplierUnitCost, markupPercent, clientUnitPrice, supplierLineCost, clientLineTotal, profit: cents(clientLineTotal - supplierLineCost) }
  })
  const clientMaterialSubtotal = cents(lines.reduce((sum, line) => sum + line.clientLineTotal, 0))
  const safeDelivery = amount(clientDeliveryCharge)
  const safeTax = Math.min(100, amount(clientTaxPercent))
  const clientTaxAmount = calculateQuoteTax(clientMaterialSubtotal + safeDelivery, safeTax)
  const supplierLandedCost = Number(route.landed_total)
  const profit = cents(clientMaterialSubtotal + safeDelivery - supplierLandedCost)
  return {
    lines, supplierMaterialCost: Number(route.material_subtotal), supplierDeliveryAndTax: Number(route.delivery_total) + Number(route.supplier_tax_total), supplierLandedCost,
    clientMaterialSubtotal, clientDeliveryCharge: safeDelivery, clientTaxPercent: safeTax, clientTaxAmount,
    clientTotal: cents(clientMaterialSubtotal + safeDelivery + clientTaxAmount), profit,
    marginPercent: clientMaterialSubtotal + safeDelivery > 0 ? profit / (clientMaterialSubtotal + safeDelivery) * 100 : 0,
    complete: items.length > 0 && route.items.length === items.length && lines.every((line) => line.supplierUnitCost !== null && line.clientUnitPrice !== null),
  }
}
