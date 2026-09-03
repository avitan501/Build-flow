import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"

import {
  matchSupplierQuoteItems,
  requestItemSpecification,
  resolveExplicitSupplierSelection,
} from "../lib/supplier-quote-routing"

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
