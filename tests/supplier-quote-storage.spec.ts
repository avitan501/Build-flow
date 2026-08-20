import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"

import { parseSupplierQuoteText } from "../lib/supplier-quote-parser"

const root = process.cwd()

test("manager supplier quote storage is private, durable, and routable", async () => {
  const [navigation, page, workspace, actions, migration] = await Promise.all([
    readFile(path.join(root, "components/buildflow/admin-shell.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/supplier-quotes/page.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/supplier-quote-workspace.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/supplier-quotes/actions.ts"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260820110800_create_supplier_quote_storage.sql"), "utf8"),
  ])

  expect(navigation).toContain('href: "/admin/supplier-quotes"')
  expect(navigation).toContain('label: "Supplier Quotes"')
  expect(page).toContain('requireStaffProfile("suppliers")')
  expect(actions).toContain('requireStaffProfile("suppliers")')
  expect(actions).toContain("extractSupplierQuoteFile")
  expect(actions).toContain("addSupplierQuoteItemsToCatalogAction")
  expect(actions).toContain("sendSupplierQuoteToComparisonAction")
  expect(actions).toContain("createClientQuoteFromSupplierQuoteAction")
  expect(workspace).toContain("Add to catalog")
  expect(workspace).toContain("Compare suppliers")
  expect(workspace).toContain("Prepare client quote")
  expect(migration).toContain("create table if not exists public.supplier_quotes")
  expect(migration).toContain("create table if not exists public.supplier_quote_items")
  expect(migration).toContain("'supplier-quotes'")
  expect(migration).toContain("public = false")
  expect(migration).toContain("private.has_staff_capability('suppliers')")
  expect(migration).toContain("enable row level security")
})

test("supplier quote parser recognizes common quantity and price rows", async () => {
  const rows = parseSupplierQuoteText([
    "ABC-204 12 sheets 1/2 in drywall 4 x 8 $14.50 $174.00",
    "2 x 4 x 10 framing lumber 25 pcs 7.25 181.25",
    "Delivery $125.00",
  ].join("\n"))

  expect(rows).toHaveLength(2)
  expect(rows[0]).toMatchObject({ itemCode: "ABC-204", quantity: 12, unit: "sheets", unitPrice: 14.5, lineTotal: 174 })
  expect(rows[1]).toMatchObject({ quantity: 25, unit: "each", unitPrice: 7.25, lineTotal: 181.25 })
})
