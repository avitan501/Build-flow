import { expect, test } from "@playwright/test"

test("address selection closes and keeps one clear selected address", async ({ page }) => {
  const address = "123 Spruce Street, Cedarhurst, NY 11516"

  await page.goto("/shop")
  await page.locator("button[aria-controls='address-picker-panel']").click()
  await expect(page.getByTestId("address-picker-panel")).toBeVisible()

  await page.getByPlaceholder("Add a new address").fill(address)
  await page.getByRole("button", { name: "Use address" }).click()

  await expect(page.getByTestId("address-picker-panel")).toHaveCount(0)
  await expect(page.getByTestId("project-address-value")).toHaveText(address)
  await expect(page.getByText(address, { exact: true })).toHaveCount(1)
})

test("saved guest project hydrates cleanly and can be cleared", async ({ page }) => {
  const address = "55 Oak Avenue, Cedarhurst, NY 11516"
  const pageErrors: string[] = []
  page.on("pageerror", (error) => pageErrors.push(error.message))

  await page.addInitScript((savedAddress) => {
    const project = {
      id: "guest-selected",
      name: savedAddress,
      address: savedAddress,
      createdAt: new Date(2026, 0, 1).toISOString(),
      updatedAt: new Date(2026, 0, 1).toISOString(),
    }
    window.localStorage.setItem("buildflow-guest-projects", JSON.stringify([project]))
    window.localStorage.setItem("buildflow-selected-guest-project", project.id)
  }, address)

  await page.goto("/shop")
  await expect(page.getByTestId("project-address-value")).toHaveText(address)

  await page.locator("button[aria-controls='address-picker-panel']").click()
  await page.getByRole("link", { name: /No selected address/ }).click()

  await expect(page.getByTestId("project-address-value")).toHaveText("No selected address")
  expect(pageErrors.filter((message) => message.includes("Hydration failed"))).toEqual([])
})

test("all departments wrap into downward rows without page overflow", async ({ page }) => {
  await page.goto("/shop")

  const cards = page.getByTestId("department-card")
  await expect(cards).toHaveCount(10)

  const rowPositions = await cards.evaluateAll((elements) => elements.map((element) => Math.round(element.getBoundingClientRect().top)))
  expect(new Set(rowPositions).size).toBeGreaterThan(1)

  const widths = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(widths.scrollWidth).toBe(widths.clientWidth)
})

test("guest projects stay compact until the full list is requested", async ({ page }) => {
  await page.addInitScript(() => {
    const projects = Array.from({ length: 8 }, (_, index) => ({
      id: `guest-${index + 1}`,
      name: `Project ${index + 1}`,
      address: `${index + 1} Main Street, Cedarhurst, NY 11516`,
      createdAt: new Date(2026, 0, index + 1).toISOString(),
      updatedAt: new Date(2026, 0, index + 1).toISOString(),
    }))

    window.localStorage.setItem("buildflow-guest-projects", JSON.stringify(projects))
  })

  await page.goto("/projects")

  await expect(page.getByTestId("guest-project-card")).toHaveCount(3)
  await page.getByRole("button", { name: "Show all 8 projects" }).click()
  await expect(page.getByTestId("guest-project-card")).toHaveCount(8)
  await expect(page.getByRole("button", { name: "Show recent projects" })).toBeVisible()
})
