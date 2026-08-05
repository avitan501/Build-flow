import { expect, test } from "@playwright/test"

test("a removed built-in sub-item is hidden from its department", async ({ page }) => {
  const pageErrors: string[] = []
  page.on("pageerror", (error) => pageErrors.push(error.message))

  await page.addInitScript(() => {
    window.localStorage.setItem(
      "buildflow-manager-catalog-add-ons",
      JSON.stringify({
        categories: [],
        products: [],
        services: [],
        departmentOverrides: [],
        hiddenItemIds: ["framing-upload-blueprint-or-shopping-list"],
      }),
    )
  })

  await page.goto("/shop/framing")

  await expect(page.getByRole("heading", { name: "Framing", exact: true })).toBeVisible()
  await expect(page.getByText("Upload blueprint or shopping list", { exact: true })).toHaveCount(0)
  expect(pageErrors.filter((message) => message.includes("Hydration failed") || message.includes("React error #418"))).toEqual([])
})
