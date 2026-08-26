import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"

import { parseSupplierQuoteText } from "../lib/supplier-quote-parser"
import { normalizeSupplierQuoteAiPayload } from "../lib/supplier-quote-ai"
import { detectSupplierMatch, inferSupplierName } from "../lib/supplier-quote-supplier"
import { preferredRequestMaterialSources, requestMaterialChartCsv, toRequestMaterialChartRow } from "../lib/request-material-chart"
import { materialReviewReasons, materialReviewStatus, materialReviewSummary } from "../lib/client-material-review"

const root = process.cwd()

test("manager supplier quote storage is private, durable, and routable", async () => {
  const [navigation, page, uploadForm, workspace, actions, chartRoute, chartHelper, migration, clientMigration] = await Promise.all([
    readFile(path.join(root, "components/buildflow/admin-shell.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/supplier-quotes/page.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/supplier-quote-upload-form.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/supplier-quote-workspace.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/supplier-quotes/actions.ts"), "utf8"),
    readFile(path.join(root, "app/admin/supplier-quotes/requests/[requestId]/chart/route.ts"), "utf8"),
    readFile(path.join(root, "lib/request-material-chart.ts"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260820110800_create_supplier_quote_storage.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260820160124_link_supplier_quotes_to_clients.sql"), "utf8"),
  ])

  expect(navigation).toContain('href: "/admin/supplier-quotes"')
  expect(navigation).toContain('label: "Supplier Quote Storage"')
  expect(page).toContain('requireStaffProfile("suppliers")')
  expect(actions).toContain('requireStaffProfile("suppliers")')
  expect(actions).toContain("extractSupplierQuoteFile")
  expect(actions).toContain("extraction.metadata.quoteNumber")
  expect(actions).toContain("addSupplierQuoteItemsToCatalogAction")
  expect(actions).toContain("sendSupplierQuoteToComparisonAction")
  expect(actions).toContain("createClientQuoteFromSupplierQuoteAction")
  expect(actions).toContain("retrySupplierQuoteExtractionAction")
  expect(actions).toContain("replaceExisting")
  expect(actions).toContain(".download(quote.file_path)")
  expect(actions).toContain('client_id: client?.id ?? null')
  expect(actions).toContain('client_name_snapshot: clientName')
  expect(uploadForm).toContain("Choose client")
  expect(uploadForm).toContain("Don&apos;t link it to anyone")
  expect(uploadForm).toContain("Attach to a client request")
  expect(uploadForm).toContain("Choose request / case")
  expect(uploadForm).toContain("initialRequestId")
  expect(uploadForm).toContain("Detect from invoice")
  expect(uploadForm).toContain("extractImageTextInBrowser")
  expect(uploadForm).not.toContain("Scanned-image OCR is waiting for AI activation.")
  expect(actions).toContain("detectSupplierMatch")
  expect(actions).toContain("inferSupplierName")
  const browserExtraction = await readFile(path.join(root, "lib/browser-document-extraction.ts"), "utf8")
  expect(browserExtraction).not.toContain("pdfjs-dist")
  expect(await readFile(path.join(root, "lib/supplier-quote-extraction.ts"), "utf8")).toContain('import("unpdf")')
  expect(uploadForm).toContain('name="clientSelection" required')
  expect(uploadForm).toContain('name="requestId" required')
  expect(actions).toContain("ensureClientRequestComparison")
  expect(actions).toContain('eq("request_id", input.requestId)')
  expect(actions).toContain("comparisonMatchScore")
  expect(page).toContain("client_name_snapshot")
  expect(page).toContain('aria-label="Filter supplier quotes"')
  expect(page).toContain('name="supplier"')
  expect(page).toContain('name="client"')
  expect(page).toContain('name="date" type="date"')
  expect(page).toContain("No linked quotes match these filters")
  expect(page).toContain("Open client requests")
  expect(page).toContain("Full request")
  expect(page).toContain("Quotes without a client")
  expect(page).toContain("Client-linked supplier quotes")
  expect(page).toContain("Use chart for supplier quote")
  expect(page).toContain("Download chart")
  expect(page).toContain("Quantity")
  expect(page).toContain("Details")
  expect(page).toContain('quote.client_id')
  expect(chartRoute).toContain('requireStaffProfile("suppliers")')
  expect(chartRoute).toContain('"Content-Disposition"')
  expect(chartRoute).toContain('"Cache-Control": "private, no-store"')
  expect(chartHelper).toContain("requestMaterialChartCsv")
  expect(chartHelper).toContain("request_details")
  expect(page).toContain("Use chart for supplier quote")
  expect(page).toContain("New submitted requests will appear here automatically.")
  expect(page).toContain('href={`/admin/quote-comparison/${comparison.id}`}')
  expect(workspace).toContain("quote.client_name_snapshot")
  expect(workspace).toContain("Add to catalog")
  expect(workspace).toContain("Compare suppliers")
  expect(workspace).toContain("Prepare client quote")
  expect(workspace).toContain("Extract invoice")
  expect(workspace).toContain("Re-read with AI")
  expect(workspace).toContain("Original invoice")
  expect(workspace).toContain('aria-label="Quote details"')
  expect(workspace).toContain("Open only when you need to compare the source")
  expect(workspace).toContain("sticky bottom-2")
  expect(workspace).toContain("subtotal + deliveryCharge")
  expect(migration).toContain("create table if not exists public.supplier_quotes")
  expect(migration).toContain("create table if not exists public.supplier_quote_items")
  expect(migration).toContain("'supplier-quotes'")
  expect(migration).toContain("public = false")
  expect(migration).toContain("private.has_staff_capability('suppliers')")
  expect(migration).toContain("enable row level security")
  expect(clientMigration).toContain("references public.profiles(id) on delete set null")
  expect(clientMigration).toContain("supplier_quotes_client_updated_idx")
  expect(page).toContain('"supplier-quote-ocr"')
  expect(actions).toContain("supplierQuoteAiInvoker")
})

test("client request chart keeps quantity, item, and details in stable columns", () => {
  const row = toRequestMaterialChartRow({
    request_id: "request-1",
    name: "1/2 in. drywall 4 x 8",
    department: "Sheet Rock",
    item_type: "material",
    quantity: 24,
    unit: "sheets",
    answers: [{ label: "Board type", value: "Moisture resistant" }],
    metadata: { request_details: "Deliver to the second floor" },
  })

  expect(row).toEqual({
    requestId: "request-1",
    quantity: "24 sheets",
    item: "1/2 in. drywall 4 x 8",
    details: "Deliver to the second floor · Board type: Moisture resistant",
  })
  expect(requestMaterialChartCsv([row])).toContain('"Quantity","Item","Details"')
  expect(requestMaterialChartCsv([{ ...row, item: "=unsafe" }])).toContain('"\'=unsafe"')

  const original = { request_id: "request-1", name: "Messy request", department: "Others", item_type: "custom_priced", quantity: 1, unit: "request", answers: [], metadata: { request_details: "raw notes" } }
  const organized = { request_id: "request-1", name: "2 x 4 x 8 stud", department: "Framing", item_type: "material", quantity: 40, unit: "pieces", answers: [], metadata: { ai_organized: true, dimensions: "2 x 4 x 8 ft." } }
  expect(preferredRequestMaterialSources([original, organized])).toEqual([organized])
})

test("client material lists are organized securely in the background", async () => {
  const [requestAction, publicIntake, aiFunction, ownerPage, ownerActions, organizerButton, organizedList, reviewEditor, priceCheck, supplierDraft, priceRoute, messagingBroker] = await Promise.all([
    readFile(path.join(root, "app/request-quote/actions.ts"), "utf8"),
    readFile(path.join(root, "supabase/functions/public-quote-intake/index.ts"), "utf8"),
    readFile(path.join(root, "supabase/functions/client-material-list-ai/index.ts"), "utf8"),
    readFile(path.join(root, "app/owner/materials/requests/[requestId]/page.tsx"), "utf8"),
    readFile(path.join(root, "app/owner/materials/requests/actions.ts"), "utf8"),
    readFile(path.join(root, "components/buildflow/organize-material-list-button.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/organized-material-list.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/material-review-editor.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/material-price-check.tsx"), "utf8"),
    readFile(path.join(root, "app/owner/materials/requests/[requestId]/supplier-request/page.tsx"), "utf8"),
    readFile(path.join(root, "app/api/admin/catalog/exa-search/route.ts"), "utf8"),
    readFile(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8"),
  ])

  expect(requestAction).toContain("organizeMaterialListAfterResponse")
  expect(requestAction).toContain('functions.invoke("client-material-list-ai"')
  expect(publicIntake).toContain("EdgeRuntime.waitUntil")
  expect(aiFunction).toContain("openai_supplier_quote_api_key")
  expect(aiFunction).toContain('const AI_MODEL = "gpt-5.6-terra"')
  expect(aiFunction).toContain("model: AI_MODEL")
  expect(aiFunction).toContain("store: false")
  expect(aiFunction).toContain('reasoning: { effort: "low" }')
  expect(aiFunction).toContain('documentType: { type: "string", enum: ["material_list", "plan", "other"] }')
  expect(aiFunction).toContain("Do not invent missing information")
  expect(aiFunction).toContain("source.name")
  expect(aiFunction).toContain("typedSource")
  expect(aiFunction).toContain("ai_organized: true")
  expect(aiFunction).toContain('reviewStatus: { type: "string", enum: ["ready", "check", "missing"] }')
  expect(aiFunction).toContain("review_reasons: [")
  expect(aiFunction).toContain("Only check and missing rows require employee review")
  expect(aiFunction).toContain('qualification_status: reviewStatus === "ready" ? "not_required" : "pending"')
  expect(aiFunction).toContain('unit: normalizedUnit || (missingQuantity ? "quantity required" : "unspecified")')
  expect(aiFunction).not.toContain('unit: clean(item.unit, 60) || "each"')
  expect(aiFunction).toContain("Never calculate perimeter, corners, or opening trim from siding squares alone")
  expect(aiFunction).toContain("detectExplicitQuantityUnit(sourceText)")
  expect(aiFunction).toContain("removeResolvedQuantityUnitReasons")
  expect(aiFunction).toContain("verifiedThickness(proposedThickness, typedSource || sourceText)")
  expect(aiFunction).toContain("materialRequiresThickness(item.name)")
  expect(aiFunction).toContain("Never ask for or mark a quantity or sales unit missing when it is already printed")
  expect(aiFunction).toContain("existing.length && !force")
  expect(aiFunction).toContain("previous_organized_items_replace_failed")
  expect(aiFunction).toContain('.insert(rows).select("id")')
  expect(ownerPage).toContain("step={1}")
  expect(ownerPage).toContain("Review client list")
  expect(ownerPage).toContain("step={2}")
  expect(ownerPage).toContain("Organize request")
  expect(ownerPage).toContain("workflowStepCardClass")
  expect(ownerPage).toContain("Confirmed material list")
  expect(ownerPage.indexOf("<CustomerRequestStatus")).toBeLessThan(ownerPage.indexOf('className="mt-3 grid gap-2"'))
  expect(ownerPage).toContain('open={currentStage === "received" && organizedItems.length === 0}')
  expect(ownerPage).toContain('comparisons={comparisonSummaries}')
  expect(ownerPage).toContain('quote_comparison_bids')
  expect(ownerPage).toContain('updatedAt={request.updated_at}')
  expect(ownerPage).toContain("OrganizedMaterialList")
  expect(ownerPage).toContain("refresh={organizedItems.length > 0}")
  expect(ownerPage).toContain("Last review:")
  expect(organizedList).toContain("divide-y divide-slate-200")
  expect(organizedList).not.toContain("md:grid-cols-2")
  expect(organizedList).not.toContain("<table")
  expect(organizedList).toContain("Review yellow and red items before supplier pricing")
  expect(organizedList).toContain("materialReviewSummary")
  expect(organizedList).toContain("MaterialPriceCheck")
  expect(organizedList).toContain("MaterialReviewEditor")
  expect(organizedList).toContain("requestId={requestId}")
  expect(organizedList).toContain("Copy list")
  expect(reviewEditor).toContain("recommendation.choices.map")
  expect(reviewEditor).toContain("<select")
  expect(reviewEditor).toContain("option.confidence")
  expect(reviewEditor).not.toContain("<textarea")
  expect(reviewEditor).not.toContain('type="number"')
  expect(priceCheck).toContain("Item sourcing")
  expect(priceCheck).toContain("Item number or description")
  expect(priceCheck).toContain("Delivery ZIP")
  expect(priceCheck).toContain("Buy directly")
  expect(priceCheck).toContain("Call for price")
  expect(priceCheck).toContain("Sales contacts")
  expect(priceCheck).toContain("fallbackLinks")
  expect(priceCheck).toContain("Check more suppliers")
  expect(priceCheck).toContain("Add suppliers")
  expect(priceCheck).toContain('document.getElementById("supplier-routing")')
  expect(priceRoute).toContain('action: "price_research"')
  expect(messagingBroker).toContain('type: "web_search_preview"')
  expect(messagingBroker).toContain('required: ["buyNow", "callForPrice", "salesContacts"]')
  expect(priceCheck).toContain("matchConfidence")
  expect(ownerActions).toContain("organizeClientMaterialRequestAction")
  expect(ownerActions).toContain("updateOrganizedMaterialItemAction")
  expect(ownerActions).toContain("scheduleRequestDeliveryAction")
  expect(ownerActions).toContain("updateRequestWorkflowStepAction")
  expect(ownerActions).toContain('manager_action: "workflow_step_status"')
  expect(ownerActions).toContain('client_action: "delivery_scheduled"')
  expect(ownerActions).toContain("delivery_window_start")
  expect(ownerActions).toContain("delivery_window_end")
  expect(ownerActions).toContain("delivery_window_hours")
  expect(ownerActions).toContain('item.metadata?.ai_organized !== true')
  expect(ownerActions).toContain('manually_reviewed_by: user.id')
  expect(organizerButton).toContain("Organizing...")
  expect(organizerButton).toContain("Reorganize request")
  expect(organizerButton).toContain('formData.set("force", "true")')
  expect(organizerButton).toContain('role="status"')
  expect(organizerButton).toContain("still need details")
  expect(organizerButton).toContain("router.refresh()")
  expect(organizerButton).toContain("disabled={isPending}")
  expect(supplierDraft).toContain("preferredRequestMaterialSources")
})

test("request workspace uses the same colored four-step workflow as the dashboard", async () => {
  const [dashboard, status, management] = await Promise.all([
    readFile(path.join(root, "app/admin/build-map/page.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/customer-request-status.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/request-management-panel.tsx"), "utf8"),
  ])
  for (const tone of ["amber-50", "sky-50", "violet-50", "emerald-50"]) {
    expect(dashboard).toContain(tone)
    expect(status).toContain(tone)
  }
  expect(status).toContain("Review request")
  expect(status).toContain("Supplier pricing")
  expect(status).toContain("Client approval")
  expect(status).toContain("Payment & delivery")
  expect(management).toContain("step={3}")
  expect(management).toContain("Add suppliers to request")
  expect(management).toContain('id="supplier-routing"')
  expect(management).toContain("Supplier answers and prices will appear here")
  expect(management).toContain("step={4}")
  expect(management).toContain("Schedule delivery")
  expect(management).toContain("Window length (hours)")
  expect(management).toContain("Delivery window: Between")
  expect(management).toContain("Save window and prepare client message")
  expect(management).not.toContain("Client will see")
  expect(management).not.toContain("The end time is calculated automatically")
  expect(management).toContain("Send WhatsApp")
  expect(management).toContain("Send Q U O text")
  expect(management).toContain("Call client")
})

test("material review status clearly separates ready, check, and missing rows", () => {
  const base = { id: "item-1", name: "2x4x8 stud", department: "Framing", quantity: 20, unit: "pieces", metadata: {} }
  const ready = { ...base, metadata: { review_status: "ready" } }
  const check = { ...base, id: "item-2", metadata: { review_status: "check", review_reasons: ["Confirm lumber grade"] } }
  const missing = { ...base, id: "item-3", metadata: { review_status: "missing", review_reasons: ["Length is missing"] } }
  expect(materialReviewStatus(ready)).toBe("ready")
  expect(materialReviewReasons(check)).toEqual(["Confirm lumber grade"])
  expect(materialReviewStatus(missing)).toBe("missing")
  expect(materialReviewSummary([ready, check, missing])).toEqual({ ready: 1, check: 1, missing: 1 })
})

test("supplier detection matches the directory or keeps the name read from the invoice", async () => {
  const text = "EE Elite Doors i Estimate\n960 Alabama Ave\nSOFT OPEN & CLOSE HARDWARE SET 362.00 724.00T"
  expect(inferSupplierName(text)).toBe("Elite Doors")
  const modernWindowsText = "MODERN WINDOWS\n1420 Commerce Ave., Bronx NY 10461\nQUOTATION #: 6080188"
  expect(inferSupplierName(modernWindowsText)).toBe("MODERN WINDOWS")
  expect(detectSupplierMatch([{ id: "modern", name: "Modern Window Manufacturing" }], "", modernWindowsText)?.id).toBe("modern")
  expect(detectSupplierMatch([{ id: "elite", name: "Elite Doors" }], "", text)?.id).toBe("elite")
  expect(detectSupplierMatch([{ id: "prince", name: "Prince Lumber" }], "", text)).toBeNull()
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
      { itemCode: "", description: "85", specification: "", quantity: 85, unit: "each", unitPrice: 11.45, lineTotal: 973.25 },
      { itemCode: "", description: "Delivery", specification: "", quantity: 1, unit: "each", unitPrice: 55, lineTotal: 55 },
    ],
    notes: " Review scan ",
  })

  expect(result.metadata).toMatchObject({ supplierName: "Nassau Lumber", quoteNumber: "Q-1048", quoteDate: "", expiresOn: "2026-09-20", deliveryCharge: 125.5, taxPercent: 100 })
  expect(result.items[0]).toMatchObject({ description: "1/2 in. plywood", quantity: 12, unitPrice: 22.5, lineTotal: 270 })
  expect(result.items).toHaveLength(1)
  expect(result.notes).toBe("Review scan")
})

