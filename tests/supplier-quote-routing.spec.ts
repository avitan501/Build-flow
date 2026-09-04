import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"

import {
  effectiveRequestComparisonItems,
  matchSupplierQuoteItems,
  planRequestComparisonSync,
  requestItemSpecification,
  resolveExplicitSupplierSelection,
} from "../lib/supplier-quote-routing"

test("stale comparison rows are reconciled to the current AI-organized request before matching", () => {
  const requestItems = [
    { id: "original", name: "6 rolls underlayment", quantity: 6, unit: "rolls", department: "Flooring", metadata: {} },
    { id: "flooring", name: "Engineered white oak flooring", quantity: 1200, unit: "sq. ft.", department: "Flooring", metadata: { ai_organized: true, source_item_id: "original", dimensions: "7 in wide" } },
    { id: "adhesive", name: "Flooring adhesive", quantity: 12, unit: "buckets", department: "Flooring", metadata: { ai_organized: true, source_item_id: "original" } },
    { id: "underlayment", name: "Flooring underlayment", quantity: 6, unit: "rolls", department: "Flooring", metadata: { ai_organized: true, source_item_id: "original" } },
  ]
  const staleComparison = [{
    id: "stale",
    source_request_item_id: "original",
    description: "Flooring underlayment",
    specification: "Flooring",
    markup_percent: 4,
    client_unit_price: 60,
  }]

  expect(effectiveRequestComparisonItems(requestItems).map((item) => item.id)).toEqual([
    "flooring",
    "adhesive",
    "underlayment",
  ])
  const plan = planRequestComparisonSync(requestItems, staleComparison)
  expect(plan.missingItems.map((item) => item.id)).toEqual(["flooring", "adhesive", "underlayment"])
  expect(plan.obsoleteItems.map((item) => item.id)).toEqual(["stale"])
  expect(plan.semanticTransfers).toEqual([
    { item: expect.objectContaining({ id: "underlayment" }), comparisonItem: staleComparison[0] },
  ])

  const currentComparison = plan.currentItems.map((item) => ({
    id: item.id,
    description: item.name,
    specification: requestItemSpecification(item.metadata, item.department),
  }))
  const supplierRows = [
    { id: "q1", description: "Engineered white oak flooring", specification: "7 in wide" },
    { id: "q2", description: "Flooring adhesive", specification: "" },
    { id: "q3", description: "Flooring underlayment", specification: "" },
  ]
  expect(matchSupplierQuoteItems(supplierRows, currentComparison)).toHaveLength(3)
})

test("explicit supplier selection accepts directory slugs and derives the trusted name", () => {
  const directory = [
    { id: "rio-supply", name: "Rio Supply" },
    { id: "fbm-branch-281", name: "Foundation Building Materials" },
  ]

  expect(resolveExplicitSupplierSelection(directory, " fbm-branch-281 ")).toEqual({
    id: "fbm-branch-281",
    name: "Foundation Building Materials",
  })
  expect(resolveExplicitSupplierSelection(directory, "forged-supplier")).toBeNull()
})

test("supplier upload validates the selected id against the server directory and ignores a client name", async () => {
  const root = process.cwd()
  const [actions, form] = await Promise.all([
    readFile(path.join(root, "app/admin/supplier-quotes/actions.ts"), "utf8"),
    readFile(path.join(root, "components/buildflow/supplier-quote-upload-form.tsx"), "utf8"),
  ])

  expect(actions).toContain('supabase.rpc(\n      "staff_load_catalog_suppliers"')
  expect(actions).toContain("resolveExplicitSupplierSelection")
  expect(actions).not.toContain('clean(formData.get("supplierName"), 200)')
  expect(form).not.toContain('formData.set("supplierName"')
})

test("supplier detection safely recognizes FW Webb naming variants", async () => {
  const { detectSupplierMatch } = await import("../lib/supplier-quote-supplier")
  const directory = [
    { id: "fw-webb-water-works", name: "FW WEBB water works" },
    { id: "rio", name: "Rio Supply" },
  ]
  expect(detectSupplierMatch(directory, "F.W. Webb Company", "F.W. Webb Company\nQUOTATION 10883")).toEqual(directory[0])
})

