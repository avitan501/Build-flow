import { expect, test } from "@playwright/test"

test("a removed built-in sub-item is hidden from its department", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "buildflow-manager-catalog-add-ons",
      JSON.stringify({
        categories: [],
        products: [],
        services: [],
        departmentOverrides: [],
        hiddenItemIds: ["framing-upload-framer-list"],
      }),
    )
  })

  await page.goto("/shop/framing")

  await expect(page.getByRole("heading", { name: "Framing" })).toBeVisible()
  await expect(page.getByText("Upload framer list", { exact: true })).toHaveCount(0)
  await expect(page.getByText("Upload blue print", { exact: true })).toBeVisible()
})