test("catalog Exa search is staff-only, cached, and keeps results out of the catalog until approval", async () => {
  const [route, search, catalog] = await Promise.all([
    readFile(path.join(root, "app/api/admin/catalog/exa-search/route.ts"), "utf8"),
    readFile(path.join(root, "lib/exa-catalog-search.ts"), "utf8"),
    readFile(path.join(root, "components/buildflow/exa-catalog-research.tsx"), "utf8"),
  ])

  expect(route).toContain('requireStaffProfile("quotes")')
  expect(route).toContain("searchCatalogWithExa")
  expect(search).toContain("process.env.EXA_API_KEY")
  expect(search).toContain("https://api.exa.ai/search")
  expect(search).toContain("unstable_cache")
  expect(search).toContain("revalidate: 3_600")
  expect(search).toContain('type: "deep-lite"')
  expect(search).toContain("numResults: 12")
  expect(search).toContain("excludeDomains")
  expect(search).toContain("Google Shopping")
  expect(catalog).toContain("Prepare catalog item")
  expect(catalog).toContain("Nothing is saved until you approve it")
  expect(catalog).toContain("/api/admin/catalog/exa-search")
})

test("supplier quote AI extraction uses a cost-controlled model and does not retain responses", async () => {
  const [extraction, edgeFunction] = await Promise.all([
    readFile(path.join(root, "lib/supplier-quote-ai.ts"), "utf8"),
    readFile(path.join(root, "supabase/functions/supplier-quote-ocr/index.ts"), "utf8"),
  ])
  expect(extraction).toContain("SupplierQuoteAiInvoker")
  expect(edgeFunction).toContain('model: "gpt-5-mini"')
  expect(edgeFunction).toContain("openai_supplier_quote_api_key")
  expect(edgeFunction).toContain("store: false")
  expect(edgeFunction).toContain('reasoning: { effort: "low" }')
  expect(edgeFunction).toContain('type: "json_schema"')
  expect(edgeFunction).toContain('detail: "high"')
  expect(edgeFunction).toContain("if (extractedText.trim())")
  expect(extraction).toContain("store: false")
})

test("supplier quote parser recognizes common quantity and price rows", async () => {
  const rows = parseSupplierQuoteText([
    "ABC-204 12 sheets 1/2 in drywall 4 x 8 $14.50 $174.00",
    "2 x 4 x 10 framing lumber 25 pcs 7.25 181.25",
    "SOFT OPEN & CLOSE HARDWARE SET 362.00 724.00T",
    "Delivery $125.00",
  ].join("\n"))

  expect(rows).toHaveLength(3)
  expect(rows[0]).toMatchObject({ itemCode: "ABC-204", quantity: 12, unit: "sheets", unitPrice: 14.5, lineTotal: 174 })
  expect(rows[1]).toMatchObject({ quantity: 25, unit: "each", unitPrice: 7.25, lineTotal: 181.25 })
  expect(rows[2]).toMatchObject({ description: "SOFT OPEN & CLOSE HARDWARE SET", quantity: 2, unitPrice: 362, lineTotal: 724 })
})
