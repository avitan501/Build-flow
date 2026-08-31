import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import {
  catalogLineFailureMessage,
  reviewedDocumentCatalogDepartment,
  reviewedDocumentPriceRow,
} from "../lib/manager-document-catalog";
import {
  documentArithmeticWarnings,
  documentLineValidationStatus,
  isManagerDocumentChargeLine,
  isObsoleteSelectionSubtotalWarning,
  managerDocumentReviewLineIncomplete,
} from "../lib/manager-document-validation";

const root = process.cwd();

test("document center preserves originals while allowing direct catalog row imports", async () => {
  const [
    migration,
    approvalMigration,
    sourceMigration,
    indexMigration,
    departmentMigration,
    actions,
    catalogImport,
    page,
    review,
    upload,
    shell,
    toolsPage,
    documents,
    edgeFunction,
  ] = await Promise.all([
    readFile(
      path.join(
        root,
        "supabase/migrations/20260827143000_create_manager_document_center.sql",
      ),
      "utf8",
    ),
    readFile(
      path.join(
        root,
        "supabase/migrations/20260827144500_restrict_document_financial_approval.sql",
      ),
      "utf8",
    ),
    readFile(
      path.join(
        root,
        "supabase/migrations/20260827151000_add_document_sources_and_staff_approval.sql",
      ),
      "utf8",
    ),
    readFile(
      path.join(
        root,
        "supabase/migrations/20260827152500_index_manager_document_relationships.sql",
      ),
      "utf8",
    ),
    readFile(
      path.join(
        root,
        "supabase/migrations/20260827182029_add_manager_document_department_suggestion.sql",
      ),
      "utf8",
    ),
    readFile(path.join(root, "app/admin/documents/actions.ts"), "utf8"),
    readFile(path.join(root, "lib/manager-document-catalog.ts"), "utf8"),
    readFile(path.join(root, "app/admin/documents/page.tsx"), "utf8"),
    readFile(
      path.join(root, "components/buildflow/manager-document-review.tsx"),
      "utf8",
    ),
    readFile(
      path.join(root, "components/buildflow/manager-document-upload.tsx"),
      "utf8",
    ),
    readFile(path.join(root, "components/buildflow/admin-shell.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/ai-tools/page.tsx"), "utf8"),
    readFile(path.join(root, "lib/manager-documents.ts"), "utf8"),
    readFile(
      path.join(root, "supabase/functions/manager-document-ocr/index.ts"),
      "utf8",
    ),
  ]);
  expect(migration).toContain(
    "create table if not exists public.manager_documents",
  );
  expect(migration).toContain(
    "create table if not exists public.manager_document_items",
  );
  expect(migration).toContain(
    "create table if not exists public.manager_document_events",
  );
  expect(migration).toContain(
    "'manager-documents', 'manager-documents', false",
  );
  expect(migration).toContain("enable row level security");
  expect(migration).toContain("legacy_supplier_quote_id");
  expect(migration).toContain(
    "on conflict (legacy_supplier_quote_id) do nothing",
  );
  expect(approvalMigration).toContain(
    "Only the owner can approve or route a manager document",
  );
  expect(approvalMigration).toContain("private.is_admin()");
  expect(sourceMigration).toContain(
    "private.has_staff_capability('suppliers')",
  );
  expect(sourceMigration).toContain("source_group_id");
  expect(sourceMigration).toContain("client_invoice");
  expect(indexMigration).toContain("manager_documents_project_id_idx");
  expect(indexMigration).toContain("manager_document_events_created_by_idx");
  expect(departmentMigration).toContain("suggested_department");
  expect(departmentMigration).toContain("set department = 'Test'");
  expect(actions.indexOf(`.from(MANAGER_DOCUMENT_BUCKET).upload`)).toBeLessThan(
    actions.indexOf("const result = await runDocumentExtraction"),
  );
  expect(actions).toContain("sourceSha256");
  expect(actions).toContain("This exact document is already in Documents");
  expect(actions).toContain("prepareManagerDocumentUploadAction");
  expect(actions).toContain("completeManagerDocumentUploadAction");
  expect(actions).toContain("createSignedUploadUrl");
  expect(actions).toContain("The saved original was re-read with AI");
  expect(actions).toContain('status: "processing"');
  expect(actions).toContain("Nothing was sent to another part of Avantia");
  expect(actions).toContain(
    "Approve the reviewed document before sending it to supplier pricing",
  );
  expect(actions).toContain('requireStaffProfile("suppliers")');
  expect(actions).toContain("source_channel: sourceChannel");
  expect(actions).toMatch(/functions\.invoke\(\s*"manager-document-ocr"/);
  expect(actions).toContain('const INTAKE_DEPARTMENT = "Test"');
  expect(actions).toContain("suggested_department");
  expect(actions).toContain("quantity × unit price");
  expect(page).toContain("One private inbox");
  expect(page).toContain(
    "The original remains here even after information is routed",
  );
  expect(page).toContain('select("*", { count: "exact" })');
  expect(page).toContain('value: "archived"');
  expect(page).toContain('name="q"');
  expect(page).toContain('name="status"');
  expect(page).toContain('name="type"');
  expect(page).toContain("PAGE_SIZE = 50");
  expect(page).not.toContain('.neq("status", "archived")');
  expect(page).not.toContain(".limit(250)");
  expect(review).toContain("Finish review");
  expect(review).toContain("Sources and field evidence");
  expect(review).toContain("Math mismatch");
  expect(review).toContain("Save & approve");
  expect(review).toContain("Supplier code");
  expect(review).toContain("Use suggested:");
  expect(review).toContain("selectedProductCount");
  expect(review).toMatch(/<h2[^>]*>\s*Items\s*<\/h2>/);
  expect(review).toContain("Add selected (");
  expect(review).toContain("Add to Catalog");
  expect(review).toContain("askDeliveryThenImport(line.id)");
  expect(review).toContain("Choose category");
  expect(review).toContain("How is delivery priced?");
  expect(review).toContain("Free delivery");
  expect(review).toContain("Delivery amount");
  expect(review).toContain("deliveryAmount");
  expect(review).not.toContain("Confirm whether delivery is included.");
  expect(review).toContain("directRowImport: true");
  expect(review).toContain("importTargets.map((target) => target.id)");
  expect(review).toContain("catalogDepartment: importDepartments[0]");
  expect(review).toContain("importDepartments.length !== 1");
  expect(review).toContain("Confirm the vendor.");
  expect(review).toContain("Contact person");
  expect(actions).toContain("requestedItemIds");
  expect(actions).toContain('selectedItemsQuery.in("id", requestedItemIds)');
  expect(review).toContain("selectedImportLines");
  expect(review).toContain("data-workflow-control");
  expect(review).toContain('className="divide-y divide-slate-200 md:hidden"');
  expect(review).toContain('className="hidden overflow-x-auto md:block"');
  expect(
    review.indexOf('className="divide-y divide-slate-200 md:hidden"'),
  ).toBeLessThan(review.indexOf('className="hidden overflow-x-auto md:block"'));
  expect(review.match(/min-w-\[58rem\]/g)).toHaveLength(1);
  expect(review).toContain("Confirm & add to Catalog");
  expect(review).toContain("catalogVendor.trim()");
  expect(review).toContain('name="catalogVendor"');
  expect(review).toContain('name="catalogContact"');
  expect(review).toContain('name="deliveryAmount"');
  expect(review).toContain("max-h-[calc(100dvh-1rem)]");
  expect(review).toContain("Select all");
  expect(review).toContain("Clear");
  expect(review).toContain("selectionChanged");
  expect(review).toMatch(/lowest reviewed price is\s*kept/);
  expect(review).toContain("Catalog pricing is saved");
  expect(actions).toContain("addManagerDocumentItemsToCatalogAction");
  expect(actions).toContain(
    "staff_quick_import_manager_document_item_to_catalog",
  );
  expect(actions).toContain("usedCodes");
  expect(actions).toContain("DOC-${document.id.slice(0, 8).toUpperCase()}");
  expect(actions).not.toContain("byCode.get(catalogItemKey(item.item_code))");
  expect(catalogImport).toContain("supplier_sku: clean(item.item_code");
  expect(catalogImport).toContain("source_document_id: document.id");
  expect(actions).toContain("candidateGroups");
  expect(actions).toContain("Lowest of ${group.length} selected quote rows");
  expect(actions).toContain("Select at least one dependable supplier item");
  expect(review).toContain("Approved manager access is required");
  expect(review).toContain("Ignore source");
  expect(review).toContain("Use source");
  expect(review).toContain("Choose destination");
  expect(review).toContain('routeQuote("client")');
  expect(review).toContain('routeQuote("comparison")');
  expect(review).toContain("createClientQuoteFromSupplierQuoteAction");
  expect(review).toContain("sendSupplierQuoteToComparisonAction");
  expect(review).toContain("routed.data.itemIds");
  expect(actions).toContain("itemIds: linkedItems.map((item) => item.id)");
  expect(actions).toContain('["ready", "routed"].includes(document.status)');
  expect(actions).toContain(
    '.select("id,line_number,source_document_item_id")',
  );
  expect(actions).toContain(".returns<RoutedQuoteItem[]>()");
  expect(actions).toContain(
    "Supplier pricing is still finishing this document",
  );
  expect(actions).toContain("const missingItems = items.filter");
  expect(actions).toContain("durableQuoteId");
  expect(upload).toContain("Upload once");
  expect(upload).toContain("uploadToSignedUrl");
  expect(upload).toContain("The upload stopped before the document opened");
  expect(upload).toContain("no automatic posting");
  expect(upload).not.toContain("Starting department");
  expect(upload).toContain('name="department" value="Test"');
  expect(shell).toContain('href: "/admin/documents"');
  expect(toolsPage).toContain('href: "/admin/documents"');
  expect(toolsPage).toContain("Manager Tools");
  expect(documents).toContain("Client invoice · outgoing");
  expect(edgeFunction).toContain("openai_supplier_quote_api_key");
  expect(edgeFunction).toContain("can_manage_suppliers");
});

test("a reviewed document can be linked directly to a request quote comparison", async () => {
  const [detailPage, review, actions, worktable] = await Promise.all([
    readFile(
      path.join(root, "app/admin/documents/[documentId]/page.tsx"),
      "utf8",
    ),
    readFile(
      path.join(root, "components/buildflow/manager-document-review.tsx"),
      "utf8",
    ),
    readFile(path.join(root, "app/admin/documents/actions.ts"), "utf8"),
    readFile(
      path.join(root, "components/buildflow/request-material-worktable.tsx"),
      "utf8",
    ),
  ]);

  expect(detailPage).toContain('from("quote_requests")');
  expect(detailPage).toContain("requests={requests}");
  expect(review).toContain("Request for quote compare");
  expect(review).toContain("Add to Quote Compare");
  expect(review).toContain("Add to Compare");
  expect(review).toContain('routeQuote("comparison", line.id)');
  expect(review).toContain("comparisonRequestId || undefined");
  expect(review).toContain("lineId ? [lineId] : undefined");
  expect(actions).toContain(
    'selectedItemsQuery = selectedItemsQuery.in("id", requestedItemIds)',
  );
  expect(actions).toContain(
    "validatedRequestedItems.length !== requestedItemIds.length",
  );
  expect(actions).toMatch(
    /if \(!\["ready", "routed"\]\.includes\(document\.status\)\)[\s\S]*?const selectedRequestId/,
  );
  expect(actions).toContain("already linked to another request");
  expect(actions).toContain("selectedComparisonId");
  expect(actions).toContain("requestedItemIds");
  expect(actions).toContain("line_number: item.line_number");
  expect(actions).toContain("existingQuoteItems");
  expect(actions).toContain("linkedIds.push(inserted.id)");
  expect(review).toContain("!line.selected");
  expect(actions).toContain("comparison_id: selectedComparisonId");
  expect(
    actions.indexOf("const requestedRows = await selectedItemsQuery"),
  ).toBeLessThan(
    actions.indexOf("let selectedComparisonId: string | null = null"),
  );
  const routeStart = actions.indexOf(
    "export async function routeManagerDocumentToSupplierPricingAction",
  );
  const validationFailure = actions.indexOf(
    'error: "Review and save the exact selected product before routing it."',
    routeStart,
  );
  const comparisonMutation = actions.indexOf(
    "selectedComparisonId = await ensureDocumentRequestComparison(",
    routeStart,
  );
  expect(validationFailure).toBeGreaterThan(routeStart);
  expect(validationFailure).toBeLessThan(comparisonMutation);
  expect(review).toContain("lineId ? [lineId] : undefined");
  expect(review).toContain("Add to Request Compare");
  expect(worktable).toContain("Original request");
  expect(worktable).toContain("Missing info / AI notes");
  expect(worktable).toContain("supplierColumns.map");
});

test("document catalog routing is capability-scoped and one comparison stays active per request", async () => {
  const [migration, actions, review] = await Promise.all([
    readFile(
      path.join(
        root,
        "supabase/migrations/20260831142500_harden_document_catalog_routing.sql",
      ),
      "utf8",
    ),
    readFile(path.join(root, "app/admin/documents/actions.ts"), "utf8"),
    readFile(
      path.join(root, "components/buildflow/manager-document-review.tsx"),
      "utf8",
    ),
  ]);

  expect(migration).toContain("quote_comparisons_one_active_per_request_idx");
  expect(migration).toContain("where request_id is not null");
  expect(migration).toContain("status in ('draft', 'review')");
  expect(migration).toContain("private.has_staff_capability('suppliers')");
  expect(migration).toContain("material_catalog_items_suppliers_all");
  expect(migration).toContain("material_catalog_supplier_prices_suppliers_all");
  expect(migration).toContain(
    "material_catalog_item_departments_suppliers_all",
  );

  // One quick-import RPC owns the complete selected row set. The action accepts
  // 1..200 unique UUIDs, and rejects duplicates, invalid IDs, and >200 inputs
  // because the normalized length must still equal the caller's input length.
  expect(actions).toContain(
    "...new Set(itemIds.filter((itemId) => UUID_PATTERN.test(itemId)))",
  );
  expect(actions).toContain(".slice(\n        0,\n        200,");
  expect(actions).toContain("requestedItemIds?.length !== itemIds.length");
  expect(actions).toContain('selectedItemsQuery.in("id", requestedItemIds)');
  expect(actions).toContain(
    '"staff_quick_import_manager_document_item_to_catalog"',
  );
  expect(actions).toContain("p_item_ids: selected.map((item) => item.id)");
  expect(review).toContain("importTargets.map((target) => target.id)");
  expect(review).not.toMatch(
    /for \(const target of importTargets\)[\s\S]*?addManagerDocumentItemsToCatalogAction/,
  );

  // Stable source identities and immutable snapshots make retries idempotent.
  expect(migration).toContain("supplier_quotes_source_document_uidx");
  expect(migration).toContain("on public.supplier_quotes (source_document_id)");
  expect(migration).toContain("supplier_quote_items_source_document_item_uidx");
  expect(migration).toContain(
    "on public.supplier_quote_items (source_document_item_id)",
  );
  expect(migration).toContain(
    "material_catalog_prices_source_document_item_idx",
  );
  expect(migration).toContain(
    "protect_supplier_quote_source_provenance_trigger",
  );
  expect(migration).toContain("protect_supplier_quote_item_source_trigger");
  expect(migration).toContain("protect_quote_comparison_bid_source_trigger");

  // The server rejects a quote when even one row is missing exact provenance
  // or belongs to another document; one valid row cannot mask mixed sources.
  expect(migration).toContain("mixed_or_missing_source_items");
  expect(migration).toContain("quote_item.source_document_item_id is null");
  expect(migration).toContain("document_item.document_id <> p_document_id");

  // Linking, routed status, and its audit event commit together and retries do
  // not duplicate the event.
  expect(migration).toContain("status = 'routed'");
  expect(migration).toContain("Approved rows sent to supplier pricing.");
  expect(migration).toContain("where not exists (");
  expect(migration).toContain(
    "existing_event.details ->> 'supplier_quote_id' = p_quote_id::text",
  );
  expect(actions).not.toContain(
    '.update({ status: "routed", updated_by: user.id })',
  );
});

test("document intelligence keeps evidence and catches line and total mismatches", () => {
  const item = {
    description: "Water heater",
    quantity: 2,
    unitPrice: 100,
    lineTotal: 190,
    confidence: 0.96,
  };
  expect(documentLineValidationStatus(item)).toBe("mismatch");
  const warnings = documentArithmeticWarnings({
    items: [item],
    subtotal: 200,
    discount: 0,
    deliveryCharge: 10,
    taxAmount: 17,
    total: 250,
  });
  expect(warnings).toContain(
    "One or more line totals do not equal quantity × unit price.",
  );
  expect(
    warnings.some((warning) => warning.includes("printed total")),
  ).toBeTruthy();
});

test("document intelligence keeps charges and tax out of product rows", () => {
  for (const charge of [
    "Delivery Fee",
    "Shipping Charge",
    "Freight",
    "Sales Tax",
    "Grand Total",
    "Balance Due",
    "Payments/Credits",
  ]) {
    expect(isManagerDocumentChargeLine(charge)).toBeTruthy();
  }
  expect(isManagerDocumentChargeLine("White Oak flooring")).toBeFalsy();
});

test("document AI failure recovery is bounded, diagnosable, and atomic", async () => {
  const [edge, actions, intelligence, migration] = await Promise.all([
    readFile(
      path.join(root, "supabase/functions/manager-document-ocr/index.ts"),
      "utf8",
    ),
    readFile(path.join(root, "app/admin/documents/actions.ts"), "utf8"),
    readFile(path.join(root, "lib/manager-document-intelligence.ts"), "utf8"),
    readFile(
      path.join(
        root,
        "supabase/migrations/20260831171000_atomic_manager_document_extraction.sql",
      ),
      "utf8",
    ),
  ]);

  expect(edge).toContain("safeOpenAiError");
  expect(edge).toContain("upstreamStatus");
  expect(edge).toContain("requestId");
  expect(edge).toContain("content, 28_000");
  expect(edge).toContain("20_000,");
  expect(edge).toContain("![401, 403, 429].includes");
  expect(edge).toContain("(extraction.upstreamStatus ?? 0) >= 500");
  expect(edge).toContain("(extraction.upstreamStatus ?? 0) <= 599");
  expect(edge).not.toContain("attempt <= 2");

  expect(actions).toContain("DocumentAiInvocationError");
  expect(actions).toContain("context.clone().json()");
  expect(actions).toContain("updated_at.lt.${staleBefore}");
  expect(actions).toContain("extractionLeaseToken = crypto.randomUUID()");
  expect(actions).toContain(
    '.eq("extraction_lease_token", extractionLeaseToken)',
  );
  expect(actions).toContain("p_lease_token: extractionLeaseToken");
  expect(actions).toContain("staff_apply_manager_document_extraction");
  expect(actions).toContain("...(diagnostic ?? {})");
  expect(actions).not.toContain("Document AI server fallback unavailable");
  expect(intelligence).toContain('apiKey?.startsWith("sk-")');
  expect(intelligence).toContain("apiKey.length < 30");

  expect(migration).toContain("for update");
  expect(migration).toContain("extraction_lease_token uuid");
  expect(migration).toContain(
    "v_document.extraction_lease_token is distinct from p_lease_token",
  );
  expect(migration).toContain("extraction_lease_token = null");
  expect(migration).toContain("v_existing_count > 0 and v_incoming_count = 0");
  expect(
    actions.match(/staff_apply_manager_document_extraction/g),
  ).toHaveLength(2);
  expect(migration).toContain("delete from public.manager_document_items");
  expect(migration).toContain("insert into public.manager_document_items");
  expect(migration).toContain("update public.manager_documents set");
  expect(migration).toContain("status = 'needs_review'");
  expect(migration).toContain("security definer");
  expect(migration).toContain("private.has_staff_capability('suppliers')");
});

test("choosing one catalog product does not keep the obsolete partial-subtotal warning", () => {
  expect(
    isObsoleteSelectionSubtotalWarning(
      "Selected lines add to $235.00, but subtotal is $746.95.",
    ),
  ).toBeTruthy();
  expect(
    isObsoleteSelectionSubtotalWarning(
      "All line totals add to $235.00, but subtotal is $746.95.",
    ),
  ).toBeFalsy();
});

test("a price-list product needs a unit price but not an order quantity or line total", () => {
  expect(
    managerDocumentReviewLineIncomplete({
      documentType: "catalog_price_list",
      selected: true,
      description: "SPECTRALOCK 1 Pre-Mixed Epoxy Grout",
      quantity: null,
      unit: "each",
      unitPrice: 125,
      lineTotal: null,
    }),
  ).toBeFalsy();
  expect(
    managerDocumentReviewLineIncomplete({
      documentType: "catalog_price_list",
      selected: true,
      description: "SPECTRALOCK 1 Pre-Mixed Epoxy Grout",
      quantity: null,
      unit: "each",
      unitPrice: null,
      lineTotal: null,
    }),
  ).toBeTruthy();
});

test("reviewed Firecode drywall line keeps supplier pricing and original PDF evidence", () => {
  const document = {
    id: "11111111-1111-4111-8111-111111111111",
    department: "drywall",
    suggested_department: "Sheet Rock",
    document_number: "28104219-00",
    document_date: "2026-08-25",
    expires_on: "2026-09-25",
    file_name: "fbm-quote-28104219.pdf",
  };
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
  };

  expect(reviewedDocumentCatalogDepartment(document)).toBe("Sheet Rock");
  const price = reviewedDocumentPriceRow({
    document,
    item,
    catalogItem: {
      id: "33333333-3333-4333-8333-333333333333",
      package_quantity: 1,
      comparison_quantity: 1,
    },
    supplier: {
      id: "fbm-branch-281",
      name: "Foundation Building Materials (FBM) Branch 281",
    },
    userId: "44444444-4444-4444-8444-444444444444",
    now: "2026-08-30T18:45:00.000Z",
  });

  expect(price).not.toBeNull();
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
  });
  expect(price?.notes).toContain("supplier code TTX-1110");
  expect(price?.notes).toContain("quantity 1 MLF");
});

