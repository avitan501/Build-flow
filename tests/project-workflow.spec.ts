import { expect, test } from "@playwright/test"

test("cart route redirects into projects", async ({ page }) => {
  await page.goto("/cart")
  await expect(page).toHaveURL(/\/projects$/)
  await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible()
})

test("projects use the full desktop workspace without clipping", async ({ page }) => {
  await page.goto("/projects")

  const viewportWidth = page.viewportSize()?.width ?? 0
  const mainWidth = await page.locator("main").evaluate((element) => element.getBoundingClientRect().width)
  const pageWidths = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))

  if (viewportWidth >= 1024) {
    expect(mainWidth).toBeGreaterThan(900)
  }
  expect(pageWidths.scrollWidth).toBe(pageWidths.clientWidth)
})

test("shop products use Add to Project and require sign in", async ({ page }) => {
  await page.goto("/shop?category=Framing")
  const addButton = page.getByRole("button", { name: /Add to Project:/ }).first()
  await expect(addButton).toBeVisible()
  await addButton.click()
  await expect(page).toHaveURL(/\/login\?next=/)
  await expect(page.getByRole("heading", { name: /Log in to Avantia Build/i })).toBeVisible()
})
