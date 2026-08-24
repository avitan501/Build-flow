import { expect, test } from "@playwright/test"

for (const path of ["/shop/services", "/shop/paper-work"]) {
  test(`${path} opens the working Services catalog`, async ({ page }) => {
    await page.goto(path)

    await expect(page).toHaveURL(/\/shop\?category=Services$/)
    await expect(page.getByRole("heading", { name: "Services", exact: true })).toBeVisible()
    await expect(page.getByText("404", { exact: true })).toHaveCount(0)
  })
}
