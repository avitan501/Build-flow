import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { mapExistingCategoryToShopCategory, SHOP_CATEGORY_NAMES } from "../lib/shop";

const root = process.cwd();

test("Liquidation is a first-class shop category", async () => {
  expect(SHOP_CATEGORY_NAMES).toContain("Liquidation");
  expect(mapExistingCategoryToShopCategory("Liquidation")).toBe("Liquidation");
  expect(mapExistingCategoryToShopCategory("surplus")).toBe("Liquidation");

  const picker = await readFile(path.join(root, "components/buildflow/homepage-shop-picker.tsx"), "utf8");
  expect(picker).toContain('href: "/shop?category=Liquidation"');
});

test("MDF liquidation product keeps pricing, minimum, and five photos without public source wording", async () => {
  const [migration, catalog] = await Promise.all([
    readFile(path.join(root, "supabase/migrations/20260817193000_add_liquidation_mdf_marketplace_item.sql"), "utf8"),
    readFile(path.join(root, "lib/shop-catalog.ts"), "utf8"),
  ]);

  expect(migration).toContain("liquidation-facebook-926145880521723");
  expect(migration).toContain("FBM-926145880521723");
  expect(migration).toContain("20-board minimum");
  expect(migration).toContain("10.00");
  expect(migration).toContain("https://www.facebook.com/marketplace/item/926145880521723/");
  expect(migration.match(/mdf-board-24x96-half-inch-[1-5]\.webp/g)).toHaveLength(5);
  expect(catalog).toContain('id: "liquidation-facebook-926145880521723"');
  expect(catalog).toContain('category: "Liquidation"');
  expect(catalog).toContain('price: 10');
  expect(catalog).toContain('availability: "Confirm availability"');
  expect(catalog).toContain('supplierName: "Avantia Build Liquidation"');
  expect(catalog).toContain('quoteNumber: null');
  expect(catalog.match(/\["[1-5]",/g)).toHaveLength(5);
});

test("Order Materials opens the service hub while category links retain the catalog", async () => {
  const [shopPage, catalogExperience, detailExperience] = await Promise.all([
    readFile(path.join(root, "app/shop/page.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/shop-catalog-experience.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/shop-product-detail-experience.tsx"), "utf8"),
  ]);

  expect(shopPage).toContain("<HomepageShopPicker");
  expect(shopPage).toContain("const showCatalog = Boolean(category || search)");
  expect(shopPage).toContain("Order materials");
  expect(shopPage).toContain("<ShopCatalogExperience");
  expect(shopPage).not.toContain("<ShopProjectToolPicker");
  expect(shopPage).not.toContain("Project address");
  expect(catalogExperience).toContain('const isLiquidationView = activeCategorySource === "Liquidation"');
  expect(catalogExperience).toContain("{!isLiquidationView ? <section");
  expect(detailExperience).toContain('product.category !== "Liquidation"');
});

test("Order Materials includes a configurable High-End service", async () => {
  const [picker, qualification] = await Promise.all([
    readFile(path.join(root, "components/buildflow/homepage-shop-picker.tsx"), "utf8"),
    readFile(path.join(root, "lib/shop-qualification.ts"), "utf8"),
  ]);

  expect(picker).toContain('label: "High-End"');
  expect(picker).toContain('href: "/request-quote?request=high-end"');
  expect(picker).toContain('description: "Premium finishes and specialty materials"');
  expect(qualification).toContain('id: "services-high-end"');
  expect(qualification).toContain('serviceLabel: "High-End"');
  expect(qualification).toContain('departmentLabel: "Services"');
  expect(qualification).toContain('question("quality_level", "What quality level do you need?"');
});
