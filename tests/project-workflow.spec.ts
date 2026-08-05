import { expect, test } from "@playwright/test"

test("cart route redirects into projects", async ({ page }) => {
  await page.goto("/cart")
  await expect(page).toHaveURL(/\/projects$/)
  await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible()
})

test("shop products use Add to Project and require sign in", async ({ page }) => {
  await page.goto("/shop?category=Framing")
  const addButton = page.getByRole("button", { name: /Add to Project:/ }).first()
  await expect(addButton).toBeVisible()
  await addButton.click()
  await expect(page).toHaveURL(/\/login\?next=/)
  await expect(page.getByRole("heading", { name: /Log in to Avantia Build/i })).toBeVisible()
})
