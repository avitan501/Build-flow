import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"

import { parseSupplierQuoteText } from "../lib/supplier-quote-parser"
import { normalizeSupplierQuoteAiPayload } from "../lib/supplier-quote-ai"

const root = process.cwd()

test("manager supplier quote storage is private, durable, and routable", async () => {
  const [navigation, page, uploadForm, workspace, actions, migration, clientMigration] = await Promise.all([
    readFile(path.join(root, "components/buildflow/admin-shell.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/supplier-quotes/page.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/supplier-quote-upload-form.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/supplier-quote-workspace.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/supplier-quotes/actions.ts"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260820110800_create_supplier_quote_storage.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260820160124_link_supplier_quotes_to_clients.sql"), "utf8"),
  ])

  expect(navigation).toContain('href: "/admin/supplier-quotes"')
  expect(navigation).toContain('label: "Supplier Quotes"')
  expect(page).toContain('requireStaffProfile("suppliers")')
  expect(actions).toContain('requireStaffProfile("suppliers")')
  expect(actions).toContain("extractSupplierQuoteFile")
  expect(actions).toContain("extraction.metadata.quoteNumber")
  expect(actions).toContain("addSupplierQuoteItemsToCatalogAction")
  expect(actions).toContain("sendSupplierQuoteToComparisonAction")
  expect(actions).toContain("createClientQuoteFromSupplierQuoteAction")
  expect(actions).toContain("retrySupplierQuoteExtractionAction")
  expect(actions).toContain(".download(quote.file_path)")
  expect(actions).toContain('client_id: client.id')
  expect(actions).toContain('client_name_snapshot: clientName')
  expect(uploadForm).toContain("Choose client")
  expect(uploadForm).toContain("+ Add new client")
  expect(uploadForm).toContain('name="clientSelection" required')
  expect(page).toContain("client_name_snapshot")
  expect(page).toContain('aria-label="Filter supplier quotes"')
  expect(page).toContain('name="supplier"')
  expect(page).toContain('name="client"')
  expect(page).toContain('name="date" type="date"')
  expect(page).toContain("No quotes match these filters")
  expect(workspace).toContain("quote.client_name_snapshot")
  expect(workspace).toContain("Add to catalog")
  expect(workspace).toContain("Compare suppliers")
  expect(workspace).toContain("Prepare client quote")
  expect(workspace).toContain("Extract invoice")
  expect(workspace).toContain("Original invoice")
  expect(migration).toContain("create table if not exists public.supplier_quotes")
  expect(migration).toContain("create table if not exists public.supplier_quote_items")
  expect(migration).toContain("'supplier-quotes'")
  expect(migration).toContain("public = false")
  expect(migration).toContain("private.has_staff_capability('suppliers')")
  expect(migration).toContain("enable row level security")
  expect(clientMigration).toContain("references public.profiles(id) on delete set null")
  expect(clientMigration).toContain("supplier_quotes_client_updated_idx")
  expect(page).toContain("Boolean(process.env.OPENAI_API_KEY)")
  expect(await readFile(path.join(root, "components/buildflow/supplier-quote-upload-form.tsx"), "utf8")).toContain("Scanned-image OCR is waiting for AI activation.")
})

test("supplier quote AI payload is normalized before database insertion", async () => {
  const result = normalizeSupplierQuoteAiPayload({
    metadata: {
      supplierName: "  Nassau Lumber  ",
      quoteNumber: " Q-1048 ",
      quoteDate: "08/20/2026",
      expiresOn: "2026-09-20",
      department: "Framing",
      deliveryCharge: "125.50",
      taxPercent: 108,
      subtotal: 400,
      total: 525.5,
    },
    items: [
      { itemCode: "PLY-1", description: "  1/2 in. plywood  ", specification: "4 x 8", quantity: "12", unit: "sheet", unitPrice: "22.50", lineTotal: null },
      { itemCode: "", description: "Delivery", specification: "", quantity: 1, unit: "each", unitPrice: 55, lineTotal: 55 },
    ],
    notes: " Review scan ",
  })

  expect(result.metadata).toMatchObject({ supplierName: "Nassau Lumber", quoteNumber: "Q-1048", quoteDate: "", expiresOn: "2026-09-20", deliveryCharge: 125.5, taxPercent: 100 })
  expect(result.items[0]).toMatchObject({ description: "1/2 in. plywood", quantity: 12, unitPrice: 22.5, lineTotal: 270 })
  expect(result.items).toHaveLength(1)
  expect(result.notes).toBe("Review scan")
})

test("supplier quote AI extraction uses a cost-controlled model and does not retain responses", async () => {
  const extraction = await readFile(path.join(root, "lib/supplier-quote-ai.ts"), "utf8")
  expect(extraction).toContain('process.env.OPENAI_SUPPLIER_QUOTE_MODEL || "gpt-5-mini"')
  expect(extraction).toContain("store: false")
  expect(extraction).toContain('reasoning: { effort: "low" }')
  expect(extraction).toContain('type: "json_schema"')
  expect(extraction).toContain('detail: "high"')
  expect(extraction).toContain("if (extractedText.trim())")
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