test("catalog routing rejects invented departments and reports the exact failed reviewed line", () => {
  expect(
    reviewedDocumentCatalogDepartment({
      department: "Department 1",
      suggested_department: "drywall",
    }),
  ).toBe("Sheet Rock");
  expect(
    reviewedDocumentCatalogDepartment({
      department: "Department 1",
      suggested_department: "mystery",
    }),
  ).toBe("Others");
  expect(
    catalogLineFailureMessage({
      item: {
        line_number: 5,
        item_code: "TTX-1110",
        description: "5/8 in. x 4 ft. x 8 ft. Firecode X Drywall",
      },
      step: "item",
      code: "23505",
    }),
  ).toBe(
    "Line 5 — 5/8 in. x 4 ft. x 8 ft. Firecode X Drywall (supplier code TTX-1110): A catalog item with the same name or internal code already exists; reload the document and retry so Avantia can match it.",
  );
});

test("mixed reviewed supplier rows keep their own code, quantity, unit, price, and evidence", () => {
  const document = {
    id: "11111111-1111-4111-8111-111111111111",
    department: "Siding",
    suggested_department: "Siding",
    document_number: "28104219-00",
    document_date: "2026-08-25",
    expires_on: null,
    file_name: "fbm-mixed-products.pdf",
  };
  const rows = [
    {
      id: "a",
      line_number: 1,
      item_code: "GAP-531667",
      description: "GAF Grand Sequoia",
      specification: "",
      quantity: 480,
      unit: "PC",
      unit_price: 9.35,
      line_total: 4488,
      source_page: 1,
      source_text: "GAP-531667 480 PC 9.35 4488",
    },
    {
      id: "b",
      line_number: 2,
      item_code: "TVH-HW9150",
      description: "Housewrap",
      specification: "",
      quantity: 5,
      unit: "RL",
      unit_price: 261.4,
      line_total: 1307,
      source_page: 1,
      source_text: "TVH-HW9150 5 RL 261.40 1307",
    },
  ];
  const prices = rows.map((item, index) =>
    reviewedDocumentPriceRow({
      document,
      item,
      catalogItem: {
        id: `catalog-${index}`,
        package_quantity: 1,
        comparison_quantity: 1,
      },
      supplier: { id: "fbm-281", name: "FBM Branch 281" },
      userId: "manager",
      now: "2026-08-30T18:45:00.000Z",
    }),
  );
  expect(
    prices.map((price) => [
      price?.supplier_sku,
      price?.source_quantity,
      price?.source_unit,
      price?.unit_price,
      price?.source_document_date,
    ]),
  ).toEqual([
    ["GAP-531667", 480, "PC", 9.35, "2026-08-25"],
    ["TVH-HW9150", 5, "RL", 261.4, "2026-08-25"],
  ]);
});

test("catalog evidence migration archives every reviewed source field", async () => {
  const [migration, actions, catalogPage] = await Promise.all([
    readFile(
      path.join(
        root,
        "supabase/migrations/20260830184500_preserve_document_catalog_line_evidence.sql",
      ),
      "utf8",
    ),
    readFile(path.join(root, "app/admin/documents/actions.ts"), "utf8"),
    readFile(path.join(root, "app/admin/catalog/page.tsx"), "utf8"),
  ]);
  for (const field of [
    "source_quantity",
    "source_unit",
    "source_line_total",
    "source_page",
    "source_text",
  ]) {
    expect(migration).toContain(`add column if not exists ${field}`);
    expect(migration).toContain(`old.${field}`);
    expect(actions).toContain(field);
    expect(catalogPage).toContain(field);
  }
  expect(actions).toContain("bySupplierCode");
  expect(actions).toContain("reviewedDocumentCatalogDepartment(document)");
  expect(actions).toContain("catalogLineFailureMessage");
});
