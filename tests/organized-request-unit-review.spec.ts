import { expect, test } from '@playwright/test'
import { materialReviewReasons, materialReviewStatus, materialReviewSummary, type ReviewableMaterialItem } from '../lib/client-material-review'
import { requestStep1CompletionError, requestStep2CompletionError } from '../lib/request-step-completion'
import { finalizedRouteSourceError } from '../lib/finalized-procurement-route'
import { requestItemSpecification } from '../lib/supplier-quote-routing'
import type { QuoteComparisonBidRecord, QuoteComparisonItemRecord } from '../lib/quote-comparison'

const original: ReviewableMaterialItem = {
  id: 'source', name: 'Aluminum fascia coil stock', department: 'Roofing', quantity: 1, unit: 'request',
  metadata: { ai_organized: true, review_status: 'ready', needs_review: false, quantity_defaulted: false, unit_defaulted: false, source_text: 'Fascia Cover – Aluminum fascia coil stock, .019", White – 3 ROL' },
}
const compared = (item: ReviewableMaterialItem) => ({ id: 'item', comparison_id: 'comparison', source_request_item_id: item.id, description: item.name, specification: requestItemSpecification(item.metadata, item.department), quantity: item.quantity, unit: item.unit } as QuoteComparisonItemRecord)
const supplier = (item: QuoteComparisonItemRecord) => ({ id: 'bid', comparison_id: 'comparison', supplier_id: 'supplier', supplier_name_snapshot: 'Fixture supplier', trust_level_snapshot: 'verified', delivery_charge: 0, tax_percent: 0, lead_time_days: 0, status: 'received', quote_comparison_prices: [{ bid_id: 'bid', item_id: item.id, unit_price: 74.50, is_available: true, notes: `${item.description} ${item.specification}` }] } as QuoteComparisonBidRecord)

test('organized envelope units override stored ready without changing saved evidence or prices', () => {
  for (const unit of ['request', 'requests', ' REQUESTS ']) {
    const item = { ...original, unit }, comparison = compared(item), bid = supplier(comparison)
    const before = JSON.stringify({ item, comparison, bid })
    expect(materialReviewStatus(item)).toBe('missing')
    expect(materialReviewReasons(item)).toEqual(['Confirm the product quantity and selling unit from the source.'])
    expect(materialReviewSummary([item])).toEqual({ ready: 0, check: 0, missing: 1 })
    expect(JSON.stringify({ item, comparison, bid })).toBe(before)
  }
})

test('step completion and mixed finalization reject the same unresolved AI row', () => {
  const comparison = compared(original)
  expect(requestStep1CompletionError([original])).toContain('Review 1')
  expect(requestStep2CompletionError([original], [comparison], supplier(comparison))).toContain('Review 1')
  expect(finalizedRouteSourceError([original], [comparison])).toContain('Review 1')
})

test('manual service request units remain valid without AI envelope interpretation', () => {
  for (const ai_organized of [undefined, false]) {
    const item = { ...original, name: 'Site inspection service', metadata: { review_status: 'ready', ai_organized } }
    const comparison = compared(item)
    expect(materialReviewStatus(item)).toBe('ready')
    expect(materialReviewReasons(item)).toEqual([])
    expect(requestStep1CompletionError([item])).toBeNull()
    expect(finalizedRouteSourceError([item], [comparison])).toBeNull()
  }
})

test('reviewed literal product units can proceed only after comparison quantities are refreshed', () => {
  const corrected = { ...original, quantity: 3, unit: 'rolls' }
  expect(materialReviewStatus(corrected)).toBe('ready')
  expect(requestStep1CompletionError([corrected])).toBeNull()
  expect(finalizedRouteSourceError([corrected], [compared(original)])).toContain('Products changed')
  expect(finalizedRouteSourceError([corrected], [compared(corrected)])).toBeNull()
})
