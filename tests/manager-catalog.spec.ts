import { readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

import { normalizeMaterialCatalogDepartment } from "../lib/material-catalog"
import { parseMaterialComparisonText, supplierRowsToCatalogItems } from "../lib/material-catalog-pdf-parser"

const root = process.cwd()

test("manager navigation is compact and keeps one communication center at the bottom", async () => {
  const [shell, aiTools] = await Promise.all([
    readFile(path.join(root, "components/buildflow/admin-shell.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/ai-tools/page.tsx"), "utf8"),
  ])
  expect(shell).toContain('label: "Material Catalog"')
  expect(shell).toContain('href: "/admin/catalog"')
  expect(shell).not.toContain('label: "Supplier Partnerships"')
  expect(shell).not.toContain('href: "/owner/partnerships"')
  expect(shell).not.toContain('label: "Website Traffic"')
  expect(shell).not.toContain('label: "AI Tools"')
  expect(shell).toContain("Manager Dashboard")
  expect(shell).toContain('shortLabel: "Communication"')
  expect(shell).not.toContain('label: "Directories & Catalog"')
  expect(shell).not.toContain('label: "Supplier Pricing"')
  expect(shell).not.toContain('href: "/admin/abc"')
  expect(aiTools).toContain('href: "/admin/abc"')
  expect(aiTools).toContain('href: "/admin/traffic"')
  expect(shell).not.toContain('href: "/admin/payments"')
  expect(shell).not.toContain('label: "Manager Settings"')
  expect(shell).not.toContain("Customer Website")
  expect(shell).not.toContain("Quick Access")
  expect(shell).toContain('href="/" onClick={onNavigate} aria-label="Open the Avantia Build customer website"')
  expect(shell).not.toContain('<span className="min-w-0 flex-1 text-left">More</span>')
  expect(shell).not.toContain('shortLabel: "Messages"')
  expect(shell).not.toContain('shortLabel: "Meet"')
  expect(shell).not.toContain('shortLabel: "WhatsApp"')
  expect(shell).not.toContain("CARLOS_MEETING_URL")
  expect(shell).not.toContain('/admin/communications?channel=whatsapp')
  expect(aiTools).toContain('title: "Google Meet"')
  expect(aiTools).toContain('add=buildavantiap%40gmail.com')
})

test("installation catalog shows real product identity and keeps internal notes editable", async () => {
  const [page, workspace, actions, catalog, migration] = await Promise.all([
    readFile(path.join(root, "app/admin/catalog/page.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/material-catalog-workspace.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/catalog/actions.ts"), "utf8"),
    readFile(path.join(root, "lib/material-catalog.ts"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260828194740_refine_tile_installation_catalog.sql"), "utf8"),
  ])
  expect(catalog).toContain('"Tile Installation & Masonry"')
  expect(catalog).toContain('tile: "Tile Installation & Masonry"')
  expect(page).toContain("admin_notes")
  expect(actions).toContain("admin_notes: clean(input.adminNotes, 4000)")
  expect(workspace).toContain(">Admin note ")
  expect(workspace).toContain("item.admin_notes")
  expect(workspace).toContain("item.brand || \"Brand not set\"")
  expect(workspace).toContain("manufacturer product photo")
  expect(workspace).toContain("catalogItemSubtitle(item)")
  expect(workspace).toContain("catalogItemPackLabel(item)")
  expect(workspace).toContain("Store item {draft.supplierSku}")
  expect(workspace).not.toContain(">Item code<input")
  expect(workspace).not.toContain(">UPC ")
  expect(workspace).not.toContain("{item.item_code} · price per")
  expect(migration).toContain("add column if not exists admin_notes")
  expect(migration).toContain("USG Durock Cement Board with EdgeGuard")
  expect(migration).toContain("Heidelberg Materials / Lehigh")
  expect(migration).toContain("where department = 'Tile'")
})

test("manager catalog is protected, seeded, editable, and supplier based", async () => {
  const [page, workspace, actions, migration, specificationMigration, retailSupplierMigration, exactLinkMigration, snapshotMigration, homeDepotSnapshot, allDepartmentRetailers, verifiedRetailProducts, curatedProducts, qualityMigration, coreCurationMigration, flyerMigration, grantMigration, qualityHelpers, parser] = await Promise.all([
    readFile(path.join(root, "app/admin/catalog/page.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/material-catalog-workspace.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/catalog/actions.ts"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260814033000_create_manager_material_catalog.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260814155841_add_catalog_measurements_and_common_items.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260814160945_add_retail_catalog_suppliers.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260814162242_add_verified_retail_product_links.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260816190156_add_catalog_retail_snapshot_metadata.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260816193227_seed_home_depot_framing_snapshot.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260816203816_ensure_retailers_in_every_catalog_department.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260816210019_seed_verified_retail_catalog_products.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260816223000_curate_common_catalog_products.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260817001500_add_catalog_quality_and_price_history.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260817013000_curate_core_catalog_materials.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260828191647_replace_tile_with_jobsite_flyer_materials.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260828193200_tighten_catalog_department_grants.sql"), "utf8"),
    readFile(path.join(root, "lib/material-catalog-quality.ts"), "utf8"),
    readFile(path.join(root, "lib/material-catalog-pdf.ts"), "utf8"),
  ])
  expect(page).toContain("requireManagerPortalProfile")
  expect(page).toContain('rpc("staff_load_catalog_suppliers")')
  expect(workspace).toContain("Manager · Catalog")
  expect(workspace).toContain(">Materials</h1>")
  expect(workspace).toContain(">Import</button>")
  expect(workspace).toContain("/admin/documents?intent=catalog")
  expect(workspace).not.toContain("importMaterialCatalogPdfAction(formData)")
  expect(workspace).toContain("Add supplier")
  expect(workspace).toContain("Catalog suppliers")
  expect(workspace).toContain("Filter suppliers by department")
  expect(workspace).toContain("Suppliers are filtered by the departments selected in Supplier Settings")
  expect(workspace).toContain("supplierServesMaterialDepartment(supplier, catalogSupplierDepartment)")
  expect(workspace).toContain("No supplier added to")
  expect(workspace).toContain("saveCatalogDepartmentSuppliersAction")
  expect(workspace).toContain("catalogSupplierIds[selectedCategory]")
  expect(workspace).toContain("not_available")
  expect(workspace).toContain("Save item")
  expect(workspace).toContain("Measurement / size")
  expect(workspace).toContain("Thickness / gauge")
  expect(workspace).toContain("Open exact ${item.name} at ${supplier.name}")
  expect(workspace).toContain("Add exact ${supplier.name} product link for ${item.name}")
  expect(workspace).not.toContain("https://www.lowes.com/search?searchTerm=")
  expect(workspace).not.toContain("https://www.homedepot.com/s/")
  expect(workspace).toContain("itemColumnWidth")
  expect(workspace).toContain("priceColumnWidth")
  expect(workspace).toContain("avantia-catalog-item-column-width")
  expect(workspace).toContain("avantia-catalog-price-column-width")
  expect(workspace).toContain("categoryQuality.missingPrice")
  expect(workspace).toContain('CatalogReviewFilter, string, number')
  expect(workspace).toContain("Catalog confidence")
  expect(workspace).toContain("hideSupplier")
  expect(workspace).toContain("Hide from {selectedCategory}")
  expect(workspace).toContain("Add supplier")
  expect(workspace).toContain("Package quantity")
  expect(workspace).toContain("Manufacturer model")
  expect(workspace).toContain("Price details")
  expect(workspace).toContain("Top prices")
  expect(workspace).toContain(".slice(0, 3)")
  expect(workspace).toContain("source_document_id")
  expect(page).toContain("source_document_date")
  expect(page).toContain("material_catalog_item_departments")
  expect(workspace).toContain("Online Prices")
  expect(workspace).toContain("<MaterialPriceCheck")
  expect(workspace).toContain('draft.productUrl ? <a')
  expect(workspace).toContain('"not_available"')
  expect(workspace).not.toContain("Valley Stream #1216")
  expect(workspace).not.toContain("snapshotLabel")
  expect(workspace).not.toContain('<option value="unknown">Unknown</option><option value="available">Available</option><option value="not_available">N/A</option></select>\n                      {draft.productUrl')
  expect(workspace).toContain('supplier.id === "home-depot-retail-catalog"')
  expect(actions).toContain("Use an exact ${supplier.name} product page")
  expect(actions).toContain('url.pathname.startsWith("/pd/")')
  expect(actions).toContain('url.pathname.startsWith("/p/")')
  expect(actions).toContain('storeId: "1216"')
  expect(actions).toContain('zipCode: "11516"')
  expect(actions).toContain("LOWES_SNAPSHOT")
  expect(actions).toContain("isRetailSnapshot")
  expect(page).toContain("product_url")
  expect(workspace).not.toContain("Sample quantity")
  expect(workspace).toContain("Order by {item.unit}")
  expect(actions).toContain("extractMaterialCatalogItemsFromPdf")
  expect(actions).toContain('upsert(priceRows, { onConflict: "item_id,supplier_id" })')
  expect(actions).toContain("detectSupplierMatch")
  expect(actions).toContain("staff_upsert_supplier_directory_entry")
  expect(actions).toContain("price_observed_at: observedAt")
  expect(actions).toContain("deleteMaterialCatalogItemAction")
  expect(actions).toContain('review_status: "discontinued"')
  expect(actions).not.toContain('.delete({ count: "exact" })')
  expect(actions).toContain("catalogEnabledDepartments")
  expect(actions).toContain("measurement: clean(input.measurement")
  expect(actions).toContain("thickness: clean(input.thickness")
  expect(actions).toContain('requireStaffProfile("suppliers")')
  expect(actions).toContain("supplierIsAddedToCatalogDepartment(supplier, department)")
  expect(migration).toContain("create table if not exists public.material_catalog_items")
  expect(migration).toContain("create table if not exists public.material_catalog_supplier_prices")
  expect(migration).toContain("private.is_admin_or_staff()")
  expect(migration).toContain("on delete cascade")
  expect(migration.match(/'Simple Material Comparison PDF'/g)?.length).toBe(103)
  expect(specificationMigration).toContain("add column if not exists measurement")
  expect(specificationMigration).toContain("add column if not exists thickness")
  expect(specificationMigration).toContain("FRA-020")
  expect(specificationMigration).toContain("ELE-020")
  expect(specificationMigration).not.toContain("delete from public.material_catalog_items")
  expect(retailSupplierMigration).toContain("lowes-retail-catalog")
  expect(retailSupplierMigration).toContain("home-depot-retail-catalog")
  expect(retailSupplierMigration).toContain("https://www.lowes.com/")
  expect(retailSupplierMigration).toContain("https://www.homedepot.com/")
  expect(exactLinkMigration).toContain("add column if not exists product_url")
  expect(exactLinkMigration).toContain("Search and category URLs are not allowed")
  expect(snapshotMigration).toContain("price_observed_at")
  expect(snapshotMigration).toContain("retail_store_id")
  expect(homeDepotSnapshot).toContain("FRA-001")
  expect(homeDepotSnapshot).toContain("https://www.homedepot.com/p/314732316")
  expect(homeDepotSnapshot).toContain("Confirm local stock and checkout price")
  expect(allDepartmentRetailers).toContain("home-depot-retail-catalog")
  expect(allDepartmentRetailers).toContain("lowes-retail-catalog")
  expect(allDepartmentRetailers).toContain('"Others"')
  expect(verifiedRetailProducts).toContain("/images/materials/catalog/win-004.jpg")
  expect(verifiedRetailProducts).toContain("36 x 60 in. double-hung window")
  expect(verifiedRetailProducts).toContain("6-mil polyethylene vapor barrier, 10 x 100 ft.")
  expect(verifiedRetailProducts).not.toMatch(/\/(questions|reviews|sets)\//)
  expect(curatedProducts).toContain("retailer prices verified on exact product pages")
  expect(curatedProducts).toContain("'11516'")
  expect(curatedProducts).toContain("7/16-in. x 4-ft. x 8-ft. OSB roof sheathing")
  expect(curatedProducts).toContain("unit = 'bags'")
  expect(qualityMigration).toContain("material_catalog_price_history")
  expect(qualityMigration).toContain("archive_material_catalog_price_trigger")
  expect(qualityMigration).toContain("GAF Timberline HDZ Charcoal")
  expect(qualityMigration).not.toContain("delete from public.material_catalog_items")
  expect(coreCurationMigration).toContain("Lightweight joint compound - blue lid")
  expect(coreCurationMigration).toContain("1/2 in. regular drywall, 4 x 8 ft.")
  expect(coreCurationMigration).toContain("5/8 in. CDX plywood sheathing, 4 x 8 ft.")
  expect(coreCurationMigration).toContain("flat flush hollow-core slab door")
  expect(coreCurationMigration).not.toContain("delete from public.material_catalog_items")
  expect(flyerMigration).toContain("create table if not exists public.material_catalog_item_departments")
  expect(flyerMigration).toContain("set status = 'inactive'")
  expect(flyerMigration).toContain("delete from public.material_catalog_item_departments")
  expect(flyerMigration).toContain("'TIL-018','Galvanized Metal Lath'")
  expect(flyerMigration).toContain("'TIL-042','Exterior Pavers & Stone'")
  expect(flyerMigration).toContain("https://www.homedepot.com/p/USG-Durock")
  expect(flyerMigration).toContain("https://www.lowes.com/pd/James-Hardie-HardieBacker")
  expect(flyerMigration).not.toContain("https://www.homedepot.com/s/")
  expect(flyerMigration).not.toContain("https://www.lowes.com/search")
  expect(grantMigration).toContain("revoke all on public.material_catalog_item_departments from authenticated")
  expect(grantMigration).toContain("grant select, insert, update, delete")
  expect(qualityHelpers).toContain("catalogItemMatchesReview")
  expect(qualityHelpers).toContain("normalizedComparisonPrice")
  expect(qualityHelpers).toContain("priceCheckedDateLabel")
  expect(workspace).toContain("priceCheckedDateLabel(saved)")
  expect(parser).toContain("parseMaterialComparisonText")
  expect(parser).toContain("The PDF opened, but no dependable product rows were found")
})

test("catalog PDF parser accepts comparison lists and normal supplier quote layouts", () => {
  const comparison = parseMaterialComparisonText([
    "1. Appliances",
    "2 pcs Rheem XE38S06ST45U1 38 Gal. electric water heater",
  ].join("\n"), "Appliances")
  expect(comparison).toEqual([
    expect.objectContaining({ category: "Appliances", defaultQuantity: 2, unit: "each", name: expect.stringContaining("Rheem") }),
  ])

  const supplierQuote = parseMaterialComparisonText([
    "ABC-204 12 sheets 1/2 in drywall 4 x 8 $14.50 $174.00",
    "2 x 4 x 10 framing lumber 25 pcs 7.25 181.25",
  ].join("\n"), "Sheet Rock")
  expect(supplierQuote).toHaveLength(2)
  expect(supplierQuote[0]).toMatchObject({ category: "Sheet Rock", defaultQuantity: 12, unit: "sheets" })
  expect(supplierQuote[1]).toMatchObject({ category: "Sheet Rock", defaultQuantity: 25, unit: "each" })
})

test("catalog PDF mapping preserves supplier SKU, unit price, and line total", () => {
  const items = supplierRowsToCatalogItems([{
    itemCode: "DHA-RNG-30",
    description: "GE 30 in. Free-Standing Gas Range",
    specification: "Stainless steel",
    quantity: 2,
    unit: "each",
    unitPrice: 649.5,
    lineTotal: 1299,
  }], "Appliances")

  expect(items).toEqual([expect.objectContaining({
    category: "Appliances",
    supplierSku: "DHA-RNG-30",
    defaultQuantity: 2,
    unitPrice: 649.5,
    lineTotal: 1299,
  })])
})

test("supplier quote department aliases keep lumber out of Appliances", () => {
  expect(normalizeMaterialCatalogDepartment("Lumber")).toBe("Framing")
  expect(normalizeMaterialCatalogDepartment("Lumber & Building Materials")).toBe("Framing")
})

test("Sheet Rock uses compact configurable products and expandable images", async ({ page }) => {
  await page.goto("/shop/sheet-rock")
  await expect(page.getByRole("heading", { name: "Sheet rock", exact: true })).toBeVisible()
  await expect(page.getByRole("heading", { name: /drywall board/i })).toBeVisible()
  await expect(page.getByRole("button", { name: "Enlarge product image" })).toBeVisible()
  await expect(page.getByText("Quantity", { exact: true })).toBeVisible()
  await expect(page.getByRole("group", { name: "Drywall sheet quantity" })).toBeVisible()
  await expect(page.getByText("Edge profile", { exact: true })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Ceiling", exact: true })).toHaveCount(0)
  await expect(page.getByText("Add the matching materials", { exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: /Add configured item/i })).toBeVisible()
})

test("request estimate PDF has the branded estimate structure and does not persist ACH values", async () => {
  const [panel, actions, pdf, proposalTerms] = await Promise.all([
    readFile(path.join(root, "components/buildflow/request-management-panel.tsx"), "utf8"),
    readFile(path.join(root, "app/owner/materials/requests/actions.ts"), "utf8"),
    readFile(path.join(root, "lib/request-client-quote-pdf.ts"), "utf8"),
    readFile(path.join(root, "lib/proposal-terms.ts"), "utf8"),
  ])
  expect(panel).toContain("Create client quote")
  expect(panel).toContain("Include ACH payment information")
  expect(panel).toContain('type="password"')
  expect(panel).toContain("These values are used only to create this PDF and are not saved")
  expect(actions).toContain('client_action: "estimate_sent"')
  expect(actions).not.toContain("routing_number:")
  expect(actions).not.toContain("account_number:")
  expect(pdf).toContain('"ESTIMATE"')
  expect(pdf).toContain('"Item"')
  expect(pdf).toContain('"Description"')
  expect(pdf).toContain('"Quantity"')
  expect(pdf).toContain('"Unit price"')
  expect(pdf).toContain('"Terms & conditions"')
  expect(pdf).not.toContain("Valid through")
  expect(panel).not.toContain("This estimate expires after 30 days")
  expect(panel).not.toContain("Valid through")
  expect(panel).toContain("taxableDelivery")
  expect(panel).toContain("destination rate")
  expect(proposalTerms).toContain("A 3% processing fee applies to credit card payments.")
  expect(proposalTerms).not.toContain("not to exceed")
  expect(proposalTerms).not.toContain("unless different payment terms")
  expect(pdf).toContain('"ACH payment information"')
})
