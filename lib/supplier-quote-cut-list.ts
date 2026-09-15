import type { ExtractedSupplierQuoteItem } from "@/lib/supplier-quote-parser"
import { normalizeSupplierQuoteUnit } from "@/lib/supplier-quote-pricing"

/** Derive piece-price comparison rows only from a complete printed LF schedule.
 * Keep the original PDF/text and source pricing on every derived row. Never
 * infer lengths, pack sizes, substitutions or distribute unexplained charges.
 */
export function expandSupplierQuoteCutLists(items: ExtractedSupplierQuoteItem[]) {
  return items.flatMap(item => {
    if (normalizeSupplierQuoteUnit(item.unit) !== "lin. ft." || item.unitPrice === null || item.lineTotal === null) return [item]
    const match = item.specification.match(/(?:^| · )Cut list: ((?:\d+\/\d+(?:\.\d+)?[’'′]\s*)+)$/)
    if (!match) return [item]
    const cuts = [...match[1].matchAll(/(\d+)\/(\d+(?:\.\d+)?)[’'′]/g)].map(cut => ({ quantity: Number(cut[1]), length: Number(cut[2]) }))
    if (!cuts.length || cuts.length > 100 || cuts.some(cut => cut.quantity <= 0 || cut.length <= 0)) return [item]
    const feet = cuts.reduce((sum, cut) => sum + cut.quantity * cut.length, 0)
    if (Math.abs(feet - item.quantity) > 0.0001) return [item]
    const derived = cuts.map(cut => {
      const unitPrice = Math.round(item.unitPrice! * cut.length * 10000) / 10000
      return {
        ...item,
        quantity: cut.quantity, unit: "each", unitPrice,
        lineTotal: Math.round(cut.quantity * unitPrice * 100) / 100,
        specification: [item.specification.slice(0, match.index).trim(), `Length: ${cut.length} ft`, `Source pricing: ${item.quantity} LF at $${item.unitPrice} = $${item.lineTotal}; printed cut ${cut.quantity}/${cut.length}'; derived piece price`].filter(Boolean).join(" · "),
      }
    })
    const cents = derived.reduce((sum, row) => sum + Math.round(row.lineTotal * 100), 0)
    return cents === Math.round(item.lineTotal * 100) ? derived : [item]
  })
}
