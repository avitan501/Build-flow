import { readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

import { documentArithmeticWarnings, documentLineValidationStatus, isManagerDocumentChargeLine } from "../lib/manager-document-validation"

const root = process.cwd()

test("document center preserves originals and gates every destination behind review", async () => {
  const [migration, approvalMigration, sourceMigration, indexMigration, departmentMigration, actions, page, review, upload, shell, toolsPage, documents, edgeFunction] = await Promise.all([
    readFile(path.join(root, "supabase/migrations/20260827143000_create_manager_document_center.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260827144500_restrict_document_financial_approval.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260827151000_add_document_sources_and_staff_approval.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260827152500_index_manager_document_relationships.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260827182029_add_manager_document_department_suggestion.sql"), "utf8"),
    readFile(path.join(root, "app/admin/documents/actions.ts"), "utf8"),
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
  expect(actions).toContain("The saved original was re-read with AI")
  expect(actions).toContain('status: "processing"')
  expect(actions).toContain("Nothing was sent to another part of Avantia")
  expect(actions).toContain("Approve the reviewed document before sending it to supplier pricing")
  expect(actions).toContain('requireStaffProfile("suppliers")')
  expect(actions).toContain("source_channel: sourceChannel")
  expect(actions).toContain('functions.invoke("manager-document-ocr"')
  expect(actions).toContain('const INTAKE_DEPARTMENT = "Test"')
  expect(actions).toContain("suggested_department")
  expect(actions).toContain("quantity × unit price")
  expect(page).toContain("One private inbox")
  expect(page).toContain("The original remains here even after information is routed")
  expect(review).toContain("Finish review")
  expect(review).toContain("Sources and field evidence")
  expect(review).toContain("Math mismatch")
  expect(review).toContain("Save & approve")
  expect(review).toContain("Supplier code")
  expect(review).toContain("Use suggested:")
  expect(review).toContain("Add {selectedLines.length} selected item")
  expect(actions).toContain("addManagerDocumentItemsToCatalogAction")
  expect(actions).toContain("usedCodes")
  expect(actions).toContain("DOC-${document.id.slice(0, 8).toUpperCase()}")
  expect(actions).not.toContain("byCode.get(catalogItemKey(item.item_code))")
  expect(actions).toContain("supplier_sku: clean(item.item_code")
  expect(actions).toContain("source_document_id: document.id")
  expect(actions).toContain("Select at least one dependable supplier item")
  expect(review).toContain("Approved manager access is required")
  expect(review).toContain("Ignore source")
  expect(review).toContain("Use source")
  expect(review).toContain("Choose destination")
  expect(upload).toContain("Upload once")
  expect(upload).toContain("no automatic posting")
  expect(upload).not.toContain("Starting department")
  expect(upload).toContain('name="department" value="Test"')
  expect(shell).not.toContain('href: "/admin/documents"')
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
