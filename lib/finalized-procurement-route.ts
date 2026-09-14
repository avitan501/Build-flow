import type { ReviewableMaterialItem } from "@/lib/client-material-review"
import type { QuoteComparisonItemRecord } from "@/lib/quote-comparison"
import { requestStep1CompletionError } from "@/lib/request-step-completion"
import { effectiveRequestComparisonItems, requestItemSpecification } from "@/lib/supplier-quote-routing"
import { normalizeSupplierQuoteUnit } from "@/lib/supplier-quote-pricing"

export type FinalizedRouteItem = { item_id: string; source_request_item_id: string | null; supplier_id: string; bid_id: string; quantity: number; unit: string; unit_cost: number; line_cost: number }
export type FinalizedRouteSupplier = { supplier_id: string; supplier_name: string; bid_id: string; material_subtotal: number; delivery_charge: number; tax_percent: number; tax_amount: number; landed_total: number; lead_time_days: number | null }
export type FinalizedProcurementRoute = { id: string; comparison_id: string; request_id: string | null; items: FinalizedRouteItem[]; suppliers: FinalizedRouteSupplier[]; material_subtotal: number; delivery_total: number; supplier_tax_total: number; landed_total: number }

const normalized = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase()
/** Website source semantics; RPC locks and compares this same raw source snapshot. */
export function finalizedRouteSourceError(requestItems: ReviewableMaterialItem[], comparisonItems: QuoteComparisonItemRecord[]) {
  const incomplete = requestStep1CompletionError(requestItems)
  if (incomplete) return incomplete
  const effective = effectiveRequestComparisonItems(requestItems)
  const bySource = new Map(comparisonItems.map((item) => [item.source_request_item_id, item]))
  if (comparisonItems.length !== effective.length || bySource.size !== effective.length) return "Refresh comparison products before finalizing the route."
  for (const original of effective) {
    const item = bySource.get(original.id)
    if (!item || item.quantity !== original.quantity || normalizeSupplierQuoteUnit(item.unit) !== normalizeSupplierQuoteUnit(original.unit)
      || normalized(item.description) !== normalized(original.name)
      || normalized(item.specification) !== normalized(requestItemSpecification(original.metadata, original.department))) return "Products changed. Refresh prices and review the route first."
  }
  return null
}

export function requestRouteSnapshot(items: ReviewableMaterialItem[]) {
  return [...items].sort((a, b) => a.id.localeCompare(b.id)).map((item) => ({ id: item.id, name: item.name, department: item.department, quantity: item.quantity, unit: item.unit ?? null, metadata: item.metadata ?? null, qualification_status: item.qualification_status ?? null }))
}
