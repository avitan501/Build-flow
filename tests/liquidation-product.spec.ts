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

test("Bruce flooring and 24 x 48 tile are separate liquidation products", async () => {
  const catalog = await readFile(path.join(root, "lib/shop-catalog.ts"), "utf8");

  expect(catalog).toContain('id: "liquidation-bruce-redefine-fox-den-1rd6r003"');
  expect(catalog).toContain('name: "Bruce reDefine Fox Den Rigid Core Vinyl Flooring"');
  expect(catalog).toContain('price: 1.6');
  expect(catalog).toContain('UPC 840051572886');
  expect(catalog).toContain('23.64 sq. ft. per carton; approximately $37.82 per carton');
  expect(catalog).toContain('/images/liquidation/bruce-redefine-fox-den-official.webp');
  expect(catalog).toContain('/images/liquidation/bruce-redefine-fox-den-plank.jpg');
  expect(catalog).toContain('/images/liquidation/bruce-redefine-fox-den-carton.jpg');

  expect(catalog).toContain('id: "liquidation-24x48-large-format-tile"');
  expect(catalog).toContain('name: "24 in. x 48 in. Large-Format Tile"');
  expect(catalog).toContain('price: 1.9');
  expect(catalog).toContain('color and finish to be confirmed');
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
  expect(catalogExperience).toContain('isLiquidationView ? "Liquidation material"');
  expect(catalogExperience).toContain("More items coming soon");
  expect(catalogExperience).toContain("{!isLiquidationView ? <section");
  expect(detailExperience).toContain('product.category !== "Liquidation"');
});

test("Order Materials includes the Take Care of Yourself service", async () => {
  const [picker, qualification, essentials] = await Promise.all([
    readFile(path.join(root, "components/buildflow/homepage-shop-picker.tsx"), "utf8"),
    readFile(path.join(root, "lib/shop-qualification.ts"), "utf8"),
    readFile(path.join(root, "lib/request-department-essentials.ts"), "utf8"),
  ]);

  expect(picker).toContain('label: "Take Care of Yourself"');
  expect(picker).toContain('href: "/request-quote?request=high-end"');
  expect(picker).toContain('description: "Comfort, wellness, and premium home upgrades"');
  expect(qualification).toContain('id: "services-high-end"');
  expect(qualification).toContain('serviceLabel: "Take Care of Yourself"');
  expect(qualification).toContain('departmentLabel: "Services"');
  expect(essentials).toContain('"high-end": {');
  expect(essentials).toContain('label: "Take Care of Yourself"');

  const products = [
    ["Noam2 Shabbat Water Bar", "noam2-water-bar.webp"],
    ["Custom Glass", "custom-glass-shower.jpg"],
    ["AMNON18 Shabbat Hot Water System", "amnon18-hot-water-system.webp"],
    ["Modern House Numbers - Numbers + Letters", "modern-house-numbers.webp"],
    ["Warmboard-S Structural Radiant Panel", "warmboard-s-radiant-panel.webp"],
    ["KOHLER Invigoration Linear Steam Head K-32309", "kohler-k32309-steam-head.webp"],
    ["Tesla Wall Connector", "tesla-wall-connector.webp"],
    ["Diode LED BLAZE Wet-Location Niche Lighting System", "diode-led-wet-location-niche-lighting.webp"],
    ["Mustee DURABASE 3232M Fiberglass Shower Base", "mustee-3232m-shower-base.webp"],
    ["EverScent Smart Home HVAC Fragrance Diffuser", "everscent-hvac-diffuser.webp"],
  ] as const;

  for (const [name, fileName] of products) {
    expect(essentials).toContain(name);
    await expect(readFile(path.join(root, "public/images/materials/take-care-of-yourself", fileName))).resolves.toBeTruthy();
  }

  expect(essentials).toContain("Automatic Shabbat mode with a calendar through 2054");
  expect(essentials).toContain("11.5 kW / 48 A");
  expect(essentials).toContain("Up to 5,000 sq. ft.");
  expect(essentials.match(/imageUrls:/g)).toHaveLength(10);
  expect(essentials).toContain("requestHref:");
});
