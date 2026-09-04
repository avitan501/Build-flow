import { access, readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

import { comparisonItemForRequestSources } from "@/lib/request-worktable-matching"
import { effectiveRequestComparisonItems } from "@/lib/supplier-quote-routing"
import { createAutosaveVersionGuard } from "@/lib/autosave-version"

const root = process.cwd()
const pagePath = path.join(root, "app/owner/materials/requests/[requestId]/page.tsx")
const worktablePath = path.join(root, "components/buildflow/request-material-worktable.tsx")
const supplierQuoteActionsPath = path.join(root, "app/admin/supplier-quotes/actions.ts")
const documentActionsPath = path.join(root, "app/admin/documents/actions.ts")
const migrationPath = path.join(root, "supabase/migrations/20260831154500_link_comparison_items_to_request_sources.sql")
const managementPath = path.join(root, "components/buildflow/request-management-panel.tsx")
const clientContactPath = path.join(root, "components/buildflow/request-client-contact.tsx")
const routeEditorPath = path.join(root, "components/buildflow/request-supplier-route-editor.tsx")
const originalEditorPath = path.join(root, "components/buildflow/original-request-item-editor.tsx")
const autosaveHookPath = path.join(root, "lib/use-sequenced-autosave.ts")
const liveSyncPath = path.join(root, "components/buildflow/request-live-sync.tsx")
const routeAutosaveMigrationPath = path.join(root, "supabase/migrations/20260902233933_atomic_request_supplier_route_autosave.sql")
const staffWorkflowMigrationPath = path.join(root, "supabase/migrations/20260903225000_fix_staff_request_workflow.sql")

async function source(filePath: string) {
  try {
    await access(filePath)
    return await readFile(filePath, "utf8")
  } catch {
    return ""
  }
}

test("review and organization are one compact four-column material work table", async () => {
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
  expect(worktable).toContain("Supplier route")
  expect(worktable).toContain("<tbody")
  expect(worktable).toContain("sm:py-1.5")
  expect(worktable).toContain("sm:min-h-6")

  expect(page, "steps 1 and 2 must not remain as separate expandable cards").not.toContain('title="Review client list"')
  expect(page, "steps 1 and 2 must not remain as separate expandable cards").not.toContain('title="Organize request"')
  expect(page, "original items should not be repeated below the combined table").not.toContain("Original request & files")
})

test("request changes synchronize between staff screens", async () => {
  const [page, liveSync, management] = await Promise.all([
    source(pagePath),
    source(liveSyncPath),
    source(managementPath),
  ])

  expect(page).toContain("<RequestLiveSync />")
  expect(liveSync).toContain("router.refresh()")
  expect(liveSync).toContain("REQUEST_REFRESH_INTERVAL_MS = 10_000")
  expect(liveSync).toContain('window.addEventListener("focus", refresh)')
  expect(page).toContain("(supplierRecommendations ?? []).map")
  expect(page).toContain("entry.contact_status")
  expect(page).toContain("entry.notes")
  expect(page).toContain("entry.contact_status}:${entry.notes}")
  expect(management).toContain("router.refresh()")
  expect(management).not.toMatch(/const \[supplierIds\]\s*=\s*useState/)
  expect(management).not.toMatch(/const \[recommendedSupplierIds\]\s*=\s*useState/)
})

test("supplier progress persists centrally and refreshed staff screens do not keep the first local snapshot", async () => {
  const [page, actions, management] = await Promise.all([
    source(pagePath),
    source(path.join(root, "app/owner/materials/requests/actions.ts")),
    source(managementPath),
  ])

  expect(page).toContain("const admin = createAdminClient()")
  expect(page).toMatch(/admin\s*\.from\("quote_request_supplier_recommendations"\)/)
  expect(page).toContain("supplierRecommendationsError")
  expect(actions).toContain('admin.from("quote_request_supplier_recommendations").upsert')
  expect(actions).toContain('.select("contact_status").single')
  expect(actions).toContain("savedStatus?.contact_status !== status")
  expect(actions).not.toContain("The supplier status was not saved because its history could not be recorded.")
  expect(management).toContain("supplierContactStatusOverrides")
  expect(management).toContain("statusOverride.base === (persistedContactStatus || \"not_contacted\")")
  expect(management).not.toMatch(/const \[supplierContactStatuses, setSupplierContactStatuses\]\s*=\s*useState/)
})

test("staff can add a request item after the client submitted the request", async () => {
  const [migration, actions] = await Promise.all([
    source(staffWorkflowMigrationPath),
    source(path.join(root, "app/owner/materials/requests/actions.ts")),
  ])

  expect(migration).toContain("drop policy if exists quote_request_items_owner_insert")
  expect(migration).toContain("or private.is_admin_or_staff()")
  expect(migration).toContain("for insert")
  expect(actions).toContain('select("department")')
  expect(actions).toContain("departmentSource?.department")
  expect(actions).not.toContain('department: "Others"')
  expect(actions).toContain("revalidatePath(`/owner/materials/requests/${requestId}`)")
  expect(await source(originalEditorPath)).toContain("The item was not saved. Check the connection and try again.")
})

test("request actions fail visibly without throwing and stay compact with mobile-size targets", async () => {
  const [management, editor] = await Promise.all([
    source(managementPath),
    source(originalEditorPath),
  ])

  expect(management).toContain("The comparison could not be opened. Check the connection and try again.")
  expect(management).toContain("The supplier status was not saved. Check the connection and try again.")
  expect(management).toContain("The supplier note was not saved. Check the connection and try again.")
  expect(management).toContain("router.refresh()")
  expect(management).toContain("min-h-11")
  expect(management).toContain("sm:min-h-9")
  expect(editor).toContain("min-h-11")
  expect(editor).toContain("sm:min-h-9")
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
  expect(supplierActions).toContain("effectiveRequestComparisonItems")
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
  expect(worktable).toContain('aria-label={!missing ? "No missing information — Ready" : undefined}')
  expect(worktable).not.toContain('className="sr-only">Ready</span>')
})

test("supplier quotes move into compact step two instead of expanding the request grid", async () => {
  const [page, worktable, management] = await Promise.all([
    source(pagePath),
    source(worktablePath),
    source(managementPath),
  ])

  expect(page).toContain("comparisonSummaries")
  expect(page).toMatch(/comparisons=\{comparisonSummaries\}|supplierComparisons=\{supplierComparisonTables\}/)
  expect(worktable).toContain("Supplier route")
  expect(worktable).toMatch(/supplierComparisons\.map/)
  expect(worktable).not.toContain("supplierColumns.map")
  expect(management).toContain('step={2}')
  expect(management).toContain("Supplier quotes")
  expect(management).toContain("Upload File or Photo")
  expect(management).toContain("Enter Pricing Manually")
  expect(management).toContain("Contact Suppliers")
  expect(management).toContain("Suppliers selected in Step 1")
  expect(management).toContain('aria-label="Suppliers selected in Step 1"')
  expect(management).toContain("Request sent")
  expect(management).toContain("They replied")
  expect(management).toContain("We replied · waiting")
  expect(management).toContain("Quote received")
  expect(management).toContain("Compare supplier route")
  expect(management).toContain("Contact &amp; files")
  expect(management).toContain("price comparisons")
  expect(management).toContain("Exact supplier · current request")
  expect(management).toContain("requestSupplierFolderContents(comparisons, supplier.id)")
  expect(management).toContain("row.supplier && row.comparisonCount")
  expect(management).toContain("Open comparison")
  expect(management).toContain("comparison.documents.map")
  expect(page).toContain('.eq("request_id", requestId)')
  expect(page).toContain("documents: comparisonDocuments.map")
  expect(management).not.toContain("Request Details &amp; Notes")
  expect(management).not.toContain("Add or change suppliers")
  expect(management).not.toContain('title="Supplier email"')
  expect(management, "supplier bids should not be isolated in repeated large comparison cards").not.toContain("comparisons.map((comparison) => <article")
})

test("supplier routes are alphabetical checklists with per-item or whole-request scope", async () => {
  const [page, worktable, editor, management, actions] = await Promise.all([
    source(pagePath),
    source(worktablePath),
    source(routeEditorPath),
    source(managementPath),
    source(path.join(root, "app/owner/materials/requests/actions.ts")),
  ])

  expect(editor).toContain("supplierNameCollator")
  expect(editor).toContain('type="checkbox"')
  expect(editor).toContain("Only this item")
  expect(editor).toContain("All items in request")
  expect(editor).toContain("This replaces the supplier route on every item in this request.")
  expect(worktable).toContain("itemIds={items.map")
  expect(worktable).toContain("orderedSuppliers.map")
  expect(actions).toContain("p_supplier_notes: supplierNotes")
  expect(editor).toContain("canonicalSupplierKey(name) === supplierKey")
  expect(editor).toContain("Note for this supplier")
  expect(editor).toContain("Choose any suppliers needed")
  expect(page).toContain("resolveRequestSupplierRouteSelections(items ?? [], suppliers)")
  expect(page).toContain("routeSelections={routeSelections}")
  expect(management).toContain("Suppliers selected in Step 1")
  expect(management).not.toContain("routeContactSupplierIds")
  expect(management).not.toContain("Add or change suppliers")
  expect(management).toContain("Compare supplier route")
  expect(worktable.match(/Route \{selectedRouteIds\.length\} selected/g)).toHaveLength(1)
  expect(actions).not.toContain("].slice(0, 12)")
  expect(actions).toContain("p_supplier_route_entries: supplierRouteEntries")
  expect(actions).toContain('supabase.rpc("staff_save_request_item_supplier_routes"')
})

test("safe request text and routes autosave with stale-response protection and retry", async () => {
  const [management, routeEditor, originalEditor, autosave] = await Promise.all([
    source(managementPath),
    source(routeEditorPath),
    source(originalEditorPath),
    source(autosaveHookPath),
  ])

  expect(management).not.toContain("Request Details &amp; Notes")
  expect(management).not.toContain("notesAutosave")
  expect(routeEditor).toContain("autosave.queue")
  expect(routeEditor).not.toContain("Save route")
  expect(routeEditor).not.toContain("Apply to all items")
  expect(originalEditor).toContain('mode === "edit" && valid(next)')
  expect(originalEditor).toContain("autosave.queue(next)")
  expect(originalEditor).toContain('mode === "add" ? <button')
  expect(autosave).toContain("createAutosaveVersionGuard")
  expect(autosave).toContain("isCurrent(version)")
  expect(autosave).toContain("saveQueueRef.current.then")
  expect(autosave).toContain("clearTimeout(timerRef.current)")
  expect(autosave).toContain("retry")
})

test("a completed autosave response can update the UI only while its version is latest", () => {
  const versions = createAutosaveVersionGuard()
  const first = versions.next()
  const second = versions.next()

  expect(versions.isCurrent(first)).toBe(false)
  expect(versions.isCurrent(second)).toBe(true)
  versions.invalidate()
  expect(versions.isCurrent(second)).toBe(false)
})

test("bulk supplier route autosave is one authenticated database transaction", async () => {
  const migration = await source(routeAutosaveMigrationPath)

  expect(migration).toContain("staff_save_request_item_supplier_routes")
  expect(migration).toContain("security invoker")
  expect(migration).toContain("private.has_staff_capability('customers')")
  expect(migration).toContain("id = any(p_item_ids)")
  expect(migration).toContain("get diagnostics updated_count = row_count")
  expect(migration).toContain("updated_count <> expected_count")
  expect(migration).toContain("'supplier_route_entries', p_supplier_route_entries")
  expect(migration).toContain("'supplier_route_notes', p_supplier_notes")
  expect(migration).toContain("revoke all on function")
  expect(migration).not.toContain("to anon")
})

test("client contact is available at the request header and does not consume step four", async () => {
  const [page, management, contact] = await Promise.all([
    source(pagePath),
    source(managementPath),
    source(clientContactPath),
  ])

  expect(page).toContain("<RequestClientContact />")
  expect(page).not.toContain("{clientEmail}")
  expect(page).not.toContain("{profile?.email}")
  expect(contact).toContain("<Phone")
  expect(contact).toContain('aria-label="Contact client"')
  expect(contact).toContain("h-11 w-11")
  expect(contact).toContain("sm:h-9 sm:w-9")
  expect(management).not.toContain("step={4}")
  expect(management).not.toContain('title="Contact client"')
  expect(management).not.toContain('<details id="contact-client"')
  expect(contact).toContain("OPEN_REQUEST_CLIENT_CONTACT_EVENT")
  expect(contact).toContain('aria-haspopup="dialog"')
  expect(contact).toContain('aria-controls="request-client-contact-dialog"')
  expect(management).toContain("window.addEventListener(OPEN_REQUEST_CLIENT_CONTACT_EVENT")
  expect(management).toContain('id="request-client-contact-dialog"')
  expect(management).toContain('role="dialog"')
  expect(management).toContain('aria-modal="true"')
  expect(management).toContain('event.key === "Escape"')
  expect(management).toContain('event.key !== "Tab"')
  expect(management).toContain("contactTriggerRef.current?.focus()")
  expect(management).toContain("pendingRef.current = pending")
  expect(management).toContain("}, [contactOpen])")
  expect(management).toContain("setContactOpen(false)\n    setQuoteOpen(true)")
  expect(management).toContain("setQuoteOpen(false)\n    setContactOpen(true)")
  expect(management).toContain("ref={quoteDialogRef}")
  expect(management).toContain("{feedback && !contactOpen ?")
  expect(management).toMatch(/role="status">\{feedback\}<\/p>[\s\S]*Create and send estimate/)
  expect(management).toContain("RelatedEmailTimeline title=\"Client email\"")
  expect(management).toContain("sendClientEmail")
  expect(management).toContain("sendClientWhatsApp")
  expect(management).toContain("sendClientText")
  expect(management).toContain("saveDeliverySchedule")
  expect(management).toContain("Create and send estimate")
})

test("request header is compact and request text edits directly on click", async () => {
  const [page, worktable, editor] = await Promise.all([
    source(pagePath),
    source(worktablePath),
    source(originalEditorPath),
  ])

  expect(page).not.toContain("Back to Customer Requests")
  expect(page).toContain("MaterialRequestAssigneeControl")
  expect(page).toContain("CustomerRequestStatus")
  expect(page).toContain("Activity log")
  expect(page).not.toContain("Next:")
  expect(worktable).toContain("<FileText")
  expect(worktable).toContain("Documents <span")
  expect(worktable).toContain('trigger="content"')
  expect(worktable).toContain('itemKind="organized"')
  expect(editor).toContain('trigger === "content"')
  expect(editor).toContain("updateOrganizedMaterialItemAction")
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

test("organizer has bounded OpenAI deadlines and the server action only enqueues", async () => {
  const [organizer, actions, scheduler] = await Promise.all([
    source(path.join(root, "supabase/functions/client-material-list-ai/index.ts")),
    source(path.join(root, "app/owner/materials/requests/actions.ts")),
    source(path.join(root, "lib/material-request-organization.ts")),
  ])

  expect(organizer).toContain("new AbortController()")
  expect(organizer).toContain("signal: controller.signal")
  expect(organizer).toContain("controller.abort(), 30_000")
  expect(organizer).toContain("clearTimeout(openAiTimeout)")
  expect(actions).toContain("await scheduleClientMaterialListOrganization")
  expect(actions).not.toContain("Promise.race([invocation, deadline])")
  expect(actions).not.toContain("material_organization_timeout")
  expect(scheduler).toContain('after(async () =>')
  expect(scheduler).toContain('"enqueue_client_material_list_job_for_requester"')
})

test("partial AI organization keeps manually added request rows in pricing", async () => {
  const original = { id: "original", name: "Drywall", quantity: 20, unit: "sheet", department: "Drywall", metadata: null }
  const organized = { id: "organized", name: "5/8 drywall", quantity: 20, unit: "sheet", department: "Drywall", metadata: { ai_organized: true, source_item_id: "original" } }
  const manual = { id: "manual", name: "Joint compound", quantity: 2, unit: "bucket", department: "Drywall", metadata: { manually_added_at: "2026-09-04T00:00:00Z" } }

  expect(effectiveRequestComparisonItems([original, organized, manual]).map((item) => item.id)).toEqual([
    "organized",
    "manual",
  ])
})

test("step three starts from the latest client-ready-to-pay values", async () => {
  const [page, management] = await Promise.all([
    source(pagePath),
    source(managementPath),
  ])

  expect(page).toContain("clientReadyToPayDefaults")
  expect(page).toContain("client_unit_price")
  expect(page).toContain("client_delivery_charge")
  expect(management).toContain("clientReadyToPayDefaults.itemUnitPrices[item.id]")
  expect(management).toContain("clientReadyToPayDefaults.deliveryCharge")
  expect(management).toContain("clientReadyToPayDefaults.salesTaxRate")
})
