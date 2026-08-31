import { access, readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

const root = process.cwd()
const pagePath = path.join(root, "app/owner/materials/requests/[requestId]/page.tsx")
const worktablePath = path.join(root, "components/buildflow/request-material-worktable.tsx")
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
