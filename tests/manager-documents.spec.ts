import { readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

import {
  catalogLineFailureMessage,
  reviewedDocumentCatalogDepartment,
  reviewedDocumentPriceRow,
} from "../lib/manager-document-catalog"
import { documentArithmeticWarnings, documentLineValidationStatus, isManagerDocumentChargeLine, isObsoleteSelectionSubtotalWarning } from "../lib/manager-document-validation"

const root = process.cwd()

test("document center preserves originals and gates every destination behind review", async () => {
  const [migration, approvalMigration, sourceMigration, indexMigration, departmentMigration, actions, catalogImport, page, review, upload, shell, toolsPage, documents, edgeFunction] = await Promise.all([
    readFile(path.join(root, "supabase/migrations/20260827143000_create_manager_document_center.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260827144500_restrict_document_financial_approval.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260827151000_add_document_sources_and_staff_approval.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260827152500_index_manager_document_relationships.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260827182029_add_manager_document_department_suggestion.sql"), "utf8"),
    readFile(path.join(root, "app/admin/documents/actions.ts"), "utf8"),
    readFile(path.join(root, "lib/manager-document-catalog.ts"), "utf8"),
    readFile(path.join(root, "app/admin/documents/page.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/manager-document-review.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/manager-document-upload.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/admin-shell.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/ai-tools/page.tsx"), "utf8"),
    readFile(path.join(root, "lib/manager-documents.ts"), "utf8"),
    readFile(path.join(root, "supabase/functions/manager-document-ocr/index.ts"), "utf8"),
  ])
  expect(migration).toContain("create table if not exists public.manager_documents")
  expect(migration).toContain("create table if not exists public.manager_document_items")
  expect(migration).toContain("create table if not exists public.manager_document_events")
  expect(migration).toContain("'manager-documents', 'manager-documents', false")
  expect(migration).toContain("enable row level security")
  expect(migration).toContain("legacy_supplier_quote_id")
  expect(migration).toContain("on conflict (legacy_supplier_quote_id) do nothing")
  expect(approvalMigration).toContain("Only the owner can approve or route a manager document")
  expect(approvalMigration).toContain("private.is_admin()")
  expect(sourceMigration).toContain("private.has_staff_capability('suppliers')")
  expect(sourceMigration).toContain("source_group_id")
  expect(sourceMigration).toContain("client_invoice")
  expect(indexMigration).toContain("manager_documents_project_id_idx")
  expect(indexMigration).toContain("manager_document_events_created_by_idx")
  expect(departmentMigration).toContain("suggested_department")
  expect(departmentMigration).toContain("set department = 'Test'")
  expect(actions.indexOf(`.from(MANAGER_DOCUMENT_BUCKET).upload`)).toBeLessThan(actions.indexOf("extraction = await runDocumentExtraction"))
  expect(actions).toContain("sourceSha256")
  expect(actions).toContain("This exact document is already in Documents")
  expect(actions).toContain("prepareManagerDocumentUploadAction")
  expect(actions).toContain("completeManagerDocumentUploadAction")
  expect(actions).toContain("createSignedUploadUrl")
  expect(actions).toContain("The saved original was re-read with AI")
  expect(actions).toContain('status: "processing"')
  expect(actions).toContain("Nothing was sent to another part of Avantia")
  expect(actions).toContain("Approve the reviewed document before sending it to supplier pricing")
  expect(actions).toContain('requireStaffProfile("suppliers")')
  expect(actions).toContain("source_channel: sourceChannel")
  expect(actions).toMatch(/functions\.invoke\(\s*"manager-document-ocr"/)
  expect(actions).toContain('const INTAKE_DEPARTMENT = "Test"')
  expect(actions).toContain("suggested_department")
  expect(actions).toContain("quantity × unit price")
  expect(page).toContain("One private inbox")
  expect(page).toContain("The original remains here even after information is routed")
  expect(page).toContain('select("*", { count: "exact" })')
  expect(page).toContain('value: "archived"')
  expect(page).toContain('name="q"')
  expect(page).toContain('name="status"')
  expect(page).toContain('name="type"')
  expect(page).toContain("PAGE_SIZE = 50")
  expect(page).not.toContain('.neq("status", "archived")')
  expect(page).not.toContain(".limit(250)")
  expect(review).toContain("Finish review")
  expect(review).toContain("Sources and field evidence")
  expect(review).toContain("Math mismatch")
  expect(review).toContain("Save & approve")
  expect(review).toContain("Supplier code")
  expect(review).toContain("Use suggested:")
  expect(review).toContain("selectedProductCount")
  expect(review).toMatch(/<h2[^>]*>\s*Items\s*<\/h2>/)
  expect(review).toContain("Import selected")
  expect(review).toContain("Select all")
  expect(review).toContain("Clear")
  expect(review).toContain("selectionChanged")
  expect(review).toMatch(/lowest reviewed price is\s*kept/)
  expect(review).toContain("Catalog pricing is saved")
  expect(actions).toContain("addManagerDocumentItemsToCatalogAction")
  expect(actions).toContain("usedCodes")
  expect(actions).toContain("DOC-${document.id.slice(0, 8).toUpperCase()}")
  expect(actions).not.toContain("byCode.get(catalogItemKey(item.item_code))")
  expect(catalogImport).toContain("supplier_sku: clean(item.item_code")
  expect(catalogImport).toContain("source_document_id: document.id")
  expect(actions).toContain("candidateGroups")
  expect(actions).toContain("Lowest of ${group.length} selected quote rows")
  expect(actions).toContain("Select at least one dependable supplier item")
  expect(review).toContain("Approved manager access is required")
  expect(review).toContain("Ignore source")
  expect(review).toContain("Use source")
  expect(review).toContain("Choose destination")
  expect(review).toContain('routeQuote("client")')
  expect(review).toContain('routeQuote("comparison")')
  expect(review).toContain("createClientQuoteFromSupplierQuoteAction")
  expect(review).toContain("sendSupplierQuoteToComparisonAction")
  expect(review).toContain("routed.data.itemIds")
  expect(actions).toContain('itemIds: linkedItems.map((item) => item.id)')
  expect(actions).toContain('["ready", "routed"].includes(document.status)')
  expect(actions).toMatch(/\.select\("id"\)\s*\.returns<Array<\{ id: string \}>>\(\)/)
  expect(actions).toContain("Nothing was routed")
  expect(upload).toContain("Upload once")
  expect(upload).toContain("uploadToSignedUrl")
  expect(upload).toContain("The upload stopped before the document opened")
  expect(upload).toContain("no automatic posting")
  expect(upload).not.toContain("Starting department")
  expect(upload).toContain('name="department" value="Test"')
  expect(shell).toContain('href: "/admin/documents"')
  expect(toolsPage).toContain('href: "/admin/documents"')
  expect(toolsPage).toContain("Manager Tools")
  expect(documents).toContain("Client invoice · outgoing")
  expect(edgeFunction).toContain("openai_supplier_quote_api_key")
  expect(edgeFunction).toContain("can_manage_suppliers")
})

test("document intelligence keeps evidence and catches line and total mismatches", () => {
  const item = { description: "Water heater", quantity: 2, unitPrice: 100, lineTotal: 190, confidence: 0.96 }
  expect(documentLineValidationStatus(item)).toBe("mismatch")
  const warnings = documentArithmeticWarnings({ items: [item], subtotal: 200, discount: 0, deliveryCharge: 10, taxAmount: 17, total: 250 })
  expect(warnings).toContain("One or more line totals do not equal quantity × unit price.")
  expect(warnings.some((warning) => warning.includes("printed total"))).toBeTruthy()
})

test("document intelligence keeps charges and tax out of product rows", () => {
  for (const charge of ["Delivery Fee", "Shipping Charge", "Freight", "Sales Tax", "Grand Total", "Balance Due", "Payments/Credits"]) {
    expect(isManagerDocumentChargeLine(charge)).toBeTruthy()
  }
  expect(isManagerDocumentChargeLine("White Oak flooring")).toBeFalsy()
})

test("choosing one catalog product does not keep the obsolete partial-subtotal warning", () => {
  expect(isObsoleteSelectionSubtotalWarning("Selected lines add to $235.00, but subtotal is $746.95.")).toBeTruthy()
  expect(isObsoleteSelectionSubtotalWarning("All line totals add to $235.00, but subtotal is $746.95.")).toBeFalsy()
})

test("reviewed Firecode drywall line keeps supplier pricing and original PDF evidence", () => {
  const document = {
    id: "11111111-1111-4111-8111-111111111111",
    department: "drywall",
    suggested_department: "Sheet Rock",
    document_number: "28104219-00",
    document_date: "2026-08-25",
    expires_on: "2026-09-25",
    file_name: "fbm-quote-28104219.pdf",
  }
  const item = {
    id: "22222222-2222-4222-8222-222222222222",
    line_number: 5,
    item_code: "TTX-1110",
    description: "5/8 in. x 4 ft. x 8 ft. Firecode X Drywall",
    specification: "Type X, smooth face",
    quantity: 1,
    unit: "MLF",
    unit_price: 185,
    line_total: 185,
    source_page: 1,
    source_text: "5 1.00 PC TTX-1110 4.0 1,000 MLF 185.00",
  }

  expect(reviewedDocumentCatalogDepartment(document)).toBe("Sheet Rock")
  const price = reviewedDocumentPriceRow({
    document,
    item,
    catalogItem: { id: "33333333-3333-4333-8333-333333333333", package_quantity: 1, comparison_quantity: 1 },
    supplier: { id: "fbm-branch-281", name: "Foundation Building Materials (FBM) Branch 281" },
    userId: "44444444-4444-4444-8444-444444444444",
    now: "2026-08-30T18:45:00.000Z",
  })

  expect(price).not.toBeNull()
  expect(price).toMatchObject({
    supplier_id: "fbm-branch-281",
    supplier_name_snapshot: "Foundation Building Materials (FBM) Branch 281",
    supplier_sku: "TTX-1110",
    unit_price: 185,
    source_document_date: "2026-08-25",
    source_quantity: 1,
    source_unit: "MLF",
    source_line_total: 185,
    source_page: 1,
    source_text: "5 1.00 PC TTX-1110 4.0 1,000 MLF 185.00",
  })
  expect(price?.notes).toContain("supplier code TTX-1110")
  expect(price?.notes).toContain("quantity 1 MLF")
})

test("catalog routing rejects invented departments and reports the exact failed reviewed line", () => {
  expect(reviewedDocumentCatalogDepartment({ department: "Department 1", suggested_department: "drywall" })).toBe("Sheet Rock")
  expect(reviewedDocumentCatalogDepartment({ department: "Department 1", suggested_department: "mystery" })).toBe("Others")
  expect(catalogLineFailureMessage({
    item: { line_number: 5, item_code: "TTX-1110", description: "5/8 in. x 4 ft. x 8 ft. Firecode X Drywall" },
    step: "item",
    code: "23505",
  })).toBe("Line 5 — 5/8 in. x 4 ft. x 8 ft. Firecode X Drywall (supplier code TTX-1110): A catalog item with the same name or internal code already exists; reload the document and retry so Avantia can match it.")
})

test("mixed reviewed supplier rows keep their own code, quantity, unit, price, and evidence", () => {
  const document = {
    id: "11111111-1111-4111-8111-111111111111",
    department: "Siding",
    suggested_department: "Siding",
    document_number: "28104219-00",
    document_date: "2026-08-25",
    expires_on: null,
    file_name: "fbm-mixed-products.pdf",
  }
  const rows = [
    { id: "a", line_number: 1, item_code: "GAP-531667", description: "GAF Grand Sequoia", specification: "", quantity: 480, unit: "PC", unit_price: 9.35, line_total: 4488, source_page: 1, source_text: "GAP-531667 480 PC 9.35 4488" },
    { id: "b", line_number: 2, item_code: "TVH-HW9150", description: "Housewrap", specification: "", quantity: 5, unit: "RL", unit_price: 261.4, line_total: 1307, source_page: 1, source_text: "TVH-HW9150 5 RL 261.40 1307" },
  ]
  const prices = rows.map((item, index) => reviewedDocumentPriceRow({
    document,
    item,
    catalogItem: { id: `catalog-${index}`, package_quantity: 1, comparison_quantity: 1 },
    supplier: { id: "fbm-281", name: "FBM Branch 281" },
    userId: "manager",
    now: "2026-08-30T18:45:00.000Z",
  }))
  expect(prices.map((price) => [price?.supplier_sku, price?.source_quantity, price?.source_unit, price?.unit_price, price?.source_document_date])).toEqual([
    ["GAP-531667", 480, "PC", 9.35, "2026-08-25"],
    ["TVH-HW9150", 5, "RL", 261.4, "2026-08-25"],
  ])
})

test("catalog evidence migration archives every reviewed source field", async () => {
  const [migration, actions, catalogPage] = await Promise.all([
    readFile(path.join(root, "supabase/migrations/20260830184500_preserve_document_catalog_line_evidence.sql"), "utf8"),
    readFile(path.join(root, "app/admin/documents/actions.ts"), "utf8"),
    readFile(path.join(root, "app/admin/catalog/page.tsx"), "utf8"),
  ])
  for (const field of ["source_quantity", "source_unit", "source_line_total", "source_page", "source_text"]) {
    expect(migration).toContain(`add column if not exists ${field}`)
    expect(migration).toContain(`old.${field}`)
    expect(actions).toContain(field)
    expect(catalogPage).toContain(field)
  }
  expect(actions).toContain("bySupplierCode")
  expect(actions).toContain("reviewedDocumentCatalogDepartment(document)")
  expect(actions).toContain("catalogLineFailureMessage")
})
