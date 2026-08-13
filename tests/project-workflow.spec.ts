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

test("shop products start a direct request and require sign in", async ({ page }) => {
  await page.goto("/shop?category=Framing")
  const addButton = page.getByRole("button", { name: /Request Item:/ }).first()
  await expect(addButton).toBeVisible()
  await addButton.click()
  await expect(page.getByRole("heading", { name: "Sign in to send your request" })).toBeVisible()
  const continueDialog = page.getByRole("dialog")
  await expect(continueDialog.getByText("Choose a project", { exact: true })).toHaveCount(0)
  const dialogBox = await continueDialog.boundingBox()
  const viewport = page.viewportSize()
  expect(dialogBox).not.toBeNull()
  expect(viewport).not.toBeNull()
  expect(Math.abs((dialogBox!.y + dialogBox!.height / 2) - viewport!.height / 2)).toBeLessThan(12)
  await expect(continueDialog.getByRole("link", { name: "Create account", exact: true })).toBeVisible()
  await continueDialog.getByRole("link", { name: "Log in", exact: true }).click()
  await expect(page).toHaveURL(/\/login\?next=/)
  await expect(page.getByRole("heading", { name: /Log in to Avantia Build/i })).toBeVisible()
})
