import type { ExtractedSupplierQuoteItem } from "@/lib/supplier-quote-parser"

/** Prefer complete, explicitly column-labeled source rows over an AI rewrite.
 * A matching subtotal is an extraction check, never approval of a substitute.
 */
export function hasVerifiedSourceRows(text: string, rows: ExtractedSupplierQuoteItem[], subtotal: number | null) {
  if (subtotal === null || subtotal <= 0 || !rows.length || rows.length >= 500) return false
  const supportedHeader = (/Sale\s*\/\s*Un/i.test(text) && /Sale\s*\/\s*Ft/i.test(text))
    || /QTY\s+ITEM\s+NO\.?\s+DESCRIPTION\s+U\/?M\s+UNIT PRICE\s+EXTENDED PRICE/i.test(text)
  if (!supportedHeader || rows.some(row => !row.itemCode || row.lineTotal === null || row.unitPrice === null || row.quantity <= 0)) return false
  const cents = rows.reduce((sum, row) => sum + Math.round(row.lineTotal! * 100), 0)
  return Math.abs(cents - Math.round(subtotal * 100)) <= 1
}
