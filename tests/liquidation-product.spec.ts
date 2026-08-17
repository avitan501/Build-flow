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

test("MDF liquidation product keeps the source, pricing, minimum, and five photos", async () => {
  const migration = await readFile(
    path.join(root, "supabase/migrations/20260817193000_add_liquidation_mdf_marketplace_item.sql"),
    "utf8",
  );

  expect(migration).toContain("liquidation-facebook-926145880521723");
  expect(migration).toContain("FBM-926145880521723");
  expect(migration).toContain("20-board minimum");
  expect(migration).toContain("10.00");
  expect(migration).toContain("https://www.facebook.com/marketplace/item/926145880521723/");
  expect(migration.match(/mdf-board-24x96-half-inch-[1-5]\.webp/g)).toHaveLength(5);
});
