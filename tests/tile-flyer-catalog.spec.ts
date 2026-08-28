import { expect, test } from "@playwright/test"

const TILE_FLYER_PRODUCTS = [
  "Galvanized Wire Mesh",
  "MAPEI Ultraflex 1 White Thinset",
  "Cement Backer Board",
  "Primer Plus",
  "Hydro Ban Waterproofing",
  "Portland Cement Type I/II",
  "NXT Level Self Leveling",
  "Strata Mat Uncoupling Membrane",
  "Fine Sand",
  "Permacolor Grout",
  "Laticrete 209 Floor Mud",
  "Premium Tile Mastic",
] as const

test("Tile department shows only the flyer assortment with editable-price copy", async ({ page }) => {
  await page.goto("/shop/tile-work")
  const pricing = page.locator("section[aria-labelledby='tile-work-prices-heading']")
  await expect(pricing.getByRole("heading", { name: "Tile department prices" })).toBeVisible()
  for (const product of TILE_FLYER_PRODUCTS) {
    await expect(pricing.getByText(product, { exact: true })).toBeVisible()
  }
  await expect(pricing.locator("article")).toHaveCount(12)
  await expect(pricing.getByText("Tile Underlayment Paper for Plywood", { exact: true })).toHaveCount(0)
  await expect(pricing.getByText(/published supplier pricing/i)).toBeVisible()
})

test("Cement backer board is also available in Sheet Rock", async ({ page }) => {
  await page.goto("/shop/sheet-rock")
  const pricing = page.locator("section[aria-labelledby='sheet-rock-prices-heading']")
  await expect(pricing.getByText("Cement Backer Board", { exact: true })).toBeVisible()
})
