import { expect, test } from "@playwright/test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { readFile } from "node:fs/promises"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import ts from "typescript"
import { ProductQuoteCard, productQuoteCardSections } from "../components/buildflow/product-quote-card"
import { buildProductQuotePreview } from "../lib/product-quote-preview"
import type { QuoteComparisonBidRecord, QuoteComparisonItemRecord } from "../lib/quote-comparison"
import { formatComparisonMoney } from "../lib/quote-comparison"

// Compile real React JSX for SSR, rather than Playwright's component-test JSX.
const serverExports = {} as { ProductQuoteCard: typeof ProductQuoteCard }
const localRequire = createRequire(`${process.cwd()}/package.json`)
const componentSource = ts.transpileModule(readFileSync("components/buildflow/product-quote-card.tsx", "utf8"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText
new Function("exports", "require", componentSource)(serverExports, (id: string) => id === "@/lib/quote-comparison" ? { formatComparisonMoney } : localRequire(id))

const item: QuoteComparisonItemRecord = { id: "valve", comparison_id: "comparison", description: "Control valve with a very long manufacturer product name", specification: "4 in · threaded · exact requested specification", quantity: 2, unit: "each", markup_percent: 0, client_unit_price: null, sort_order: 0, created_at: "", updated_at: "" }
function bid(id: string, price: number | null, available = true, notes = ""): QuoteComparisonBidRecord {
  return { id, comparison_id: "comparison", supplier_id: id, supplier_name_snapshot: id, trust_level_snapshot: "verified", delivery_charge: 0, tax_amount: 0, tax_percent: 0, lead_time_days: null, notes: "", status: "received", created_at: "", updated_at: "", quote_comparison_prices: [{ bid_id: id, item_id: item.id, unit_price: price, is_available: available, notes }] }
}
const bids = [bid("higher", 20), bid("unknown", null), bid("lowest", 10), bid("review", 1, true, "Unrelated product"), bid("unavailable", null, false)]
const row = (selection = "") => buildProductQuotePreview([item], bids, { [item.id]: selection }).rows[0]

test("only the eligible lowest offer is initially prominent, without selecting it", () => {
  const source = row()
  const before = JSON.stringify(source)
  const sections = productQuoteCardSections(source)
  expect(sections.primary.map((offer) => offer.bid.id)).toEqual(["lowest"])
  expect(sections.other.map((offer) => offer.bid.id)).toContain("review")
  expect(sections.reviewCount).toBe(1)
  expect(source.selected).toBeNull()
  expect(JSON.stringify(source)).toBe(before)
})

test("manual override stays visible alongside cheapest and every other quote stays reachable", () => {
  const source = row("higher")
  const { primary, other } = productQuoteCardSections(source)
  expect(primary.map((offer) => offer.bid.id)).toEqual(["lowest", "higher"])
  expect([...primary, ...other].map((offer) => offer.bid.id).sort()).toEqual(bids.map((entry) => entry.id).sort())
  expect(source.selected?.lineTotal).toBe(40)
})

test("SSR renders collapsed secondary quotes with accessible radios and full specs", () => {
  const html = renderToStaticMarkup(createElement(serverExports.ProductQuoteCard, { row: row(), onSelect: () => {}, onClear: () => {} }))
  expect(html).toContain(item.description)
  expect(html).toContain(item.specification)
  expect(html).toContain("Other quotes (4)")
  expect(html).toContain("1 need review")
  expect(html).not.toMatch(/<details[^>]*\sopen(?:=|\s|>)/)
  expect(html.match(/type="radio"/g)).toHaveLength(5)
  expect(html.match(/disabled=""/g)).toHaveLength(3)
  expect(html).toContain("Match needs review · excluded")
  expect(html).toContain("Availability unknown")
  expect(html).toContain("Marked unavailable")
})

test("no eligible or no supplier prices have truthful compact empty states", () => {
  const unknownRow = buildProductQuotePreview([item], [bid("unknown", null)]).rows[0]
  expect(productQuoteCardSections(unknownRow).primary).toHaveLength(0)
  const html = renderToStaticMarkup(createElement(serverExports.ProductQuoteCard, { row: unknownRow, onSelect: () => {}, onClear: () => {} }))
  expect(html).toContain("No confirmed price yet.")
  expect(html).toContain("Supplier responses (1)")
  const emptyRow = buildProductQuotePreview([item], []).rows[0]
  expect(renderToStaticMarkup(createElement(serverExports.ProductQuoteCard, { row: emptyRow, onSelect: () => {}, onClear: () => {} }))).toContain("No supplier quotes yet.")
})

test("workspace keeps draft warning and existing cheapest computation, not award or autosave", async () => {
  const workspace = await readFile("components/buildflow/quote-comparison-workspace.tsx", "utf8")
  const card = await readFile("components/buildflow/product-quote-card.tsx", "utf8")
  expect(workspace).toContain("setProductSelections(productPreview.cheapestSelections)")
  expect(workspace).toContain("Temporary preview · Not saved")
  expect(workspace).toContain("Materials only. Excludes delivery and tax.")
  expect(card).not.toContain("Action(")
  expect(card).not.toContain("useEffect")
  expect(card).toContain("focus({ preventScroll: true })")
})
