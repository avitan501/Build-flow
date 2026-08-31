import { access, readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

import { comparisonItemForRequestSources } from "@/lib/request-worktable-matching"

const root = process.cwd()
const pagePath = path.join(root, "app/owner/materials/requests/[requestId]/page.tsx")
const worktablePath = path.join(root, "components/buildflow/request-material-worktable.tsx")
const supplierQuoteActionsPath = path.join(root, "app/admin/supplier-quotes/actions.ts")
const documentActionsPath = path.join(root, "app/admin/documents/actions.ts")
const migrationPath = path.join(root, "supabase/migrations/20260831154500_link_comparison_items_to_request_sources.sql")
const managementPath = path.join(root, "components/buildflow/request-management-panel.tsx")

async function source(filePath: string) {
  try {
    await access(filePath)
    return await readFile(filePath, "utf8")
  } catch {
    return ""
  }
}

test("review and organization are one compact three-column material work table", async () => {
  const [page, worktable] = await Promise.all([source(pagePath), source(worktablePath)])

  expect(page, "the request page should render the combined work table").toContain("RequestMaterialWorktable")
  expect(worktable, "the combined work table component is required").not.toBe("")
  expect(worktable).toContain("<table")
  expect(worktable).toContain("Copy original")
  expect(worktable).toContain("Copy AI")
  expect(worktable).toMatch(/<th[\s\S]*Copy original request column[\s\S]*<\/th>/)
  expect(worktable).toMatch(/<th[\s\S]*Copy AI organized column[\s\S]*<\/th>/)
  expect(worktable).toContain("md:sticky md:left-0")
  expect(worktable).toContain("min-h-11")
  expect(worktable).toContain('aria-live="polite"')
  expect(worktable).toContain("aiCoversEverySource")
  expect(worktable).toContain("focus-visible:ring-2")
  expect(worktable).toContain("AI organized")
  expect(worktable).toContain("overflow-x-auto")
  expect(worktable).toMatch(/Quantity/)
  expect(worktable).toMatch(/Item details|AI organized/)
  expect(worktable).toMatch(/Missing info|AI notes/)
  expect(worktable).toContain("<tbody")

  expect(page, "steps 1 and 2 must not remain as separate expandable cards").not.toContain('title="Review client list"')
  expect(page, "steps 1 and 2 must not remain as separate expandable cards").not.toContain('title="Organize request"')
  expect(page, "original items should not be repeated below the combined table").not.toContain("Original request & files")
})

test("comparison rows preserve exact request and supplier quote provenance", async () => {
  const [page, worktable, supplierActions, documentActions, migration] = await Promise.all([
    source(pagePath),
    source(worktablePath),
    source(supplierQuoteActionsPath),
    source(documentActionsPath),
    source(migrationPath),
  ])

  expect(migration).toContain("source_request_item_id uuid")
  expect(migration).toContain("quote_comparison_items_source_request_uidx")
  expect(migration).toContain("comparison item source must belong to the same request")
  expect(migration).toContain("source_request_item_id cannot be changed once linked")
  expect(migration).toContain("pg_trigger_depth() > 1")
  expect(migration.indexOf("source_request_item_id cannot be changed once linked")).toBeLessThan(
    migration.indexOf("if new.source_request_item_id is null then\n    return new"),
  )
  expect(supplierActions).toContain("source_request_item_id: item.id")
  expect(supplierActions).toContain("metadata?.ai_organized === true")
  expect(supplierActions).toContain("const comparisonItems = organizedItems.length")
  expect(documentActions).toContain("source_request_item_id: item.id")
  expect(worktable).not.toContain("comparisonWords")
  expect(page).toContain("bid.source_supplier_quote_id")
  expect(page).not.toContain("bid.notes.includes")
})

test("supplier prices require an exact immutable request-row source", () => {
  const exact = { id: "exact", sourceRequestItemId: "request-item" }
  const similarTextOnly = { id: "similar", sourceRequestItemId: null }

  expect(comparisonItemForRequestSources(["request-item"], [similarTextOnly, exact])?.id).toBe("exact")
  expect(comparisonItemForRequestSources(["request-item"], [similarTextOnly])).toBeNull()
  expect(comparisonItemForRequestSources([], [exact])).toBeNull()
})

test("an original-row price never fans out to multiple AI child rows", () => {
  const originalPriceRow = { id: "priced-original", sourceRequestItemId: "original-row" }

  expect(comparisonItemForRequestSources(["ai-child-one"], [originalPriceRow])).toBeNull()
  expect(comparisonItemForRequestSources(["ai-child-two"], [originalPriceRow])).toBeNull()
})

test("AI controls and notes appear only on rows that are actually missing information", async () => {
  const worktable = await source(worktablePath)

  expect(worktable).toContain("materialReviewReasons")
  expect(worktable).toMatch(/reasons\.length\s*[?>]|reasons\.length\s*&&/)
  expect(worktable).toMatch(/Ask AI|Generate AI/)
  expect(worktable).toMatch(/status\s*!==\s*["']ready["']|status\s*===\s*["']missing["']/)
  expect(worktable, "ready rows must leave the third column clear instead of inventing a question").toMatch(/aria-label=["'{`][\s\S]*(?:No missing|Complete|Ready)/)
})

test("supplier quotes extend the same item grid as side-by-side comparison columns", async () => {
  const [page, worktable, management] = await Promise.all([
    source(pagePath),
    source(worktablePath),
    source(managementPath),
  ])

  expect(page).toContain("comparisonSummaries")
  expect(page).toMatch(/comparisons=\{comparisonSummaries\}|supplierComparisons=\{supplierComparisonTables\}/)
  expect(worktable).toMatch(/supplier|comparison/i)
  expect(worktable).toContain("RequestSupplierComparison")
  expect(worktable).toMatch(/supplierComparisons\.map/)
  expect(worktable).toMatch(/Unit price|Price/)
  expect(management, "supplier bids should not be isolated in repeated large comparison cards").not.toContain("comparisons.map((comparison) => <article")
})

test("client contact is available at the request header and does not consume step four", async () => {
  const [page, management] = await Promise.all([source(pagePath), source(managementPath)])

  expect(page).toMatch(/Contact client|Message client/)
  expect(page).toMatch(/mailto:|tel:|MessageSquareText|Mail|Phone/)
  expect(management).not.toContain("step={4}")
  expect(management).not.toContain('title="Contact client"')
  expect(management, "the same contact composer may be reused, but it belongs above the workflow").toMatch(/ClientContact|Contact client|Message client/)
})

test("missing-question generation preserves answers and never asks an answered question twice", async () => {
  const organizer = await source(path.join(root, "supabase/functions/client-material-list-ai/index.ts"))

  expect(organizer).toMatch(/already (?:provided|answered)|do not ask|never repeat/i)
  expect(organizer).toMatch(/sourceText|request_details|existing/i)
  expect(organizer).toMatch(/single missing|one .*question|one .*blocker/i)
})

test("generic dimensional lumber is forced out of Ready until wood type or grade is known", async () => {
  const [organizer, normalization] = await Promise.all([
    source(path.join(root, "supabase/functions/client-material-list-ai/index.ts")),
    source(path.join(root, "supabase/functions/client-material-list-ai/material-list-normalization.ts")),
  ])

  expect(normalization).toContain("dimensionalLumberNeedsType")
  expect(normalization).toMatch(/lumber|studs?/i)
  expect(normalization).toMatch(/pressure.*treated|doug(?:las)?.*fir|spf/i)
  expect(organizer).toContain("missingLumberType")
  expect(organizer).toMatch(/missingThickness\s*\|\|\s*missingLumberType/)
  expect(organizer).toContain("Lumber type is missing")
})

test("generic screws are forced out of Ready until required screw length is known", async () => {
  const [organizer, normalization] = await Promise.all([
    source(path.join(root, "supabase/functions/client-material-list-ai/index.ts")),
    source(path.join(root, "supabase/functions/client-material-list-ai/material-list-normalization.ts")),
  ])

  expect(normalization).toMatch(/fastenerNeedsLength|screwNeedsLength/)
  expect(normalization).toMatch(/screws?/i)
  expect(organizer).toMatch(/missingScrewLength|missingFastenerLength/)
  expect(organizer).toMatch(/reviewStatus\s*=[\s\S]*(?:missingScrewLength|missingFastenerLength)/)
  expect(organizer).toMatch(/Screw length is missing|Fastener length is missing/)
})

test("organizer asks exactly one unresolved blocker and excludes details already supplied", async () => {
  const organizer = await source(path.join(root, "supabase/functions/client-material-list-ai/index.ts"))

  expect(organizer).toMatch(/ask only one|one short.*question|single.*blocker/i)
  expect(organizer).toMatch(/never repeat|do not ask.*already|already answered/i)
  expect(organizer).toMatch(/extract every|already supplied|already provided/i)
  expect(organizer).toMatch(/sourceText|typedSource/)
})
