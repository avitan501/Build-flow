import { readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

const root = process.cwd()

test("manager navigation groups secondary tools and keeps calls last", async () => {
  const shell = await readFile(path.join(root, "components/buildflow/admin-shell.tsx"), "utf8")
  expect(shell).toContain('label: "Material Catalog"')
  expect(shell).toContain('href: "/admin/catalog"')
  expect(shell).toContain('label: "Website Traffic"')
  expect(shell).toContain('label: "AI Tools"')
  expect(shell).toContain('label: "Dashboard"')
  expect(shell).toContain("More")
  expect(shell.lastIndexOf("href={QUO_INBOX_URL}")).toBeGreaterThan(shell.indexOf("</nav>"))
})

test("manager catalog is protected, seeded, editable, and supplier based", async () => {
  const [page, workspace, actions, migration, parser] = await Promise.all([
    readFile(path.join(root, "app/admin/catalog/page.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/material-catalog-workspace.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/catalog/actions.ts"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260814033000_create_manager_material_catalog.sql"), "utf8"),
    readFile(path.join(root, "lib/material-catalog-pdf.ts"), "utf8"),
  ])
  expect(page).toContain("requireManagerPortalProfile")
  expect(page).toContain('rpc("staff_load_catalog_suppliers")')
  expect(workspace).toContain("Materials & supplier pricing")
  expect(workspace).toContain("Import PDF")
  expect(workspace).toContain("Add supplier")
  expect(workspace).toContain("not_available")
  expect(workspace).toContain("Save item")
  expect(actions).toContain("extractMaterialCatalogItemsFromPdf")
  expect(actions).toContain("deleteMaterialCatalogItemAction")
  expect(migration).toContain("create table if not exists public.material_catalog_items")
  expect(migration).toContain("create table if not exists public.material_catalog_supplier_prices")
  expect(migration).toContain("private.is_admin_or_staff()")
  expect(migration).toContain("on delete cascade")
  expect(migration.match(/'Simple Material Comparison PDF'/g)?.length).toBe(103)
  expect(parser).toContain("parseMaterialComparisonText")
  expect(parser).toContain("No quantity, unit, and material rows were found")
})

test("Sheet Rock uses compact configurable products and expandable images", async ({ page }) => {
  await page.goto("/shop/sheet-rock")
  await expect(page.getByRole("heading", { name: "Sheet rock", exact: true })).toBeVisible()
  await expect(page.getByRole("heading", { name: /drywall board/i })).toBeVisible()
  await expect(page.getByRole("button", { name: "Enlarge product image" })).toBeVisible()
  await expect(page.getByText("Edge profile", { exact: true })).toBeVisible()
  await expect(page.getByText("Add the matching materials", { exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: /Add configured item/i })).toBeVisible()
})

test("request estimate PDF has the branded estimate structure and does not persist ACH values", async () => {
  const [panel, actions, pdf] = await Promise.all([
    readFile(path.join(root, "components/buildflow/request-management-panel.tsx"), "utf8"),
    readFile(path.join(root, "app/owner/materials/requests/actions.ts"), "utf8"),
    readFile(path.join(root, "lib/request-client-quote-pdf.ts"), "utf8"),
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
  expect(pdf).toContain('"ACH payment information"')
})
