import { expect, test } from "@playwright/test"

test("appliance rentals show exact invoice models and prices", async ({ page }) => {
  await page.goto("/shop/appliances")

  await expect(page.getByRole("heading", { name: "Rentals", exact: true })).toBeVisible()
  await expect(page.getByText(/Model JGBS30RETSS/)).toBeVisible()
  await expect(page.getByText(/Model FFHT1835VS/)).toBeVisible()
  await expect(page.getByText("$574")).toBeVisible()
  await expect(page.getByText("$624")).toBeVisible()
})

test("rental appliance detail includes three exact-model photos", async ({ page }) => {
  await page.goto("/shop/ge-30-inch-gas-range-jgbs30retss")

  await expect(page.getByRole("heading", { name: "GE 30 in. Free-Standing Gas Range" })).toBeVisible()
  await expect(page.getByText("Model JGBS30RETSS", { exact: true })).toBeVisible()
  await expect(page.locator('img[alt^="GE JGBS30RETSS"]')).toHaveCount(6)
})
