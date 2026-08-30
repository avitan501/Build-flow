import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"

const root = process.cwd()

test("catalog uses the approved short action labels", async () => {
  const source = await readFile(path.join(root, "components/buildflow/material-catalog-workspace.tsx"), "utf8")

  for (const label of [
    "Online Prices",
    "All Prices",
    "Import",
    "Ask AI",
    "Complete",
    "Send for Approval",
    "Ready",
    "Review",
    "Published",
    "Documents",
  ]) {
    expect(source).toContain(label)
  }

  expect(source).not.toContain(">Check ZIP price<")
  expect(source).not.toContain(">Manage all supplier prices<")
  expect(source).not.toContain(">Needs review<")
})

test("catalog list expands until an item opens the closable details panel", async () => {
  const source = await readFile(path.join(root, "components/buildflow/material-catalog-workspace.tsx"), "utf8")

  expect(source).toContain('selectedItem ? "lg:grid-cols-[minmax(0,1fr)_22rem]" : "grid-cols-1"')
  expect(source).toContain("setSelectedItemId(item.id)")
  expect(source).toContain("setSelectedItemId(null)")
  expect(source).toContain('aria-label="Close details"')
  expect(source).toContain('className="flex min-w-0 items-center gap-1.5 overflow-x-auto"')
})

test("supplier prices remain compact without unreadably small primary text", async () => {
  const source = await readFile(path.join(root, "components/buildflow/material-catalog-workspace.tsx"), "utf8")

  expect(source).toContain(".slice(0, 3)")
  expect(source).toContain("min-h-16 w-full")
  expect(source).toContain("truncate text-base font-bold")
  expect(source).toContain("h-10 shrink-0 rounded-md")
})

test("catalog exposes Home Depot and Lowe's without inventing a price", async () => {
  const workspace = await readFile(path.join(root, "components/buildflow/material-catalog-workspace.tsx"), "utf8")
  const priceCheck = await readFile(path.join(root, "components/buildflow/material-price-check.tsx"), "utf8")
  const retailerLinks = await readFile(path.join(root, "lib/catalog-retailer-links.ts"), "utf8")

  expect(workspace).toContain("catalogRetailerSearchLinks(selectedItem)")
  expect(priceCheck).toContain('const majorRetailers = links.filter')
  expect(priceCheck).toContain("Exact price not shown until verified")
  expect(retailerLinks).toContain('name: "Home Depot"')
  expect(retailerLinks).toContain('name: "Lowe\'s"')
})