test("supplier detection refuses an equally strong ambiguous directory match", async () => {
  const { detectSupplierMatch } = await import("../lib/supplier-quote-supplier")
  expect(detectSupplierMatch([
    { id: "first", name: "Modern Window Manufacturing" },
    { id: "second", name: "Modern Window Manufacturing" },
  ], "Modern Window Manufacturing", "quote")).toBeNull()
})

test("quote review provides a safe supplier select or create path and routing retries a current match", async () => {
  const root = process.cwd()
  const [actions, workspace, page] = await Promise.all([
    readFile(path.join(root, "app/admin/supplier-quotes/actions.ts"), "utf8"),
    readFile(path.join(root, "components/buildflow/supplier-quote-workspace.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/supplier-quotes/[quoteId]/page.tsx"), "utf8"),
  ])
  expect(actions).toContain("findAndPersistQuoteSupplier")
  expect(actions).toContain("assignSupplierQuoteDirectoryAction")
  expect(actions).toContain("createAndAssignSupplierQuoteDirectoryAction")
  expect(workspace).toContain('aria-label="Supplier Directory record"')
  expect(workspace).toContain("Prices remain isolated under the supplier you confirm.")
  expect(page).toContain('supabase.rpc("staff_load_catalog_suppliers")')
})

test("request specifications preserve the fields needed to distinguish same-name materials", () => {
  expect(requestItemSpecification({
    product_type: "Regular SPF",
    dimensions: "2 x 4 x 8 ft",
    thickness: "1.5 in",
    request_details: "Stud grade",
  }, "Framing")).toBe("Regular SPF · 2 x 4 x 8 ft · 1.5 in · Stud grade")
  expect(requestItemSpecification({}, "Framing")).toBe("Framing")
})

test("duplicate material names match one-to-one by specification", () => {
  const requestItems = [
    { id: "request-regular", description: "2 x 4 x 8 stud", specification: "Regular SPF" },
    { id: "request-treated", description: "2 x 4 x 8 stud", specification: "Pressure-treated" },
  ]
  const quoteItems = [
    { id: "quote-treated", item_code: "PT-248", description: "2 x 4 x 8 stud", specification: "Pressure-treated" },
    { id: "quote-regular", item_code: "SPF-248", description: "2 x 4 x 8 stud", specification: "Regular SPF" },
  ]

  expect(matchSupplierQuoteItems(quoteItems, requestItems)).toEqual([
    { item: quoteItems[0], comparisonItem: requestItems[1] },
    { item: quoteItems[1], comparisonItem: requestItems[0] },
  ])
})

test("supplier quote matching understands English and Spanish drywall wording without crossing specifications", () => {
  const requests = [
    { id: "regular", description: "Sheet rok", specification: "5/8 in · 4 x 8 ft · Regular" },
    { id: "fire", description: "Drywall", specification: "5/8 in · 4 x 8 ft · Type X fire rated" },
    { id: "other-size", description: "Drywall", specification: "1/2 in · 4 x 8 ft · Regular" },
  ]
  const quote = [
    { id: "spanish-regular", description: "Panel de yeso", specification: "5/8 in · 4 x 8 ft · Regular" },
    { id: "english-fire", description: "Sheetrock", specification: "5/8 in · 4 x 8 ft · Type X fire rated" },
  ]

  expect(matchSupplierQuoteItems(quote, requests)).toEqual([
    { item: quote[0], comparisonItem: requests[0] },
    { item: quote[1], comparisonItem: requests[1] },
  ])
})

test("partial supplier quotes match only present lines and leave the rest of the request untouched", () => {
  const requests = [
    { id: "drywall", description: "Drywall", specification: "5/8 in · 4 x 8 ft · Regular" },
    { id: "screws", description: "Drywall screws", specification: "1 1/4 in" },
  ]
  const quote = [{ id: "only-drywall", description: "Sheetrock", specification: "5/8 in · 4 x 8 ft · Regular" }]
  expect(matchSupplierQuoteItems(quote, requests)).toEqual([{ item: quote[0], comparisonItem: requests[0] }])
})

test("does not auto-route an unspecified supplier line onto a sized client row", () => {
  const requests = [{ id: "rated", description: "Drywall", specification: "5/8 in · Type X fire rated" }]
  const quote = [{ id: "unspecified", description: "Drywall", specification: "" }]
  expect(matchSupplierQuoteItems(quote, requests)).toEqual([])
})
