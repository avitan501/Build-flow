import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

test("catalog uses the approved short action labels", async () => {
  const source = await readFile(
    path.join(root, "components/buildflow/material-catalog-workspace.tsx"),
    "utf8",
  );

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
    expect(source).toContain(label);
  }

  expect(source).not.toContain(">Check ZIP price<");
  expect(source).not.toContain(">Manage all supplier prices<");
  expect(source).not.toContain(">Needs review<");
});

test("catalog list expands until an item opens the closable details panel", async () => {
  const source = await readFile(
    path.join(root, "components/buildflow/material-catalog-workspace.tsx"),
    "utf8",
  );

  expect(source).toContain(
    'selectedItem ? "lg:grid-cols-[minmax(0,1fr)_22rem]" : "grid-cols-1"',
  );
  expect(source).toContain("setSelectedItemId(item.id)");
  expect(source).toContain("setSelectedItemId(null)");
  expect(source).toContain('aria-label="Close details"');
  expect(source).toContain('className="fixed inset-0 z-[80] overflow-y-auto');
  expect(source).toContain('document.body.style.overflow = "hidden"');
  expect(source).toContain('lg:static lg:z-auto lg:overflow-visible');
  expect(source).toContain('sticky top-[calc(env(safe-area-inset-top)+0.5rem)]');
  expect(source).toContain(
    'className="flex min-w-0 items-center gap-1.5 overflow-x-auto"',
  );
});

test("supplier prices remain compact without unreadably small primary text", async () => {
  const source = await readFile(
    path.join(root, "components/buildflow/material-catalog-workspace.tsx"),
    "utf8",
  );

  expect(source).toContain(".slice(0, 3)");
  expect(source).toContain("min-h-24 w-full");
  expect(source).toContain("truncate text-base font-bold");
  expect(source).toContain("manufacturer product photo");
  expect(source).toContain("Pack: {catalogItemPackLabel(item)}");
  expect(source).toContain("Brand:");
  expect(source).toContain("Model:");
  expect(source).toContain("Size:");
  expect(source).toContain("Add photo");
  expect(source).toContain("h-10 shrink-0 rounded-md");
});

test("catalog exposes Home Depot and Lowe's without inventing a price", async () => {
  const workspace = await readFile(
    path.join(root, "components/buildflow/material-catalog-workspace.tsx"),
    "utf8",
  );
  const priceCheck = await readFile(
    path.join(root, "components/buildflow/material-price-check.tsx"),
    "utf8",
  );
  const retailerLinks = await readFile(
    path.join(root, "lib/catalog-retailer-links.ts"),
    "utf8",
  );

  const compactWorkspace = workspace.replace(/\s+/g, " ");

  expect(compactWorkspace).toContain(
    "catalogRetailerSearchLinks(selectedItem).map",
  );
  expect(workspace).toContain('data-testid="catalog-retailer-discovery"');
  expect(workspace).toContain("Home Depot &amp; Lowe&apos;s");
  expect(compactWorkspace).toContain(
    "Exact price is shown only after verification.",
  );
  expect(
    workspace.indexOf('data-testid="catalog-retailer-discovery"'),
  ).toBeLessThan(
    workspace.indexOf("aria-label={`${selectedItem.name} details`}"),
  );
  expect(workspace).not.toContain("Home Depot price");
  expect(workspace).not.toContain("Lowe&apos;s price");
  expect(priceCheck).toContain("const majorRetailers = links.filter");
  expect(priceCheck).toContain("Exact price not shown until verified");
  expect(retailerLinks).toContain('name: "Home Depot"');
  expect(retailerLinks).toContain('name: "Lowe\'s"');
});

test("catalog groups size variants without losing individual SKU actions", async () => {
  const source = await readFile(
    path.join(root, "components/buildflow/material-catalog-workspace.tsx"),
    "utf8",
  );

  expect(source).toContain("catalogItemFamilyKey");
  expect(source).toContain("catalogGroups.map");
  expect(source).toContain("available sizes/types");
  expect(source.replace(/\s+/g, " ")).toContain("> Variants </p>");
  expect(source).toContain("setSelectedItemId(variant.id)");
  expect(source).toContain("Archive product");
  expect(source).toContain("deleteItem(selectedItem)");
});
